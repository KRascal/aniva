'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { TypingIndicator } from '@/components/chat/TypingIndicator';
import { LevelUpModal } from '@/components/chat/LevelUpModal';
import { OnboardingOverlay } from '@/components/chat/OnboardingOverlay';
import Live2DViewer from '@/components/live2d/Live2DViewer';
import EmotionIndicator from '@/components/live2d/EmotionIndicator';
import { RELATIONSHIP_LEVELS } from '@/types/character';
import { LUFFY_MILESTONES, type Milestone } from '@/lib/milestones';

interface Message {
  id: string;
  role: 'USER' | 'CHARACTER';
  content: string;
  metadata?: { emotion?: string };
  createdAt: string;
  audioUrl?: string | null; // undefined = loading, null = unavailable, string = ready
}

interface RelationshipInfo {
  level: number;
  levelName: string;
  xp: number;
  nextLevelXp: number | null;
  totalMessages: number;
  relationshipId?: string;
  character?: { name: string; slug: string };
}

interface Character {
  id: string;
  name: string;
  nameEn: string;
  franchise: string;
  avatarUrl: string | null;
}

const EMOTION_EMOJI: Record<string, string> = {
  excited: '🔥',
  happy: '😄',
  angry: '😤',
  sad: '😢',
  hungry: '🍖',
  neutral: '',
  surprised: '😲',
};

function getEmotionEmoji(emotion?: string): string {
  if (!emotion) return '';
  return EMOTION_EMOJI[emotion] || '';
}

export default function ChatCharacterPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const characterId = params.characterId as string;

  const [character, setCharacter] = useState<Character | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [relationship, setRelationship] = useState<RelationshipInfo | null>(null);
  const [relationshipId, setRelationshipId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [currentEmotion, setCurrentEmotion] = useState('neutral');
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // レベルアップモーダル用 state
  const [levelUpData, setLevelUpData] = useState<{
    newLevel: number;
    milestone?: Milestone;
  } | null>(null);

  // オンボーディング用 state
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isGreeting, setIsGreeting] = useState(false);

  // プッシュ通知用 state
  const [isPushSubscribed, setIsPushSubscribed] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  // Get userId from session
  useEffect(() => {
    if (session?.user) {
      const user = session.user as { id?: string; email?: string };
      if (user.id) {
        setUserId(user.id);
      }
    }
  }, [session]);

  // Load character info
  useEffect(() => {
    if (!characterId) return;
    fetch(`/api/characters/id/${characterId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.character) setCharacter(data.character);
      })
      .catch(console.error);
  }, [characterId]);

  // Load relationship + chat history
  const loadRelationshipAndHistory = useCallback(async () => {
    if (!userId || !characterId) return;

    try {
      // Use combined endpoint to get both history and relationship info
      const res = await fetch(
        `/api/chat/history-by-user?userId=${userId}&characterId=${characterId}&limit=50`
      );
      const data = await res.json();

      if (data.messages) {
        setMessages(data.messages);
      }

      if (data.relationship) {
        setRelationshipId(data.relationship.id);
        // Also fetch the full relationship info for levelName etc.
        const relRes = await fetch(`/api/relationship/${characterId}?userId=${userId}`);
        const relData = await relRes.json();
        setRelationship(relData);
      }

      // totalMessages=0 または未ログ → オンボーディング表示
      if (!data.relationship || data.messages?.length === 0) {
        setShowOnboarding(true);
      }

      setIsLoadingHistory(false);
    } catch (err) {
      console.error('Failed to load relationship:', err);
      setIsLoadingHistory(false);
    }
  }, [userId, characterId]);

  useEffect(() => {
    if (userId && characterId) {
      loadRelationshipAndHistory();
    }
  }, [userId, characterId, loadRelationshipAndHistory]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  const generateVoiceForMessage = async (messageId: string, text: string, charId: string) => {
    try {
      const res = await fetch('/api/voice/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId, text, characterId: charId }),
      });
      const data = await res.json();
      if (data.audioUrl) {
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, audioUrl: data.audioUrl } : m))
        );
      } else {
        // voice_unavailable or error → mark as null so spinner goes away
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, audioUrl: null } : m))
        );
      }
    } catch {
      // 音声生成失敗はサイレント（チャット自体は続行）
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, audioUrl: null } : m))
      );
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() || isSending || !userId) return;

    const text = inputText.trim();
    setInputText('');
    setIsSending(true);

    // Optimistically add user message
    const tempUserMsg: Message = {
      id: `temp-${Date.now()}`,
      role: 'USER',
      content: text,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const res = await fetch('/api/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, characterId, message: text }),
      });

      if (!res.ok) {
        const errData = await res.json();
        if (res.status === 429) {
          // Rate limit hit
          const errMsg: Message = {
            id: `err-${Date.now()}`,
            role: 'CHARACTER',
            content: `${errData.error || 'デイリーメッセージ上限に達しました。プランをアップグレードしてください。'}`,
            createdAt: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, errMsg]);
          return;
        }
        throw new Error(errData.error || 'Send failed');
      }

      const data = await res.json();

      // Replace temp message with real ones
      const characterMsg: Message = data.characterMessage
        ? { ...data.characterMessage, audioUrl: undefined }
        : data.characterMessage;
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== tempUserMsg.id),
        data.userMessage,
        characterMsg,
      ]);

      // Update emotion from character's latest response
      if (data.characterMessage?.metadata?.emotion) {
        setCurrentEmotion(data.characterMessage.metadata.emotion);
      }

      // 非同期で音声生成（UIをブロックしない）
      if (data.characterMessage && data.characterMessage.role === 'CHARACTER') {
        generateVoiceForMessage(
          data.characterMessage.id,
          data.characterMessage.content,
          characterId
        );
      }

      // Update relationship info & レベルアップ判定
      if (data.relationship) {
        setRelationship((prev) => ({
          ...(prev || { levelName: '', xp: 0, nextLevelXp: null, totalMessages: 0 }),
          level: data.relationship.level,
          xp: data.relationship.xp,
        }));

        if (data.relationship.leveledUp && data.relationship.newLevel) {
          const milestone = LUFFY_MILESTONES.find(
            (m) => m.level === data.relationship.newLevel
          );
          setLevelUpData({
            newLevel: data.relationship.newLevel,
            milestone,
          });
        }
      }
    } catch (err) {
      console.error('Send message error:', err);
      // Remove temp message on error
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id));
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  };

  const handleStartChat = async () => {
    setShowOnboarding(false);
    setIsGreeting(true);
    try {
      const res = await fetch('/api/chat/greet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, characterId }),
      });
      const data = await res.json();
      if (data.message && !data.alreadyGreeted) {
        setMessages([data.message]);
        // 音声生成（非同期 - APIが返した audioUrl をすぐ反映）
        if (data.audioUrl) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === data.message.id ? { ...m, audioUrl: data.audioUrl } : m
            )
          );
        }
      }
    } catch (e) {
      console.error('Greeting failed:', e);
    } finally {
      setIsGreeting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleSubscribePush = async () => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      alert('このブラウザはプッシュ通知に対応していません');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        alert('通知の許可が必要です');
        return;
      }

      const sw = await navigator.serviceWorker.ready;
      const existingSub = await sw.pushManager.getSubscription();
      if (existingSub) {
        setIsPushSubscribed(true);
        return;
      }

      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
      const sub = await sw.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidKey,
      });

      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      });

      setIsPushSubscribed(true);
      alert('ルフィからの通知をONにしました 🔔');
    } catch (err) {
      console.error('Push subscribe error:', err);
      alert('通知の設定に失敗しました');
    }
  };

  if (status === 'loading' || isLoadingHistory) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white text-lg animate-pulse">読み込み中...</div>
      </div>
    );
  }

  const level = relationship?.level ?? 1;
  const stars = '⭐'.repeat(Math.min(level, 5));

  return (
    <div className="flex flex-col h-screen bg-gray-900 max-w-lg mx-auto">
      {/* オンボーディングオーバーレイ */}
      {showOnboarding && character && (
        <OnboardingOverlay
          character={character}
          onStart={handleStartChat}
        />
      )}

      {/* レベルアップモーダル */}
      {levelUpData && (
        <LevelUpModal
          newLevel={levelUpData.newLevel}
          levelName={RELATIONSHIP_LEVELS[Math.min(levelUpData.newLevel - 1, RELATIONSHIP_LEVELS.length - 1)].name}
          milestone={levelUpData.milestone}
          onClose={() => setLevelUpData(null)}
        />
      )}

      {/* Header */}
      <header className="flex-shrink-0 bg-gray-900/95 backdrop-blur-sm border-b border-gray-800 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => router.push('/chat')}
          className="text-gray-400 hover:text-white transition-colors p-1 -ml-1"
          aria-label="戻る"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Avatar */}
        <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center flex-shrink-0">
          {character?.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={character.avatarUrl}
              alt={character.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-xl">🏴‍☠️</span>
          )}
        </div>

        {/* Name + level (クリックでプロフィールへ) */}
        <button
          className="flex-1 min-w-0 text-left"
          onClick={() => router.push(`/profile/${characterId}`)}
          aria-label="絆プロフィールを見る"
        >
          <h1 className="text-white font-bold leading-tight truncate hover:text-purple-300 transition-colors">
            {character?.name ?? 'キャラクター'}
          </h1>
          <div className="flex items-center gap-1">
            <span className="text-xs text-yellow-400">{stars}</span>
            {relationship?.levelName && (
              <span className="text-xs text-gray-400">Lv.{level} {relationship.levelName}</span>
            )}
          </div>
        </button>

        {/* 絆を見るリンク */}
        <button
          onClick={() => router.push(`/profile/${characterId}`)}
          className="text-xs text-purple-400 hover:text-purple-300 transition-colors px-2 py-1 rounded-lg border border-purple-500/30 hover:border-purple-400/50 flex-shrink-0"
          aria-label="絆プロフィール"
        >
          絆を見る
        </button>

        {/* Push通知ベルアイコン */}
        <button
          onClick={handleSubscribePush}
          className="text-gray-400 hover:text-purple-400 transition-colors text-xl flex-shrink-0"
          title={isPushSubscribed ? '通知ON' : '通知OFF'}
          aria-label={isPushSubscribed ? '通知ON' : '通知をONにする'}
        >
          {isPushSubscribed ? '🔔' : '🔕'}
        </button>

        {/* Emotion indicator in header */}
        <EmotionIndicator emotion={currentEmotion} level={level} />
      </header>

      {/* Live2D Character Viewer */}
      <div className="flex-shrink-0 flex flex-col items-center py-3 bg-gray-900/80 border-b border-gray-800">
        <Live2DViewer
          emotion={currentEmotion}
          isSpeaking={isSending}
          width={200}
          height={240}
        />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && !isSending && (
          <div className="text-center text-gray-500 py-12">
            <div className="text-4xl mb-3">💬</div>
            <p className="text-sm">最初のメッセージを送ろう！</p>
          </div>
        )}

        {messages.map((msg) => {
          const isUser = msg.role === 'USER';
          const emotion = msg.metadata?.emotion;
          const emotionEmoji = getEmotionEmoji(emotion);

          return (
            <div
              key={msg.id}
              className={`flex ${isUser ? 'justify-end' : 'justify-start'} items-end gap-2`}
            >
              {/* Character avatar (left side) */}
              {!isUser && (
                <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center flex-shrink-0 mb-1">
                  {character?.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={character.avatarUrl}
                      alt={character.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-sm">🏴‍☠️</span>
                  )}
                </div>
              )}

              <div className={`max-w-[75%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                {!isUser && (
                  <span className="text-xs text-gray-500 px-1">
                    {character?.name ?? 'キャラクター'}
                  </span>
                )}
                <div
                  className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    isUser
                      ? 'bg-gradient-to-br from-purple-600 to-pink-600 text-white rounded-tr-none'
                      : 'bg-gray-800 text-gray-100 rounded-tl-none'
                  }`}
                >
                  {msg.content}
                  {emotionEmoji && (
                    <span className="ml-1 inline-block">{emotionEmoji}</span>
                  )}
                  {/* 音声プレーヤー（キャラクターメッセージのみ） */}
                  {!isUser && msg.audioUrl && (
                    <audio
                      controls
                      className="mt-2 w-full max-w-xs h-8"
                      src={msg.audioUrl}
                    >
                      <source src={msg.audioUrl} type="audio/mpeg" />
                    </audio>
                  )}
                  {/* 音声読み込み中スピナー（audioUrl が undefined = まだロード中） */}
                  {!isUser && msg.audioUrl === undefined && (
                    <div className="mt-1 flex items-center gap-1 text-xs text-gray-400">
                      <span>🔊</span>
                      <span className="animate-pulse">音声生成中...</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Typing indicator */}
        {isSending && (
          <div className="flex justify-start items-end gap-2">
            <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center flex-shrink-0">
              {character?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={character.avatarUrl}
                  alt={character?.name ?? ''}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-sm">🏴‍☠️</span>
              )}
            </div>
            <TypingIndicator />
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 border-t border-gray-800 bg-gray-900/95 backdrop-blur-sm px-4 py-3">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="メッセージを入力..."
            disabled={isSending || isGreeting}
            className="flex-1 bg-gray-800 text-white placeholder-gray-500 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 border border-gray-700"
          />
          <button
            onClick={sendMessage}
            disabled={isSending || isGreeting || !inputText.trim()}
            className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center disabled:opacity-40 hover:from-purple-700 hover:to-pink-700 transition-all"
            aria-label="送信"
          >
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
