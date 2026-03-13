'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';

// ─── 型定義 ───────────────────────────────────────────────────────────────────

interface Character {
  id: string;
  name: string;
  slug: string;
  franchise: string;
  avatarUrl: string | null;
  catchphrases: string[];
}

interface GroupMessage {
  id: string;
  role: 'USER' | 'CHARACTER';
  characterId?: string;
  characterName?: string;
  emotion?: string;
  content: string;
  timestamp: Date;
}

// キャラごとのアクセントカラー（最大3体）
const CHAR_COLORS = [
  { bg: 'rgba(139,92,246,0.15)', border: 'rgba(139,92,246,0.4)', text: '#c4b5fd', dot: '#8b5cf6' },
  { bg: 'rgba(236,72,153,0.15)', border: 'rgba(236,72,153,0.4)', text: '#f9a8d4', dot: '#ec4899' },
  { bg: 'rgba(251,146,60,0.15)', border: 'rgba(251,146,60,0.4)', text: '#fcd34d', dot: '#f97316' },
];

const EMOTION_EMOJI: Record<string, string> = {
  excited: '🔥',
  happy: '😊',
  sad: '😢',
  angry: '😤',
  shy: '😳',
  neutral: '😐',
  love: '💕',
};

// ─── サブコンポーネント ─────────────────────────────────────────────────────────

function MessageBubble({
  message,
  colorMap,
  characters,
  conversationId,
  onPinToggle,
}: {
  message: GroupMessage;
  colorMap: Map<string, number>;
  characters: Character[];
  conversationId: string;
  onPinToggle?: (messageId: string, pinned: boolean) => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isPinned = !!(message.metadata as Record<string, unknown>)?.pinned;
  const isUser = message.role === 'USER';

  const handleTouchStart = () => {
    longPressTimer.current = setTimeout(() => setShowMenu(true), 500);
  };
  const handleTouchEnd = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  const handlePin = async () => {
    setShowMenu(false);
    try {
      const res = await fetch('/api/chat/group/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId: message.id, conversationId, action: isPinned ? 'unpin' : 'pin' }),
      });
      if (res.ok) {
        const data = await res.json();
        onPinToggle?.(message.id, data.pinned);
      }
    } catch { /* ignore */ }
  };

  if (isUser) {
    return (
      <div className="flex justify-end mb-3 relative">
        <div
          className="max-w-[75%] px-4 py-2.5 rounded-2xl rounded-tr-md text-sm text-white leading-relaxed"
          style={{
            background: 'linear-gradient(135deg, rgba(139,92,246,0.85), rgba(236,72,153,0.85))',
            boxShadow: '0 2px 12px rgba(139,92,246,0.3)',
          }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onContextMenu={e => { e.preventDefault(); setShowMenu(true); }}
        >
          {isPinned && <span className="text-[10px] text-white/50 block mb-1">pinned</span>}
          {message.content}
        </div>
        {showMenu && (
          <div className="absolute top-0 right-0 -mt-10 z-50 bg-gray-800 rounded-xl border border-white/10 shadow-xl overflow-hidden">
            <button onClick={handlePin} className="px-4 py-2 text-xs text-white hover:bg-white/10 whitespace-nowrap">
              {isPinned ? 'ピン解除' : 'ピン留め'}
            </button>
            <button onClick={() => setShowMenu(false)} className="px-4 py-2 text-xs text-white/40 hover:bg-white/10">
              閉じる
            </button>
          </div>
        )}
      </div>
    );
  }

  const cidx = colorMap.get(message.characterId ?? '') ?? 0;
  const color = CHAR_COLORS[cidx] ?? CHAR_COLORS[0];
  const char = characters.find(c => c.id === message.characterId);
  const emotionEmoji = EMOTION_EMOJI[message.emotion ?? 'neutral'] ?? '😐';

  return (
    <div className="flex items-start gap-2.5 mb-4 relative">
      <div className="flex-shrink-0">
        {char?.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={char.avatarUrl}
            alt={char.name}
            className="w-9 h-9 rounded-full object-cover"
            style={{ boxShadow: `0 0 0 2px ${color.dot}` }}
          />
        ) : (
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white"
            style={{ background: color.dot }}
          >
            {message.characterName?.charAt(0) ?? '?'}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-xs font-bold" style={{ color: color.text }}>
            {message.characterName}
          </span>
          <span className="text-xs">{emotionEmoji}</span>
          {isPinned && <span className="text-[10px] text-yellow-500/60 ml-1">pinned</span>}
        </div>
        <div
          className="inline-block max-w-[85%] px-4 py-2.5 rounded-2xl rounded-tl-md text-sm text-white leading-relaxed"
          style={{
            background: color.bg,
            border: `1px solid ${isPinned ? 'rgba(234,179,8,0.4)' : color.border}`,
          }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onContextMenu={e => { e.preventDefault(); setShowMenu(true); }}
        >
          {message.content}
        </div>
        {showMenu && (
          <div className="absolute top-0 left-12 z-50 bg-gray-800 rounded-xl border border-white/10 shadow-xl overflow-hidden">
            <button onClick={handlePin} className="px-4 py-2 text-xs text-white hover:bg-white/10 whitespace-nowrap">
              {isPinned ? 'ピン解除' : 'ピン留め'}
            </button>
            <button onClick={() => setShowMenu(false)} className="px-4 py-2 text-xs text-white/40 hover:bg-white/10">
              閉じる
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function TypingIndicator({
  characterName,
  color,
}: {
  characterName: string;
  color: { bg: string; border: string; text: string; dot: string };
}) {
  return (
    <div className="flex items-center gap-2.5 mb-3">
      <div
        className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-bold text-white"
        style={{ background: color.dot }}
      >
        …
      </div>
      <div>
        <p className="text-xs font-bold mb-1" style={{ color: color.text }}>{characterName}</p>
        <div
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl rounded-tl-md"
          style={{ background: color.bg, border: `1px solid ${color.border}` }}
        >
          {[0, 1, 2].map(i => (
            <span
              key={i}
              className="w-1.5 h-1.5 rounded-full"
              style={{
                background: color.dot,
                animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── メインページ ──────────────────────────────────────────────────────────────

export default function GroupChatRoomPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const conversationId = params.conversationId as string;

  const [characters, setCharacters] = useState<Character[]>([]);
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isCrossTalking, setIsCrossTalking] = useState(false);
  const [typingCharacter, setTypingCharacter] = useState<string | null>(null);
  const [coinBalance, setCoinBalance] = useState<number | null>(null);
  const [coinCostPerMsg, setCoinCostPerMsg] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 認証チェック
  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status, router]);

  // 初回ロード: 履歴取得
  useEffect(() => {
    if (status !== 'authenticated' || !conversationId) return;

    const loadConversation = async () => {
      try {
        const res = await fetch(`/api/chat/group/${conversationId}`);
        if (!res.ok) {
          setLoadError('チャット履歴の読み込みに失敗しました');
          setIsLoading(false);
          return;
        }
        const data = await res.json();

        // キャラ情報セット
        const chars: Character[] = data.conversation?.characters ?? [];
        setCharacters(chars);

        // メッセージ変換
        const msgs: GroupMessage[] = (data.messages ?? []).map((m: {
          id: string;
          role: 'USER' | 'CHARACTER';
          content: string;
          metadata?: { characterId?: string; characterName?: string; emotion?: string };
          createdAt: string;
        }) => ({
          id: m.id,
          role: m.role,
          characterId: m.metadata?.characterId,
          characterName: m.metadata?.characterName,
          emotion: m.metadata?.emotion,
          content: m.content,
          timestamp: new Date(m.createdAt),
        }));
        setMessages(msgs);
      } catch {
        setLoadError('チャット履歴の読み込みに失敗しました');
      } finally {
        setIsLoading(false);
      }
    };

    loadConversation();
  }, [status, conversationId]);

  // コイン残高取得
  useEffect(() => {
    if (status !== 'authenticated') return;
    fetch('/api/coins/balance')
      .then(r => r.json())
      .then(data => setCoinBalance(data.balance ?? null))
      .catch(() => {});
  }, [status]);

  // コスト計算
  useEffect(() => {
    setCoinCostPerMsg(characters.length * 10);
  }, [characters]);

  // メッセージ末尾にスクロール
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingCharacter]);

  // キャラのカラーマップ
  const colorMap = new Map(characters.map((c, i) => [c.id, i]));

  // メッセージ送信
  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text || isSending || characters.length === 0) return;

    setIsSending(true);
    setInputText('');
    setErrorMsg(null);

    const userMsg: GroupMessage = {
      id: `user-${Date.now()}`,
      role: 'USER',
      content: text,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);

    try {
      const res = await fetch('/api/chat/group', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          characterIds: characters.map(c => c.id),
          message: text,
          locale: 'ja',
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error === 'INSUFFICIENT_COINS') {
          setErrorMsg(`コインが不足しています（必要: ${data.required}コイン、残高: ${data.current}コイン）`);
        } else {
          setErrorMsg(data.error ?? 'エラーが発生しました');
        }
        return;
      }

      // キャラメッセージを順番に表示（typing演出）
      const charMessages: GroupMessage[] = (data.messages as Array<{
        characterId: string;
        characterName: string;
        content: string;
        emotion: string;
      }>).map(m => ({
        id: `char-${m.characterId}-${Date.now()}-${Math.random()}`,
        role: 'CHARACTER' as const,
        characterId: m.characterId,
        characterName: m.characterName,
        content: m.content,
        emotion: m.emotion,
        timestamp: new Date(),
      }));

      for (const charMsg of charMessages) {
        setTypingCharacter(charMsg.characterName ?? null);
        await new Promise(resolve => setTimeout(resolve, 900 + Math.random() * 600));
        setTypingCharacter(null);
        setMessages(prev => [...prev, charMsg]);
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      if (data.coinBalance !== undefined) {
        setCoinBalance(data.coinBalance);
      }
    } catch {
      setErrorMsg('送信エラーが発生しました。もう一度お試しください。');
    } finally {
      setIsSending(false);
    }
  }, [inputText, isSending, characters, conversationId]);

  // 掛け合いトリガー
  const handleCrossTalk = useCallback(async () => {
    if (isCrossTalking || isSending || characters.length < 2) return;

    setIsCrossTalking(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/chat/group/crosstalk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error === 'INSUFFICIENT_COINS') {
          setErrorMsg(`コインが不足しています（必要: ${data.required}コイン、残高: ${data.current}コイン）`);
        } else {
          setErrorMsg(data.error ?? 'エラーが発生しました');
        }
        return;
      }

      // キャラメッセージを順番に表示（typing演出）
      const charMessages: GroupMessage[] = (data.messages as Array<{
        characterId: string;
        characterName: string;
        content: string;
        emotion: string;
      }>).map(m => ({
        id: `cross-${m.characterId}-${Date.now()}-${Math.random()}`,
        role: 'CHARACTER' as const,
        characterId: m.characterId,
        characterName: m.characterName,
        content: m.content,
        emotion: m.emotion,
        timestamp: new Date(),
      }));

      for (const charMsg of charMessages) {
        setTypingCharacter(charMsg.characterName ?? null);
        await new Promise(resolve => setTimeout(resolve, 900 + Math.random() * 600));
        setTypingCharacter(null);
        setMessages(prev => [...prev, charMsg]);
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      if (data.coinBalance !== undefined) {
        setCoinBalance(data.coinBalance);
      }
    } catch {
      setErrorMsg('掛け合いの生成に失敗しました。もう一度お試しください。');
    } finally {
      setIsCrossTalking(false);
    }
  }, [isCrossTalking, isSending, characters, conversationId]);

  // ─── ローディング画面 ──────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col">
        <header className="sticky top-0 z-30 border-b border-white/5" style={{ background: 'rgba(3,7,18,0.95)' }}>
          <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-white/5 animate-pulse" />
            <div className="flex items-center gap-1">
              <div className="w-8 h-8 rounded-full bg-white/5 animate-pulse" />
              <div className="w-8 h-8 rounded-full bg-white/5 animate-pulse -ml-2" />
            </div>
            <div className="flex-1">
              <div className="h-4 w-32 bg-white/5 rounded-full animate-pulse mb-1" />
              <div className="h-3 w-20 bg-white/5 rounded-full animate-pulse" />
            </div>
          </div>
        </header>
        <main className="flex-1 px-4 py-4 max-w-lg mx-auto w-full">
          {[...Array(4)].map((_, i) => (
            <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'items-start gap-2.5'} mb-4`}>
              {i % 2 !== 0 && <div className="w-9 h-9 rounded-full bg-white/5 animate-pulse flex-shrink-0" />}
              <div className={`${i % 2 === 0 ? 'max-w-[75%]' : 'max-w-[85%]'}`}>
                {i % 2 !== 0 && <div className="h-3 w-16 bg-white/5 rounded-full animate-pulse mb-1" />}
                <div className="h-10 w-48 bg-white/5 rounded-2xl animate-pulse" />
              </div>
            </div>
          ))}
        </main>
      </div>
    );
  }

  // ─── エラー画面 ──────────────────────────────────────────────────────────────

  if (loadError) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center px-6">
          <div className="w-16 h-16 rounded-2xl bg-red-500/15 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <p className="text-white/60 text-sm mb-4">{loadError}</p>
          <button
            onClick={() => router.back()}
            className="px-5 py-2 rounded-full text-sm font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #8b5cf6, #ec4899)' }}
          >
            戻る
          </button>
        </div>
      </div>
    );
  }

  // ─── チャット画面 ────────────────────────────────────────────────────────────

  const typingChar = typingCharacter
    ? characters.find(c => c.name === typingCharacter)
    : null;
  const typingColorIdx = typingChar ? colorMap.get(typingChar.id) ?? 0 : 0;
  const typingColor = CHAR_COLORS[typingColorIdx] ?? CHAR_COLORS[0];

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-5px); }
        }
      `}</style>

      {/* 背景 */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-20 -left-20 w-80 h-80 rounded-full bg-purple-600/08 blur-3xl" />
        <div className="absolute top-1/2 right-0 w-64 h-64 rounded-full bg-pink-600/06 blur-3xl" />
      </div>

      {/* ヘッダー */}
      <header
        className="sticky top-0 z-30 border-b border-white/5 flex-shrink-0"
        style={{ background: 'rgba(3,7,18,0.95)', backdropFilter: 'blur(20px)' }}
      >
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-all flex-shrink-0"
          >
            ←
          </button>

          {/* 参加キャラのアバター重ね */}
          <div className="flex items-center -space-x-2 flex-shrink-0">
            {characters.map((c, i) => {
              const color = CHAR_COLORS[i] ?? CHAR_COLORS[0];
              return c.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={c.id}
                  src={c.avatarUrl}
                  alt={c.name}
                  className="w-8 h-8 rounded-full object-cover"
                  style={{
                    boxShadow: `0 0 0 2px ${color.dot}`,
                    zIndex: characters.length - i,
                  }}
                />
              ) : (
                <div
                  key={c.id}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                  style={{
                    background: color.dot,
                    zIndex: characters.length - i,
                  }}
                >
                  {c.name.charAt(0)}
                </div>
              );
            })}
          </div>

          {/* タイトル */}
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-sm truncate">
              {characters.map(c => c.name.split('・')[0]).join(' × ')}
            </p>
            <p className="text-white/40 text-[10px]">グループチャット</p>
          </div>

          {/* コイン残高 */}
          {coinBalance !== null && (
            <button
              onClick={() => router.push('/coins')}
              className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full transition-all active:scale-95"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <svg className="w-3.5 h-3.5 text-yellow-400" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" />
                <text x="12" y="16" textAnchor="middle" fontSize="12" fill="currentColor" fontWeight="bold">C</text>
              </svg>
              <span className="text-white/70 text-xs font-semibold">{coinBalance.toLocaleString()}</span>
              <svg className="w-3 h-3 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </button>
          )}
        </div>

        {/* コスト表示 */}
        <div className="max-w-lg mx-auto px-4 pb-2.5">
          <p className="text-white/30 text-[10px]">
            1メッセージ = <span className="text-yellow-400/70">{coinCostPerMsg}コイン</span>（{characters.length}体参加）
          </p>
        </div>
      </header>

      {/* メッセージエリア */}
      <main className="flex-1 overflow-y-auto px-4 py-4 max-w-lg mx-auto w-full relative z-10">
        {messages.length === 0 && !isSending && (
          <div className="text-center py-12">
            <div className="flex justify-center mb-4 -space-x-3">
              {characters.map((c, i) => {
                const color = CHAR_COLORS[i] ?? CHAR_COLORS[0];
                return c.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={c.id}
                    src={c.avatarUrl}
                    alt={c.name}
                    className="w-14 h-14 rounded-full object-cover"
                    style={{ boxShadow: `0 0 0 3px ${color.dot}` }}
                  />
                ) : (
                  <div
                    key={c.id}
                    className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold text-white"
                    style={{ background: color.dot }}
                  >
                    {c.name.charAt(0)}
                  </div>
                );
              })}
            </div>
            <p className="text-white font-bold mb-1">
              {characters.map(c => c.name.split('・')[0]).join('・')}が待ってる！
            </p>
            <p className="text-white/40 text-sm">メッセージを送って会話を始めよう✨</p>
          </div>
        )}

        {messages.map(msg => (
          <MessageBubble
            key={msg.id}
            message={msg}
            colorMap={colorMap}
            characters={characters}
            conversationId={conversationId}
            onPinToggle={(messageId, pinned) => {
              setMessages(prev => prev.map(m =>
                m.id === messageId
                  ? { ...m, metadata: { ...(m.metadata as Record<string, unknown> ?? {}), pinned } }
                  : m
              ));
            }}
          />
        ))}

        {typingCharacter && (
          <TypingIndicator
            characterName={typingCharacter}
            color={typingColor}
          />
        )}

        {errorMsg && (
          <div
            className="mx-auto max-w-sm rounded-2xl px-4 py-3 mb-3 text-sm text-center"
            style={{
              background: 'rgba(239,68,68,0.15)',
              border: '1px solid rgba(239,68,68,0.3)',
              color: 'rgba(252,165,165,0.9)',
            }}
          >
            ⚠️ {errorMsg}
          </div>
        )}

        <div ref={messagesEndRef} />
      </main>

      {/* 入力エリア */}
      <div
        className="sticky bottom-0 z-30 border-t border-white/5 px-4 pt-3 pb-6 flex-shrink-0"
        style={{ background: 'rgba(3,7,18,0.96)', backdropFilter: 'blur(20px)' }}
      >
        <div className="max-w-lg mx-auto flex gap-2.5 items-end">
          {/* 掛け合いボタン */}
          {characters.length >= 2 && (
            <button
              onClick={handleCrossTalk}
              disabled={isCrossTalking || isSending}
              className="flex-shrink-0 h-11 px-3.5 rounded-2xl flex items-center gap-1.5 transition-all active:scale-95"
              style={{
                background: isCrossTalking
                  ? 'rgba(255,255,255,0.08)'
                  : 'linear-gradient(135deg, rgba(251,191,36,0.2), rgba(245,158,11,0.15))',
                border: '1px solid rgba(251,191,36,0.35)',
              }}
            >
              {isCrossTalking ? (
                <span className="w-4 h-4 border-2 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin" />
              ) : (
                <>
                  <svg className="w-4 h-4 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                  </svg>
                  <span className="text-yellow-400 text-xs font-bold whitespace-nowrap">掛け合い</span>
                </>
              )}
            </button>
          )}
          <textarea
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={`${characters.map(c => c.name.split('・')[0]).join('・')}にメッセージ…`}
            rows={1}
            disabled={isSending}
            className="flex-1 resize-none rounded-2xl px-4 py-3 text-white placeholder-white/30 focus:outline-none transition-all"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              maxHeight: '120px',
              overflow: 'auto',
              fontSize: '16px',
            }}
            onFocus={e => { e.target.style.borderColor = 'rgba(139,92,246,0.5)'; }}
            onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.12)'; }}
          />
          <button
            onClick={handleSend}
            disabled={!inputText.trim() || isSending}
            className="flex-shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center transition-all active:scale-95"
            style={{
              background: inputText.trim() && !isSending
                ? 'linear-gradient(135deg, #8b5cf6, #ec4899)'
                : 'rgba(255,255,255,0.08)',
              boxShadow: inputText.trim() && !isSending
                ? '0 4px 16px rgba(139,92,246,0.4)'
                : 'none',
            }}
          >
            {isSending ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                <path d="M22 2L11 13" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
