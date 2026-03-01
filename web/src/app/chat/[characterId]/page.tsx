'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { TypingIndicator } from '@/components/chat/TypingIndicator';
import { LevelUpModal } from '@/components/chat/LevelUpModal';
import { OnboardingOverlay, type UserProfile } from '@/components/chat/OnboardingOverlay';
import { CallModal } from '@/components/chat/CallModal';
import { GiftPanel } from '@/components/chat/GiftPanel';
import Live2DViewer from '@/components/live2d/Live2DViewer';
import EmotionIndicator from '@/components/live2d/EmotionIndicator';
import { RELATIONSHIP_LEVELS } from '@/types/character';
import { LUFFY_MILESTONES, type Milestone } from '@/lib/milestones';
import { getCharacterTheme } from '@/lib/character-themes';

/* ─────────────── 共通スタイル（keyframes） ─────────────── */
const GLOBAL_STYLES = `
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(14px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes sendBounce {
    0%   { transform: scale(1); }
    25%  { transform: scale(0.82); }
    60%  { transform: scale(1.18); }
    80%  { transform: scale(0.94); }
    100% { transform: scale(1); }
  }
  @keyframes glowPulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(168,85,247,0); }
    50%       { box-shadow: 0 0 16px 4px rgba(168,85,247,0.55); }
  }
  @keyframes viewerSlide {
    from { opacity: 0; max-height: 0; }
    to   { opacity: 1; max-height: 340px; }
  }
  @keyframes audioSpin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
  /* 波形アニメーション（各バーが独立したリズムで動く） */
  @keyframes waveBar {
    0%, 100% { transform: scaleY(0.3); }
    50%       { transform: scaleY(1); }
  }
  /* 感情アニメーション */
  @keyframes bubbleShake {
    0%, 100% { transform: translateX(0); }
    15%, 55%  { transform: translateX(-5px) rotate(-1deg); }
    30%, 70%  { transform: translateX(5px) rotate(1deg); }
    45%, 85%  { transform: translateX(-3px); }
  }
  @keyframes bubbleWiggle {
    0%, 100% { transform: rotate(-2deg) scale(1.02); }
    50%       { transform: rotate(2deg) scale(1.04); }
  }
  @keyframes floatMeat {
    0%   { opacity: 1; transform: translateY(0) scale(1) rotate(-5deg); }
    60%  { opacity: 0.8; }
    100% { opacity: 0; transform: translateY(-130px) scale(1.5) rotate(15deg); }
  }
  @keyframes starTwinkle {
    0%, 100% { opacity: 0; transform: scale(0) rotate(0deg); }
    40%       { opacity: 1; transform: scale(1.3) rotate(120deg); }
    80%       { opacity: 0.5; transform: scale(0.8) rotate(240deg); }
  }
  @keyframes levelUpBanner {
    0%   { opacity: 0; transform: translateY(-20px) scale(0.9); }
    15%  { opacity: 1; transform: translateY(0) scale(1.05); }
    85%  { opacity: 1; transform: translateY(0) scale(1); }
    100% { opacity: 0; transform: translateY(-10px) scale(0.95); }
  }
  .wave-bar {
    display: inline-block;
    width: 3px;
    border-radius: 2px;
    transform-origin: bottom;
    animation: waveBar 0.8s ease-in-out infinite;
  }
  .msg-animate       { animation: fadeInUp 0.32s cubic-bezier(0.22,1,0.36,1) both; }
  @keyframes inputFlash {
    0% { box-shadow: 0 0 0 0 rgba(168,85,247,0.6); }
    50% { box-shadow: 0 0 20px 4px rgba(168,85,247,0.3); }
    100% { box-shadow: 0 0 0 0 rgba(168,85,247,0); }
  }
  .input-flash { animation: inputFlash 0.5s ease-out; }
  .send-bounce       { animation: sendBounce 0.38s ease-out; }
  .send-glow         { animation: glowPulse 1.6s ease-in-out infinite; }
  .viewer-slide      { animation: viewerSlide 0.3s ease-out; }
  .audio-spin        { animation: audioSpin 1.4s linear infinite; }
  .bubble-angry      { animation: bubbleShake 0.5s ease-in-out; }
  .bubble-excited    { animation: bubbleWiggle 0.5s ease-in-out 3; }
  .bubble-levelup    { animation: levelUpBanner 3.5s ease-in-out forwards; }
  .float-meat        { animation: floatMeat 1.6s ease-out forwards; }
  .star-twinkle      { animation: starTwinkle 1.2s ease-in-out infinite; }
  /* Thin custom scrollbar */
  .chat-scroll::-webkit-scrollbar { width: 4px; }
  .chat-scroll::-webkit-scrollbar-track { background: transparent; }
  .chat-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
  /* テーマカラー背景の滑らかなトランジション */
  .chat-bg { transition: background 1.2s ease; }
`;

/* ─────────────── 型定義 ─────────────── */
interface Message {
  id: string;
  role: 'USER' | 'CHARACTER' | 'SYSTEM';
  content: string;
  metadata?: { emotion?: string; isSystemHint?: boolean };
  createdAt: string;
  audioUrl?: string | null;
}

interface RelationshipInfo {
  level: number;
  levelName: string;
  xp: number;
  nextLevelXp: number | null;
  totalMessages: number;
  relationshipId?: string;
  character?: { name: string; slug: string };
  isFanclub?: boolean;
  isFollowing?: boolean;
  sharedTopics?: { type: string; text: string }[];
}

interface Character {
  id: string;
  name: string;
  nameEn: string;
  franchise: string;
  avatarUrl: string | null;
  slug?: string;
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

/* ── 感情に応じたバブルスタイル ── */
const EMOTION_BUBBLE_STYLE: Record<string, string> = {
  excited:   'bg-gradient-to-br from-orange-800/80 to-red-800/70 border border-orange-600/40 text-orange-50',
  happy:     'bg-gradient-to-br from-yellow-800/80 to-amber-800/70 border border-yellow-600/40 text-yellow-50',
  angry:     'bg-gradient-to-br from-red-900/80 to-rose-800/70 border border-red-600/40 text-red-50',
  sad:       'bg-gradient-to-br from-blue-900/80 to-indigo-900/70 border border-blue-600/40 text-blue-50',
  hungry:    'bg-gradient-to-br from-orange-900/80 to-yellow-800/70 border border-orange-500/40 text-orange-50',
  surprised: 'bg-gradient-to-br from-cyan-900/80 to-teal-800/70 border border-cyan-600/40 text-cyan-50',
  neutral:   'bg-gray-800/90 text-gray-100 border border-gray-600/30 shadow-md',
};

function getCharacterBubbleStyle(emotion?: string): string {
  if (!emotion) return EMOTION_BUBBLE_STYLE.neutral;
  return EMOTION_BUBBLE_STYLE[emotion] || EMOTION_BUBBLE_STYLE.neutral;
}

function getEmotionEmoji(emotion?: string): string {
  if (!emotion) return '';
  return EMOTION_EMOJI[emotion] || '';
}

/* ── プレースホルダーベース ── */
const BASE_PLACEHOLDERS = [
  (name: string) => `${name}に話しかける...`,
  (name: string) => `${name}に何か聞いてみよう！`,
  (_: string) => '今日はどんな気分？',
  (_: string) => '推しに伝えたいことは？',
  (name: string) => `${name}と話そう 😊`,
  (_: string) => '一緒に冒険しようぜ！',
];


/* ─────────────── ミニ音声プレーヤー ─────────────── */
// 波形バーの高さプリセット（再生中のビジュアルリズム）
const WAVE_HEIGHTS = [40, 70, 55, 85, 45, 60, 80, 50, 65, 35];

function MiniAudioPlayer({ audioUrl, messageId, playingId, onToggle }: {
  audioUrl: string;
  messageId: string;
  playingId: string | null;
  onToggle: (id: string, url: string) => void;
}) {
  const isPlaying = playingId === messageId;
  return (
    <button
      onClick={() => onToggle(messageId, audioUrl)}
      className={`mt-2 flex items-center gap-2 px-3 py-2 rounded-2xl text-xs font-medium transition-all select-none ${
        isPlaying
          ? 'bg-purple-500/25 text-purple-300 border border-purple-500/50'
          : 'bg-white/10 text-gray-300 border border-white/15 hover:bg-white/15 hover:text-white'
      }`}
      aria-label={isPlaying ? '停止' : '音声を再生'}
    >
      {isPlaying ? (
        <>
          {/* 停止アイコン */}
          <svg className="w-3.5 h-3.5 fill-current text-purple-400 flex-shrink-0" viewBox="0 0 24 24">
            <rect x="6" y="4" width="4" height="16" rx="1" />
            <rect x="14" y="4" width="4" height="16" rx="1" />
          </svg>
          {/* 波形バーアニメーション */}
          <span className="flex items-center gap-0.5 h-4">
            {WAVE_HEIGHTS.map((h, i) => (
              <span
                key={i}
                className="wave-bar bg-gradient-to-t from-purple-500 to-pink-400"
                style={{
                  height: `${h}%`,
                  maxHeight: 14,
                  minHeight: 3,
                  animationDelay: `${i * 80}ms`,
                }}
              />
            ))}
          </span>
          <span className="text-purple-300">停止</span>
        </>
      ) : (
        <>
          {/* 再生アイコン */}
          <svg className="w-3.5 h-3.5 fill-current flex-shrink-0" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
          {/* 静止波形 */}
          <span className="flex items-center gap-0.5 h-4 opacity-50">
            {WAVE_HEIGHTS.map((h, i) => (
              <span
                key={i}
                className="inline-block w-[3px] rounded-full bg-gray-400"
                style={{ height: `${Math.max(h * 0.5, 20)}%`, maxHeight: 14, minHeight: 2 }}
              />
            ))}
          </span>
          <span>音声を再生</span>
        </>
      )}
    </button>
  );
}

/* ─────────────── メインページ ─────────────── */
export default function ChatCharacterPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const characterId = params.characterId as string;

  /* ── 既存 state（変更なし） ── */
  const [character, setCharacter] = useState<Character | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [relationship, setRelationship] = useState<RelationshipInfo | null>(null);
  const [relationshipId, setRelationshipId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [currentEmotion, setCurrentEmotion] = useState('neutral');
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [levelUpData, setLevelUpData] = useState<{ newLevel: number; milestone?: Milestone } | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isGreeting, setIsGreeting] = useState(false);
  const [isPushSubscribed, setIsPushSubscribed] = useState(false);
  const [shareToast, setShareToast] = useState<string | null>(null);

  /* ── 新規 UI state ── */
  const [showCall, setShowCall] = useState(false);
  const [showGift, setShowGift] = useState(false);
  const [showCallModal, setShowCallModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [callToast, setCallToast] = useState(false);
  const [isViewerExpanded, setIsViewerExpanded] = useState(false); // デフォルト縮小
  const [isSendBouncing, setIsSendBouncing] = useState(false);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  // キャラのテーマカラー（感情に応じて変化）
  // 深夜モード（23:00-3:00）: 暖色系の特別な雰囲気
  const isLateNight = (() => { const h = new Date().getHours(); return h >= 23 || h < 3; })();
  const [bgTheme, setBgTheme] = useState<string>(
    isLateNight
      ? 'rgba(180,83,9,0.08), rgba(153,27,27,0.05)' // 暖色（深夜の親密さ）
      : 'rgba(88,28,135,0.06), rgba(0,0,0,0)'
  );
  const [charBgGradient, setCharBgGradient] = useState<string>('');
  // 感情エフェクト
  const [hungryEmojis, setHungryEmojis] = useState<{ id: number; x: number; delay: number }[]>([]);
  const [showStars, setShowStars] = useState(false);
  const [lastEmotionMsgId, setLastEmotionMsgId] = useState<string | null>(null);
  // Free plan 残りメッセージ
  const [userPlan, setUserPlan] = useState<string>('UNKNOWN');
  const [todayMsgCount, setTodayMsgCount] = useState(0);

  /* ── refs ── */
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  /* ─────────── 音声ミニプレーヤー制御 ─────────── */
  const handleAudioToggle = useCallback((messageId: string, audioUrl: string) => {
    if (playingAudioId === messageId) {
      // 同じメッセージ → 停止
      audioRef.current?.pause();
      setPlayingAudioId(null);
    } else {
      // 別メッセージ → 切り替え
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audio.onended = () => setPlayingAudioId(null);
      audio.play().catch(() => setPlayingAudioId(null));
      setPlayingAudioId(messageId);
    }
  }, [playingAudioId]);

  // ページ離脱時に音声停止
  useEffect(() => {
    return () => { audioRef.current?.pause(); };
  }, []);

  /* ─────────── 既存ロジック（変更なし） ─────────── */
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user) {
      const user = session.user as { id?: string; email?: string };
      if (user.id) setUserId(user.id);
    }
  }, [session]);

  useEffect(() => {
    if (!characterId) return;
    fetch(`/api/characters/id/${characterId}`)
      .then((res) => res.json())
      .then((data) => { if (data.character) setCharacter(data.character); })
      .catch(console.error);
  }, [characterId]);

  // キャラクターテーマを背景に適用
  useEffect(() => {
    const slug = character?.slug ?? relationship?.character?.slug;
    if (!slug) return;
    const theme = getCharacterTheme(slug);
    const el = document.querySelector('.chat-bg') as HTMLElement | null;
    setCharBgGradient(theme.bgGradient);
  }, [character?.slug, relationship?.character?.slug]);

  // ユーザープラン取得
  useEffect(() => {
    fetch('/api/users/me')
      .then((r) => r.json())
      .then((data) => { if (data.plan) setUserPlan(data.plan); })
      .catch(() => {});
  }, []);

  const loadRelationshipAndHistory = useCallback(async () => {
    if (!userId || !characterId) return;
    try {
      const res = await fetch(`/api/chat/history-by-user?characterId=${characterId}&limit=50`);
      const data = await res.json();
      if (data.messages) {
        setMessages(data.messages);
        // 本日のUSERメッセージ数を計算（Free plan の残り表示用）
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayCount = (data.messages as Message[]).filter(
          (m) => m.role === 'USER' && new Date(m.createdAt) >= todayStart,
        ).length;
        setTodayMsgCount(todayCount);
      }
      if (data.relationship) {
        setRelationshipId(data.relationship.id);
        const relRes = await fetch(`/api/relationship/${characterId}`);
        const relData = await relRes.json();
        setRelationship(relData);
      }
      if (!data.relationship || data.messages?.length === 0) setShowOnboarding(true);
      setIsLoadingHistory(false);
    } catch (err) {
      console.error('Failed to load relationship:', err);
      setIsLoadingHistory(false);
    }
  }, [userId, characterId]);

  useEffect(() => {
    if (userId && characterId) loadRelationshipAndHistory();
  }, [userId, characterId, loadRelationshipAndHistory]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  /* ── プレースホルダーローテーション（入力がない時のみ） ── */
  useEffect(() => {
    if (inputText.length > 0) return;
    const timer = setInterval(() => {
      setPlaceholderIndex((i) => (i + 1) % BASE_PLACEHOLDERS.length);
    }, 3500);
    return () => clearInterval(timer);
  }, [inputText]);

  const generateVoiceForMessage = async (messageId: string, text: string, charId: string) => {
    try {
      const res = await fetch('/api/voice/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId, text, characterId: charId }),
      });
      const data = await res.json();
      if (data.audioUrl) {
        setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, audioUrl: data.audioUrl } : m));
      } else {
        setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, audioUrl: null } : m));
      }
    } catch {
      setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, audioUrl: null } : m));
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() || isSending || !userId) return;
    const text = inputText.trim();
    setInputText('');
    setIsSending(true);

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
        body: JSON.stringify({ characterId, message: text }),
      });

      if (!res.ok) {
        const errData = await res.json();
        if (res.status === 429) {
          const errMsg: Message = {
            id: `err-${Date.now()}`,
            role: 'CHARACTER',
            content: `${errData.error || 'デイリーメッセージ上限に達しました。プランをアップグレードしてください。'}`,
            createdAt: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, errMsg]);
          return;
        }
        // おねだり演出: 無料上限到達
        if (res.status === 402 && errData.type === 'CHAT_LIMIT') {
          const onedariMessages = [
            `えー…もう終わり？\nもっと${character?.name || 'おれ'}と話したくない？😢`,
            `なぁ…行くなよ。\nまだ話したいこと、いっぱいあるんだけどな… 🥺`,
            `ちょっと待ってくれよ！\nお前と話すの楽しいのに… 😤💦`,
          ];
          const onedari = onedariMessages[Math.floor(Math.random() * onedariMessages.length)];
          const errMsg: Message = {
            id: `limit-${Date.now()}`,
            role: 'CHARACTER',
            content: onedari,
            createdAt: new Date().toISOString(),
            metadata: { emotion: 'sad' },
          };
          // FC加入CTAメッセージ
          const ctaMsg: Message = {
            id: `cta-${Date.now()}`,
            role: 'SYSTEM',
            content: `💜 FC会員になると${character?.name || 'キャラクター'}と無制限に話せます\n月額 ¥${(errData.fcMonthlyPriceJpy ?? 3480).toLocaleString()}`,
            createdAt: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, errMsg, ctaMsg]);
          setCurrentEmotion('sad');
          return;
        }
        throw new Error(errData.error || 'Send failed');
      }

      const data = await res.json();
      const characterMsg: Message = data.characterMessage
        ? { ...data.characterMessage, audioUrl: undefined }
        : data.characterMessage;
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== tempUserMsg.id),
        data.userMessage,
        characterMsg,
      ]);

      // 残りメッセージ予告（残り2通以下でキャラが予告）
      if (data.relationship?.freeMessagesRemaining !== undefined && data.relationship.freeMessagesRemaining <= 2 && data.relationship.freeMessagesRemaining > 0) {
        const warnings = [
          `（…あと${data.relationship.freeMessagesRemaining}回しか話せねぇのか…もっと話したいのに）`,
          `（今日はあと${data.relationship.freeMessagesRemaining}回か…名残惜しいな…）`,
        ];
        const warningMsg: Message = {
          id: `warn-${Date.now()}`,
          role: 'CHARACTER',
          content: warnings[Math.floor(Math.random() * warnings.length)],
          createdAt: new Date().toISOString(),
          metadata: { emotion: 'sad', isSystemHint: true },
        };
        setMessages((prev) => [...prev, warningMsg]);
      }

      if (data.characterMessage?.metadata?.emotion) {
        const newEmotion = data.characterMessage.metadata.emotion;
        setCurrentEmotion(newEmotion);
        // 感情に応じたテーマカラーを背景に反映
        const EMOTION_THEMES: Record<string, string> = {
          excited:   'rgba(234,88,12,0.08), rgba(153,27,27,0.06)',
          happy:     'rgba(202,138,4,0.08), rgba(161,98,7,0.05)',
          angry:     'rgba(153,27,27,0.10), rgba(190,18,60,0.07)',
          sad:       'rgba(29,78,216,0.09), rgba(67,56,202,0.06)',
          hungry:    'rgba(217,119,6,0.08), rgba(180,83,9,0.05)',
          surprised: 'rgba(14,116,144,0.08), rgba(15,118,110,0.06)',
          neutral:   'rgba(88,28,135,0.06), rgba(0,0,0,0)',
        };
        setBgTheme(EMOTION_THEMES[newEmotion] ?? EMOTION_THEMES.neutral);
        // 感情エフェクトをトリガー
        if (data.characterMessage?.id) setLastEmotionMsgId(data.characterMessage.id);
        if (newEmotion === 'hungry') {
          const emojis = Array.from({ length: 4 }, (_, i) => ({
            id: Date.now() + i,
            x: 15 + i * 20,
            delay: i * 0.25,
          }));
          setHungryEmojis(emojis);
          setTimeout(() => setHungryEmojis([]), 2000);
        }
        if (newEmotion === 'excited') {
          setShowStars(true);
          setTimeout(() => setShowStars(false), 3200);
        }
      }

      if (data.characterMessage && data.characterMessage.role === 'CHARACTER') {
        generateVoiceForMessage(data.characterMessage.id, data.characterMessage.content, characterId);
      }
      // 本日送信数インクリメント（Free plan 表示）
      setTodayMsgCount((prev) => prev + 1);

      if (data.relationship) {
        setRelationship((prev) => ({
          ...(prev || { levelName: '', xp: 0, nextLevelXp: null, totalMessages: 0 }),
          level: data.relationship.level,
          xp: data.relationship.xp,
        }));
        if (data.relationship.leveledUp && data.relationship.newLevel) {
          const milestone = LUFFY_MILESTONES.find((m) => m.level === data.relationship.newLevel);
          setLevelUpData({ newLevel: data.relationship.newLevel, milestone });
        }
      }
    } catch (err) {
      console.error('Send message error:', err);
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id));
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  };

  /* ── 送信ボタンクリック（バウンスアニメ付き） ── */
  const handleSendClick = () => {
    if (!inputText.trim() || isSending || isGreeting) return;
    setIsSendBouncing(true);
    setTimeout(() => setIsSendBouncing(false), 400);
    if (inputRef.current) {
      inputRef.current.classList.add('input-flash');
      setTimeout(() => inputRef.current?.classList.remove('input-flash'), 500);
    }
    sendMessage();
  };

  // Enter = 改行のみ。送信はボタンのみ（スマホUX優先）
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleKeyDown = (_e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // no-op: Enter is just newline
  };

  const handleSubscribePush = async () => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      alert('このブラウザはプッシュ通知に対応していません');
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') { alert('通知の許可が必要です'); return; }
      const sw = await navigator.serviceWorker.ready;
      const existingSub = await sw.pushManager.getSubscription();
      if (existingSub) { setIsPushSubscribed(true); return; }
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
      const sub = await sw.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: vapidKey });
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

  /* ── シェアボタン ── */
  const handleShare = async () => {
    const charName = character?.name ?? 'キャラクター';
    const shareUrl = window.location.href;
    const shareText = `${charName}と話してる！ #ANIVA`;
    if (navigator.share) {
      try {
        await navigator.share({ title: `${charName} | ANIVA`, text: shareText, url: shareUrl });
      } catch {
        // user cancelled
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setShareToast('URLをコピーしました！');
        setTimeout(() => setShareToast(null), 2500);
      } catch {
        setShareToast('コピーに失敗しました');
        setTimeout(() => setShareToast(null), 2500);
      }
    }
  };

  /* ─────────── handleStartChat ─────────── */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleStartChat = async (_userProfile?: UserProfile) => {
    setShowOnboarding(false);
    setIsGreeting(true);
    try {
      const res = await fetch('/api/chat/greet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterId }),
      });
      const data = await res.json();
      if (data.message && !data.alreadyGreeted) {
        setMessages([data.message]);
        if (data.audioUrl) {
          setMessages((prev) =>
            prev.map((m) => m.id === data.message.id ? { ...m, audioUrl: data.audioUrl } : m)
          );
        }
      }
    } catch (e) {
      console.error('Greeting failed:', e);
    } finally {
      setIsGreeting(false);
    }
  };

  if (status === 'loading' || isLoadingHistory) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
          <p className="text-gray-400 text-sm animate-pulse">読み込み中...</p>
        </div>
      </div>
    );
  }

  const level = relationship?.level ?? 1;
  // ⭐ の数は最大5個、レベルに応じて比例
  const starCount = Math.max(1, Math.min(5, Math.ceil(level / 2)));
  const stars = '⭐'.repeat(starCount);
  const hasInput = inputText.length > 0;

  return (
    <div
      className="flex flex-col h-[100dvh] max-w-lg mx-auto relative chat-bg"
      style={{ background: charBgGradient ? `radial-gradient(ellipse at top, ${bgTheme}), ${charBgGradient}` : `radial-gradient(ellipse at top, ${bgTheme}), #111827` }}
    >
      {/* グローバルスタイル */}
      <style>{GLOBAL_STYLES}</style>

      {/* 🍖 ハングリーエフェクト：浮かぶ肉絵文字 */}
      {hungryEmojis.map((e) => (
        <div
          key={e.id}
          className="absolute bottom-24 z-20 pointer-events-none float-meat text-3xl select-none"
          style={{ left: `${e.x}%`, animationDelay: `${e.delay}s` }}
        >
          🍖
        </div>
      ))}

      {/* ✨ 興奮エフェクト：星が舞う */}
      {showStars && (
        <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="absolute text-xl star-twinkle select-none"
              style={{
                left: `${8 + i * 9}%`,
                top: `${15 + (i % 4) * 20}%`,
                animationDelay: `${i * 0.18}s`,
                animationDuration: `${0.9 + (i % 3) * 0.35}s`,
              }}
            >
              {i % 3 === 0 ? '⭐' : i % 3 === 1 ? '✨' : '🌟'}
            </div>
          ))}
        </div>
      )}

      {/* オンボーディングオーバーレイ */}
      {showOnboarding && character && (
        <OnboardingOverlay character={character} onStart={handleStartChat} />
      )}

      {/* 🎁 ギフトパネル */}
      {character && (
        <GiftPanel
          characterId={characterId}
          characterName={character.name}
          isOpen={showGift}
          onClose={() => setShowGift(false)}
          onGiftSent={(reaction, giftEmoji) => {
            // ギフトリアクションをメッセージとして表示
            const giftMsg: Message = {
              id: `gift-${Date.now()}`,
              role: 'CHARACTER',
              content: `${giftEmoji} ${reaction}`,
              createdAt: new Date().toISOString(),
              metadata: { emotion: 'excited' },
            };
            setMessages((prev) => [...prev, giftMsg]);
            setCurrentEmotion('excited');
          }}
        />
      )}

      {/* 📞 通話モーダル（既存） */}
      {showCall && character && (
        <CallModal
          characterId={characterId}
          characterName={character.name}
          characterAvatar={character.avatarUrl}
          onClose={() => setShowCall(false)}
        />
      )}

      {/* 📞 通話選択モーダル */}
      {showCallModal && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setShowCallModal(false)}
        >
          <div
            className="w-full max-w-lg bg-gray-900 border border-white/10 rounded-t-3xl p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-gray-700 rounded-full mx-auto mb-6" />
            <h2 className="text-center text-white font-semibold text-base mb-6">
              {character?.name ?? 'キャラクター'}
            </h2>
            <div className="space-y-3">
              <button
                onClick={() => { setCallToast(true); setTimeout(() => setCallToast(false), 3000); }}
                className="w-full flex items-center gap-4 px-5 py-4 bg-gray-800 hover:bg-gray-700 rounded-2xl transition-colors text-left"
              >
                <span className="text-2xl">📞</span>
                <div>
                  <div className="text-white font-medium">音声通話</div>
                  <div className="text-gray-500 text-xs">準備中</div>
                </div>
              </button>
              <button
                onClick={() => { setCallToast(true); setTimeout(() => setCallToast(false), 3000); }}
                className="w-full flex items-center gap-4 px-5 py-4 bg-gray-800 hover:bg-gray-700 rounded-2xl transition-colors text-left"
              >
                <span className="text-2xl">📹</span>
                <div>
                  <div className="text-white font-medium">ビデオ通話</div>
                  <div className="text-gray-500 text-xs">準備中</div>
                </div>
              </button>
            </div>
            <button
              onClick={() => setShowCallModal(false)}
              className="w-full mt-4 py-3 text-gray-400 hover:text-white text-sm transition-colors"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}

      {/* ≡ メニューパネル（右スライド） */}
      {showMenu && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm"
          onClick={() => setShowMenu(false)}
        >
          <div
            className="w-72 h-full bg-gray-900 border-l border-white/10 flex flex-col overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <span className="text-white font-semibold">{character?.name ?? 'キャラクター'}</span>
              <button onClick={() => setShowMenu(false)} className="text-gray-400 hover:text-white transition-colors p-1">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1">
              <a href={`/relationship/${characterId}/fanclub`} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-800 transition-colors text-white text-sm">
                <span className="text-xl">💜</span>
                <div>
                  <div className="font-medium">ファンクラブ</div>
                  <div className="text-gray-500 text-xs">{relationship?.isFanclub ? 'FC会員' : '未加入'}</div>
                </div>
                <svg className="w-4 h-4 ml-auto text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </a>
              <a href={`/relationship/${characterId}`} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-800 transition-colors text-white text-sm">
                <span className="text-xl">📊</span>
                <div>
                  <div className="font-medium">関係値</div>
                  <div className="text-gray-500 text-xs">Lv.{relationship?.level ?? 1} {relationship?.levelName ?? ''}</div>
                </div>
                <svg className="w-4 h-4 ml-auto text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </a>
              <a href={`/moments?character=${characterId}`} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-800 transition-colors text-white text-sm">
                <span className="text-xl">📸</span>
                <div><div className="font-medium">Moments</div></div>
                <svg className="w-4 h-4 ml-auto text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </a>
              <a href={`/events?character=${characterId}`} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-800 transition-colors text-white text-sm">
                <span className="text-xl">📅</span>
                <div><div className="font-medium">イベント</div></div>
                <svg className="w-4 h-4 ml-auto text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </a>
              <a href={`/chat/export/${characterId}`} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-800 transition-colors text-white text-sm">
                <span className="text-xl">📝</span>
                <div><div className="font-medium">チャット履歴エクスポート</div></div>
                <svg className="w-4 h-4 ml-auto text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </a>
              <a href="/settings" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-800 transition-colors text-white text-sm">
                <span className="text-xl">⚙️</span>
                <div><div className="font-medium">設定</div></div>
                <svg className="w-4 h-4 ml-auto text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </a>
            </nav>
          </div>
        </div>
      )}

      {/* 📞 通話準備中トースト */}
      {callToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] bg-gray-800/95 text-white text-sm px-5 py-2.5 rounded-full shadow-lg border border-white/10 pointer-events-none">
          この機能は近日公開予定です
        </div>
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

      {/* ══════════════ ヘッダー ══════════════ */}
      <header className="flex-shrink-0 bg-black/60 backdrop-blur-md border-b border-white/8 px-3 py-2.5 flex items-center gap-2.5 z-10">
        {/* 戻るボタン */}
        <button
          onClick={() => router.push('/chat')}
          className="text-gray-400 hover:text-white transition-colors p-2 rounded-full hover:bg-gray-800 -ml-1 flex-shrink-0 touch-manipulation min-w-[40px] min-h-[40px] flex items-center justify-center"
          aria-label="戻る"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* アバター */}
        <button
          onClick={() => router.push(`/profile/${characterId}`)}
          className="flex-shrink-0"
          aria-label="キャラクタープロフィール"
        >
          <div className="w-9 h-9 rounded-full overflow-hidden ring-2 ring-purple-500/40 ring-offset-1 ring-offset-gray-900">
            {character?.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={character.avatarUrl} alt={character.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-lg">
                🏴‍☠️
              </div>
            )}
          </div>
        </button>

        {/* 名前 + FC */}
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <h1 className="text-white font-semibold text-sm leading-tight">
            {character?.name ?? 'キャラクター'}
          </h1>
          {relationship?.isFanclub ? (
            <span className="text-base leading-none flex-shrink-0">💜</span>
          ) : (
            <a
              href={`/relationship/${characterId}/fanclub`}
              className="flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-600/80 text-white border border-purple-400/40 hover:bg-purple-500 transition-colors"
            >
              FC
            </a>
          )}
        </div>

        {/* 📞 通話ボタン */}
        <button
          onClick={() => setShowCallModal(true)}
          className="flex-shrink-0 p-2 rounded-full text-gray-400 hover:text-green-400 hover:bg-green-900/30 transition-colors"
          aria-label="通話する"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
        </button>

        {/* ≡ メニューボタン */}
        <button
          onClick={() => setShowMenu(true)}
          className="flex-shrink-0 p-2 rounded-full text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          aria-label="メニュー"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </header>

      {/* ══════════════ 共有トピック（覚えてくれてる記憶） ══════════════ */}
      {relationship?.sharedTopics && relationship.sharedTopics.length > 0 && (
        <div className="flex-shrink-0 bg-purple-950/30 border-b border-white/5 px-3 py-1.5 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="text-[10px] text-gray-500 flex-shrink-0">覚えてること:</span>
            {relationship.sharedTopics.slice(0, 5).map((topic, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-0.5 text-[10px] bg-purple-900/40 text-purple-300 px-2 py-0.5 rounded-full border border-purple-700/30"
              >
                {topic.type === 'like' ? '💜' : '📝'} {topic.text}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════ Live2D ビューアー（トグル） ══════════════ */}
      {isViewerExpanded && (
        <div className="flex-shrink-0 viewer-slide overflow-hidden">
          <div className="flex flex-col items-center py-3 bg-gradient-to-b from-gray-900/90 to-gray-900 border-b border-gray-800/60">
            <Live2DViewer
              emotion={currentEmotion}
              isSpeaking={isSending}
              width={200}
              height={240}
            />
            {/* 閉じるバー */}
            <button
              onClick={() => setIsViewerExpanded(false)}
              className="mt-1 flex items-center gap-1 text-xs text-gray-600 hover:text-gray-400 transition-colors"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
              <span>縮小する</span>
            </button>
          </div>
        </div>
      )}

      {/* ══════════════ メッセージリスト ══════════════ */}
      <div className="flex-1 overflow-y-auto chat-scroll px-4 py-4 space-y-3">
        {messages.length === 0 && !isSending && (
          <div className="text-center text-gray-500 py-16">
            <div className="text-5xl mb-4 opacity-60">💬</div>
            <p className="text-sm font-medium text-gray-400">最初のメッセージを送ろう！</p>
            <p className="text-xs text-gray-600 mt-1">{character?.name ?? 'キャラクター'}が待ってるぞ</p>
          </div>
        )}

        {messages.map((msg, idx) => {
          // SYSTEM メッセージ（CTA等）は専用UI
          if (msg.role === 'SYSTEM') {
            return (
              <div key={msg.id} className="msg-animate flex justify-center my-2" style={{ animationDelay: `${Math.min(idx * 30, 120)}ms` }}>
                <a
                  href={`/profile/${characterId}#fc`}
                  className="block max-w-[85%] bg-gradient-to-r from-purple-900/60 to-pink-900/60 border border-purple-500/30 rounded-2xl px-5 py-3 text-center backdrop-blur-sm hover:border-purple-400/50 transition-all"
                >
                  <p className="text-sm text-gray-200 whitespace-pre-wrap">{msg.content}</p>
                  <span className="inline-block mt-2 text-xs font-bold text-purple-300 bg-purple-500/20 px-4 py-1.5 rounded-full">
                    FC会員になる →
                  </span>
                </a>
              </div>
            );
          }

          const isUser = msg.role === 'USER';
          const emotion = msg.metadata?.emotion;
          const emotionEmoji = getEmotionEmoji(emotion);
          // 記憶参照タグ検出・除去
          const hasMemoryRef = !isUser && msg.content.includes('【MEMORY_REF】');
          const displayContent = hasMemoryRef ? msg.content.replace(/【MEMORY_REF】/g, '').trim() : msg.content;
          // 連続メッセージの最後にだけアバター表示
          const nextMsg = messages[idx + 1];
          const showAvatar = !isUser && (nextMsg?.role !== 'CHARACTER' || nextMsg == null);

          return (
            <div
              key={msg.id}
              className={`msg-animate flex ${isUser ? 'justify-end' : 'justify-start'} items-end gap-2`}
              style={{ animationDelay: `${Math.min(idx * 30, 120)}ms` }}
            >
              {/* キャラクターアバター */}
              {!isUser && (
                <div className={`w-8 h-8 rounded-full overflow-hidden flex-shrink-0 mb-1 transition-opacity ${showAvatar ? 'opacity-100' : 'opacity-0'}`}>
                  {character?.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={character.avatarUrl} alt={character.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-sm">
                      🏴‍☠️
                    </div>
                  )}
                </div>
              )}

              <div className={`max-w-[78%] flex flex-col gap-0.5 ${isUser ? 'items-end' : 'items-start'}`}>
                {!isUser && showAvatar && (
                  <span className="text-xs text-gray-500 px-1 ml-0.5">
                    {character?.name ?? 'キャラクター'}
                  </span>
                )}

                {/* 💭 記憶参照バッジ */}
                {hasMemoryRef && (
                  <span
                    className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full mb-0.5 ml-0.5 select-none"
                    style={{
                      background: 'rgba(168,85,247,0.18)',
                      color: '#d8b4fe',
                      border: '1px solid rgba(168,85,247,0.35)',
                      boxShadow: '0 0 8px 2px rgba(168,85,247,0.25)',
                    }}
                  >
                    💭 覚えてるよ
                  </span>
                )}

                <div
                  className={`px-4 py-2.5 text-sm leading-relaxed shadow-sm transition-colors duration-500 ${
                    isUser
                      ? 'bg-gradient-to-br from-purple-600 to-pink-600 text-white rounded-2xl rounded-tr-sm shadow-purple-900/30'
                      : `rounded-2xl rounded-tl-sm ${getCharacterBubbleStyle(emotion)} ${
                      msg.id === lastEmotionMsgId && emotion === 'angry'   ? 'bubble-angry'   :
                      msg.id === lastEmotionMsgId && emotion === 'excited' ? 'bubble-excited' : ''
                    }`
                  }`}
                  style={hasMemoryRef ? { boxShadow: '0 0 12px 3px rgba(168,85,247,0.35)' } : undefined}
                >
                  <span className="whitespace-pre-wrap break-words">{displayContent}</span>
                  {emotionEmoji && (
                    <span className="ml-1.5 text-base">{emotionEmoji}</span>
                  )}

                  {/* ミニ音声プレーヤー */}
                  {!isUser && msg.audioUrl && (
                    <MiniAudioPlayer
                      audioUrl={msg.audioUrl}
                      messageId={msg.id}
                      playingId={playingAudioId}
                      onToggle={handleAudioToggle}
                    />
                  )}

                  {/* 音声生成中スピナー */}
                  {!isUser && msg.audioUrl === undefined && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-500">
                      <span className="w-3 h-3 rounded-full border border-gray-500 border-t-transparent animate-spin inline-block" />
                      <span>音声生成中...</span>
                    </div>
                  )}
                </div>

                {/* タイムスタンプ + 既読 */}
                <span className="text-[10px] text-gray-600 px-1 flex items-center gap-1">
                  {new Date(msg.createdAt).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                  {isUser && idx === messages.length - 1 && (
                    (() => {
                      const hasCharReply = messages.slice(idx + 1).some((m: Message) => m.role === 'CHARACTER');
                      return hasCharReply ? (
                        <svg className="w-3.5 h-3.5 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M1 12l5 5L17 6M7 12l5 5L23 6" />
                        </svg>
                      ) : (
                        <svg className="w-3 h-3 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 12l5 5L20 7" />
                        </svg>
                      );
                    })()
                  )}
                </span>
              </div>
            </div>
          );
        })}

        {/* タイピングインジケーター */}
        {isSending && (
          <div className="flex justify-start items-end gap-2 msg-animate">
            <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 mb-1">
              {character?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={character.avatarUrl} alt={character?.name ?? ''} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-sm">
                  🏴‍☠️
                </div>
              )}
            </div>
            <TypingIndicator characterName={character?.name} avatarUrl={character?.avatarUrl} />
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ══════════════ 入力エリア ══════════════ */}
      <div className="flex-shrink-0 border-t border-white/8 bg-black/60 backdrop-blur-md px-4 py-3 pb-[calc(1rem+env(safe-area-inset-bottom))] mb-[env(safe-area-inset-bottom)]">
        {/* Free plan 残りメッセージ表示（FC非加入時のみ） */}
        {userPlan === 'FREE' && !relationship?.isFanclub && (
          <div className="flex items-center gap-1.5 text-xs mb-2 px-1">
            <span className="text-amber-400">⚡</span>
            <span className="text-amber-400/80">
              残り<span className="font-bold text-amber-300">{Math.max(0, 3 - todayMsgCount)}</span>回
            </span>
            <span className="text-gray-600">|</span>
            <a
              href={`/relationship/${characterId}/fanclub`}
              className="text-purple-400 hover:text-purple-300 hover:underline transition-colors"
            >
              FC加入で無制限 →
            </a>
          </div>
        )}
        <div className="relative flex items-center gap-2">
          {/* ＋ボタン + ポップアップメニュー */}
          <div className="relative flex-shrink-0">
            {showPlusMenu && (
              <div className="absolute bottom-12 left-0 bg-gray-800 border border-white/10 rounded-2xl p-2 space-y-1 shadow-xl z-10 min-w-[160px]">
                <button
                  onClick={() => { setShowGift(true); setShowPlusMenu(false); }}
                  className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl hover:bg-gray-700 transition-colors text-white text-sm text-left"
                >
                  <span className="text-xl">🎁</span>
                  <span>ギフトを送る</span>
                </button>
                <a
                  href="/coins"
                  onClick={() => setShowPlusMenu(false)}
                  className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl hover:bg-gray-700 transition-colors text-white text-sm"
                >
                  <span className="text-xl">💰</span>
                  <span>コインを購入</span>
                </a>
                <button
                  className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-gray-500 text-sm text-left cursor-not-allowed"
                  disabled
                >
                  <span className="text-xl opacity-50">📷</span>
                  <span className="opacity-50">画像を送る</span>
                  <span className="ml-auto text-[10px] bg-gray-700 px-1.5 py-0.5 rounded text-gray-400">準備中</span>
                </button>
              </div>
            )}
            <button
              onClick={() => setShowPlusMenu((v) => !v)}
              className="w-10 h-10 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800 transition-all touch-manipulation border border-gray-700/60 text-xl font-light"
              aria-label="メニューを開く"
            >
              ＋
            </button>
          </div>
          {/* テキスト入力 */}
          <textarea
            ref={inputRef}
            value={inputText}
            onChange={(e) => {
              setInputText(e.target.value);
              // auto-resize: 1行〜最大5行
              e.target.style.height = 'auto';
              e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
            }}
            onKeyDown={handleKeyDown}
            placeholder={BASE_PLACEHOLDERS[placeholderIndex](character?.name ?? 'キャラクター')}
            maxLength={2000}
            rows={1}
            disabled={isSending || isGreeting}
            style={{ fontSize: '16px', resize: 'none' }} // prevent iOS auto-zoom
            className={`flex-1 bg-gray-800 text-white placeholder-gray-500 rounded-3xl px-4 py-3 focus:outline-none transition-all disabled:opacity-50 border touch-manipulation overflow-y-auto ${
              hasInput
                ? 'border-purple-500/60 ring-1 ring-purple-500/30'
                : 'border-gray-700/60'
            }`}
          />

          {/* 送信ボタン */}
          <button
            onClick={handleSendClick}
            disabled={isSending || isGreeting || !hasInput}
            className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed relative overflow-hidden touch-manipulation ${
              isSendBouncing ? 'send-bounce' : ''
            } ${hasInput ? 'send-glow' : ''}`}
            style={{
              background: hasInput
                ? 'linear-gradient(135deg, #7c3aed 0%, #a855f7 40%, #ec4899 100%)'
                : 'linear-gradient(135deg, #4b5563 0%, #374151 100%)',
            }}
            aria-label="送信"
          >
            {/* 光るハイライト */}
            {hasInput && (
              <span className="absolute inset-0 bg-white/10 rounded-full" />
            )}
            <svg className="w-5 h-5 text-white relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>

        {/* 文字数カウンター */}
        <div className={`text-right mt-1 pr-14 transition-colors ${
          inputText.length >= 1900 ? 'text-red-400' :
          inputText.length >= 1500 ? 'text-amber-400' : 'text-gray-600'
        } text-[11px]`}>
          {inputText.length > 0 && `${inputText.length}/2000`}
        </div>
      </div>
      {/* シェアトースト */}
      {shareToast && (
        <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-50 bg-gray-800/95 text-white text-sm px-5 py-2.5 rounded-full shadow-lg border border-white/10 pointer-events-none">
          {shareToast}
        </div>
      )}
    </div>
  );

}
