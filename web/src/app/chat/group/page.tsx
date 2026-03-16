'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';

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

function CharacterSelectCard({
  character,
  selected,
  colorIndex,
  disabled,
  onToggle,
}: {
  character: Character;
  selected: boolean;
  colorIndex: number;
  disabled: boolean;
  onToggle: () => void;
}) {
  const color = CHAR_COLORS[colorIndex] ?? CHAR_COLORS[0];

  return (
    <button
      onClick={onToggle}
      disabled={disabled && !selected}
      className="w-full flex items-center gap-3 rounded-2xl p-3 transition-all duration-200 active:scale-[0.97] text-left"
      style={{
        background: selected ? color.bg : 'rgba(255,255,255,0.03)',
        border: `1px solid ${selected ? color.border : 'rgba(255,255,255,0.08)'}`,
        boxShadow: selected ? `0 0 16px ${color.dot}33` : 'none',
        opacity: disabled && !selected ? 0.45 : 1,
      }}
    >
      {/* アバター */}
      <div className="relative flex-shrink-0">
        {character.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={character.avatarUrl}
            alt={character.name}
            className="w-12 h-12 rounded-full object-cover"
            style={selected ? { boxShadow: `0 0 0 2.5px ${color.dot}` } : undefined}
          />
        ) : (
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-white"
            style={{ background: selected ? color.dot : '#374151' }}
          >
            {character.name.charAt(0)}
          </div>
        )}
        {selected && (
          <div
            className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
            style={{ background: color.dot }}
          >
            {colorIndex + 1}
          </div>
        )}
      </div>

      {/* 情報 */}
      <div className="flex-1 min-w-0">
        <p className="text-white font-bold text-sm">{character.name}</p>
        <p className="text-white/45 text-xs truncate">{character.franchise}</p>
        {character.catchphrases?.[0] && (
          <p className="text-white/35 text-[10px] italic truncate mt-0.5">
            &ldquo;{character.catchphrases[0]}&rdquo;
          </p>
        )}
      </div>

      {/* チェックマーク */}
      <div
        className="flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all"
        style={{
          borderColor: selected ? color.dot : 'rgba(255,255,255,0.2)',
          background: selected ? color.dot : 'transparent',
        }}
      >
        {selected && (
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
    </button>
  );
}

function MessageBubble({
  message,
  colorMap,
  characters,
}: {
  message: GroupMessage;
  colorMap: Map<string, number>;
  characters: Character[];
}) {
  const isUser = message.role === 'USER';

  if (isUser) {
    return (
      <div className="flex justify-end mb-3">
        <div
          className="max-w-[75%] px-4 py-2.5 rounded-2xl rounded-tr-md text-sm text-white leading-relaxed"
          style={{
            background: 'linear-gradient(135deg, rgba(139,92,246,0.85), rgba(236,72,153,0.85))',
            boxShadow: '0 2px 12px rgba(139,92,246,0.3)',
          }}
        >
          {message.content}
        </div>
      </div>
    );
  }

  // キャラメッセージ
  const cidx = colorMap.get(message.characterId ?? '') ?? 0;
  const color = CHAR_COLORS[cidx] ?? CHAR_COLORS[0];
  const char = characters.find(c => c.id === message.characterId);
  const emotionEmoji = EMOTION_EMOJI[message.emotion ?? 'neutral'] ?? '😐';

  return (
    <div className="flex items-start gap-2.5 mb-4">
      {/* アバター */}
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

      {/* バブル */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-xs font-bold" style={{ color: color.text }}>
            {message.characterName}
          </span>
          <span className="text-xs">{emotionEmoji}</span>
        </div>
        <div
          className="inline-block max-w-[85%] px-4 py-2.5 rounded-2xl rounded-tl-md text-sm text-white leading-relaxed"
          style={{
            background: color.bg,
            border: `1px solid ${color.border}`,
          }}
        >
          {message.content}
        </div>
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

export default function GroupChatPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  // ステップ: 'select' | 'chat'
  const [step, setStep] = useState<'select' | 'chat'>('select');
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [typingCharacter, setTypingCharacter] = useState<string | null>(null);
  const [coinBalance, setCoinBalance] = useState<number | null>(null);
  const [coinCostPerMsg, setCoinCostPerMsg] = useState(0);
  const [isLoadingChars, setIsLoadingChars] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isCrosstalk, setIsCrosstalk] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);

  // URLのconversationIdクエリから既存会話を自動ロード
  useEffect(() => {
    const urlConvId = searchParams.get('conversationId');
    if (!urlConvId) return;
    setConversationId(urlConvId);
    // 履歴をロード
    (async () => {
      try {
        const histRes = await fetch(`/api/chat/group/history?conversationId=${urlConvId}&limit=30`);
        if (histRes.ok) {
          const histData = await histRes.json();
          if (histData.messages && Array.isArray(histData.messages)) {
            setMessages(histData.messages);
          }
          // characterIdsからキャラ情報をselectedIdsにセット
          if (histData.characterIds && Array.isArray(histData.characterIds)) {
            setSelectedIds(histData.characterIds);
          }
        }
      } catch { /* ignore */ }
    })();
  }, [searchParams]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 認証チェック
  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status, router]);

  // フォロー中のキャラを取得
  useEffect(() => {
    if (status !== 'authenticated') return;

    Promise.all([
      fetch('/api/characters').then(r => r.json()),
      fetch('/api/relationship/all').then(r => r.json()),
    ])
      .then(([charData, relData]) => {
        const allChars: Character[] = charData.characters ?? [];
        const rels: { characterId: string; isFollowing: boolean }[] = relData.relationships ?? [];
        const followingIds = new Set(rels.filter(r => r.isFollowing).map(r => r.characterId));
        // フォロー中優先、なければ全員
        const pool = followingIds.size > 0
          ? allChars.filter(c => followingIds.has(c.id))
          : allChars;
        setCharacters(pool);
      })
      .catch(() => setCharacters([]))
      .finally(() => setIsLoadingChars(false));
  }, [status]);

  // コイン残高取得
  useEffect(() => {
    if (status !== 'authenticated') return;
    fetch('/api/coins/balance')
      .then(r => r.json())
      .then(data => setCoinBalance(data.balance ?? null))
      .catch(() => {});
  }, [status]);

  // selectedIdsが変わったらコスト再計算
  useEffect(() => {
    const cost = selectedIds.length * 10; // 簡易計算（実際はキャラのchatCoinPerMessage）
    setCoinCostPerMsg(cost);
  }, [selectedIds]);

  // メッセージ末尾にスクロール
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingCharacter]);

  // キャラ選択トグル
  const handleToggleChar = useCallback((id: string) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  }, []);

  // キャラのカラーマップ（selected順）
  const colorMap = new Map(selectedIds.map((id, i) => [id, i]));

  // 選択されたキャラ
  const selectedChars = selectedIds
    .map(id => characters.find(c => c.id === id))
    .filter((c): c is Character => c != null);

  // チャット開始（同一キャラ選択時は既存会話を復帰）
  const handleStartChat = async () => {
    if (selectedIds.length < 1) return;
    setMessages([]);
    setConversationId(null);

    try {
      // 既存のグループ会話を検索
      const res = await fetch('/api/chat/group');
      if (res.ok) {
        const data = await res.json() as {
          conversations?: Array<{
            id: string;
            characters: Array<{ id: string; name: string }>;
            lastMessage?: { conversationId: string; role: string; content: string; createdAt: string } | null;
          }>;
        };
        const sorted = [...selectedIds].sort();
        const existing = (data.conversations ?? []).find(conv => {
          const convIds = (conv.characters ?? []).map((c: { id: string }) => c.id).sort();
          return convIds.length === sorted.length && convIds.every((id: string, i: number) => id === sorted[i]);
        });

        if (existing) {
          // 既存会話のメッセージを /api/chat/group/history?conversationId= で取得
          const histRes = await fetch(`/api/chat/group/history?conversationId=${existing.id}&limit=30`);
          if (histRes.ok) {
            const histData = await histRes.json() as {
              messages?: Array<{
                id: string;
                role: string;
                content: string;
                metadata?: Record<string, unknown>;
                createdAt?: string;
              }>;
              conversationId?: string;
            };
            // キャラ名マップ（選択中のキャラ）
            const charNameMap = new Map(selectedChars.map(c => [c.id, c.name]));
            const loaded: GroupMessage[] = (histData.messages ?? []).map(m => {
              const meta = m.metadata as Record<string, unknown> | undefined;
              const charId = typeof meta?.characterId === 'string' ? meta.characterId : undefined;
              return {
                id: m.id,
                role: m.role as 'USER' | 'CHARACTER',
                characterId: charId,
                characterName: charId ? (charNameMap.get(charId) ?? charId) : undefined,
                content: m.content,
                timestamp: m.createdAt ? new Date(m.createdAt) : new Date(),
              };
            });
            setMessages(loaded);
            if (histData.conversationId) setConversationId(histData.conversationId);
          }
        }
      }
    } catch {
      // 取得失敗しても新規で始める
    }

    setStep('chat');
  };

  // メッセージ送信
  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text || isSending || selectedIds.length === 0) return;

    setIsSending(true);
    setInputText('');
    setErrorMsg(null);

    // ユーザーメッセージを追加
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
          characterIds: selectedIds,
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

      // キャラメッセージを順番に表示（ローディング演出）
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

      // 順番にtypingIndicatorを表示してからメッセージを追加
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
      if (data.conversationId) {
        setConversationId(data.conversationId);
      }
    } catch {
      setErrorMsg('送信エラーが発生しました。もう一度お試しください。');
    } finally {
      setIsSending(false);
    }
  }, [inputText, isSending, selectedIds]);

  // 掛け合い（crosstalk）ハンドラ
  const handleCrosstalk = useCallback(async () => {
    if (isCrosstalk || selectedIds.length < 2) return;

    setIsCrosstalk(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/chat/group/crosstalk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characterIds: selectedIds,
          conversationId,
          locale: 'ja',
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error === 'INSUFFICIENT_COINS') {
          setErrorMsg(`コインが不足しています（必要: ${data.required}コイン、残高: ${data.current}コイン）`);
        } else {
          setErrorMsg(data.error ?? '掛け合いエラーが発生しました');
        }
        return;
      }

      // 掛け合いメッセージを順番に表示
      const charMessages: GroupMessage[] = (data.messages as Array<{
        characterId: string;
        characterName: string;
        content: string;
        emotion: string;
      }>).map(m => ({
        id: `crosstalk-${m.characterId}-${Date.now()}-${Math.random()}`,
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
      setErrorMsg('掛け合いエラーが発生しました。もう一度お試しください。');
    } finally {
      setIsCrosstalk(false);
    }
  }, [isCrosstalk, selectedIds, conversationId]);

  // ─── キャラ選択画面 ──────────────────────────────────────────────────────────

  if (step === 'select') {
    return (
      <div className="min-h-screen bg-gray-950 pb-24">
        <style>{`
          @keyframes bounce {
            0%, 60%, 100% { transform: translateY(0); }
            30% { transform: translateY(-5px); }
          }
        `}</style>

        {/* 背景 */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-20 -left-20 w-80 h-80 rounded-full bg-purple-600/10 blur-3xl" />
          <div className="absolute top-1/2 right-0 w-64 h-64 rounded-full bg-pink-600/08 blur-3xl" />
        </div>

        {/* ヘッダー */}
        <header className="sticky top-0 z-30 border-b border-white/5" style={{ background: 'rgb(3,7,18)' }}>
          <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="w-9 h-9 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-all"
            >
              ←
            </button>
            <div>
              <h1 className="text-white font-bold text-base">グループチャット</h1>
              <p className="text-white/40 text-xs">キャラを最大3体選択</p>
            </div>
          </div>
        </header>

        <main className="max-w-lg mx-auto px-4 py-5 relative z-10">
          {/* キャッチコピー */}
          <div
            className="rounded-2xl px-4 py-4 mb-6"
            style={{
              background: 'linear-gradient(135deg, rgba(88,28,135,0.3), rgba(157,23,77,0.2))',
              border: '1px solid rgba(139,92,246,0.3)',
              boxShadow: '0 4px 24px rgba(139,92,246,0.15)',
            }}
          >
            <p className="text-purple-300 text-sm font-bold mb-1">✨ キャラ同士の掛け合いを見よう！</p>
            <p className="text-white/55 text-xs leading-relaxed">
              複数のキャラを招待して、一緒にトークしよう。キャラ同士が会話に参加して盛り上がるよ！
            </p>
          </div>

          {/* 選択済みキャラのプレビュー */}
          {selectedChars.length > 0 && (
            <div className="mb-5">
              <p className="text-white/50 text-xs font-semibold mb-2">選択中 ({selectedChars.length}/3)</p>
              <div className="flex items-center gap-2">
                {selectedChars.map((c, i) => {
                  const color = CHAR_COLORS[i] ?? CHAR_COLORS[0];
                  return (
                    <div key={c.id} className="flex flex-col items-center gap-1">
                      {c.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={c.avatarUrl}
                          alt={c.name}
                          className="w-12 h-12 rounded-full object-cover"
                          style={{ boxShadow: `0 0 0 2.5px ${color.dot}` }}
                        />
                      ) : (
                        <div
                          className="w-12 h-12 rounded-full flex items-center justify-center text-base font-bold text-white"
                          style={{ background: color.dot }}
                        >
                          {c.name.charAt(0)}
                        </div>
                      )}
                      <span className="text-xs font-bold" style={{ color: color.text }}>
                        {c.name.split('・')[0]}
                      </span>
                    </div>
                  );
                })}
                {selectedChars.length >= 2 && (
                  <div className="flex items-center gap-1 ml-2">
                    {selectedChars.map((c, i) => (
                      <span key={c.id}>
                        <span className="text-white/60 text-xs">{i > 0 ? ' × ' : ''}{c.name.split('・')[0]}</span>
                      </span>
                    ))}
                    <span className="text-white/40 text-xs ml-1">が待ってる！</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* コイン表示 */}
          {selectedIds.length > 0 && (
            <div
              className="mb-5 rounded-xl px-4 py-2.5 flex items-center justify-between"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <span className="text-white/60 text-xs">1メッセージのコスト</span>
              <span className="text-yellow-400 text-sm font-bold">{coinCostPerMsg}コイン</span>
            </div>
          )}

          {/* キャラ一覧 */}
          <div className="space-y-2.5">
            {isLoadingChars ? (
              [...Array(4)].map((_, i) => (
                <div key={i} className="h-[72px] rounded-2xl bg-white/5 animate-pulse" />
              ))
            ) : characters.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-14 h-14 rounded-2xl bg-purple-500/15 border border-purple-500/20 flex items-center justify-center mx-auto mb-3">
                  <svg className="w-7 h-7 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
                  </svg>
                </div>
                <p className="text-white/80 font-bold">まずはキャラをフォローしよう</p>
                <p className="text-white/50 text-sm mt-1">掛け合いには2人以上のキャラが必要です</p>
                <button
                  onClick={() => router.push('/discover')}
                  className="mt-4 px-5 py-2 rounded-full text-sm font-bold text-white"
                  style={{ background: 'linear-gradient(135deg, #8b5cf6, #ec4899)' }}
                >
                  キャラを探す →
                </button>
              </div>
            ) : characters.length === 1 ? (
              <div className="text-center py-8">
                <CharacterSelectCard
                  key={characters[0].id}
                  character={characters[0]}
                  selected={selectedIds.indexOf(characters[0].id) !== -1}
                  colorIndex={0}
                  disabled={false}
                  onToggle={() => handleToggleChar(characters[0].id)}
                />
                <div className="mt-4 p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
                  <p className="text-white/70 text-sm">掛け合いにはもう1人フォローが必要です</p>
                  <button
                    onClick={() => router.push('/discover')}
                    className="mt-2 px-4 py-1.5 rounded-full text-xs font-bold text-white bg-purple-500/30 hover:bg-purple-500/50 transition-colors"
                  >
                    もう1人探す →
                  </button>
                </div>
              </div>
            ) : (
              characters.map(char => {
                const idx = selectedIds.indexOf(char.id);
                return (
                  <CharacterSelectCard
                    key={char.id}
                    character={char}
                    selected={idx !== -1}
                    colorIndex={idx !== -1 ? idx : selectedIds.length}
                    disabled={selectedIds.length >= 3}
                    onToggle={() => handleToggleChar(char.id)}
                  />
                );
              })
            )}
          </div>
        </main>

        {/* 下部CTAボタン */}
        <div
          className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/5 px-4 pt-3 pb-safe-bottom pb-3"
          style={{ background: 'rgba(3,7,18,0.96)', backdropFilter: 'blur(20px)' }}
        >
          <div className="max-w-lg mx-auto">
            <button
              onClick={handleStartChat}
              disabled={selectedIds.length < 1}
              className="w-full py-4 rounded-2xl font-bold text-base text-white transition-all active:scale-[0.97]"
              style={{
                background: selectedIds.length >= 1
                  ? 'linear-gradient(135deg, #8b5cf6, #ec4899)'
                  : 'rgba(255,255,255,0.08)',
                color: selectedIds.length >= 1 ? 'white' : 'rgba(255,255,255,0.3)',
                boxShadow: selectedIds.length >= 1 ? '0 4px 24px rgba(139,92,246,0.4)' : 'none',
              }}
            >
              {selectedIds.length < 1
                ? 'キャラを選択してください'
                : `${selectedChars.map(c => c.name.split('・')[0]).join('・')}とチャット開始`}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── チャット画面 ────────────────────────────────────────────────────────────

  const typingChar = typingCharacter
    ? selectedChars.find(c => c.name === typingCharacter)
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
          {/* 戻るボタン */}
          <button
            onClick={() => setStep('select')}
            className="w-9 h-9 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-all flex-shrink-0"
          >
            ←
          </button>

          {/* 参加キャラのアバター */}
          <div className="flex items-center -space-x-2 flex-shrink-0">
            {selectedChars.map((c, i) => {
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
                    zIndex: selectedChars.length - i,
                  }}
                />
              ) : (
                <div
                  key={c.id}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                  style={{
                    background: color.dot,
                    zIndex: selectedChars.length - i,
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
              {selectedChars.map(c => c.name.split('・')[0]).join(' × ')}
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
            1メッセージ = <span className="text-yellow-400/70">{coinCostPerMsg}コイン</span>（{selectedChars.length}体参加）
          </p>
        </div>
      </header>

      {/* メッセージエリア */}
      <main className="flex-1 overflow-y-auto px-4 py-4 max-w-lg mx-auto w-full relative z-10">
        {messages.length === 0 && !isSending && !searchParams.get('conversationId') && (
          <div className="text-center py-12">
            <div className="flex justify-center mb-4 -space-x-3">
              {selectedChars.map((c, i) => {
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
              {selectedChars.map(c => c.name.split('・')[0]).join('・')}が待ってる！
            </p>
            <p className="text-white/40 text-sm">メッセージを送って会話を始めよう✨</p>
          </div>
        )}

        {messages.map(msg => (
          <MessageBubble
            key={msg.id}
            message={msg}
            colorMap={colorMap}
            characters={selectedChars}
          />
        ))}

        {/* タイピングインジケーター */}
        {typingCharacter && (
          <TypingIndicator
            characterName={typingCharacter}
            color={typingColor}
          />
        )}

        {/* エラー表示 */}
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
        {/* 掛け合いボタン（キャラ2体以上 & メッセージあり） */}
        {selectedChars.length >= 2 && messages.length > 0 && (
          <div className="max-w-lg mx-auto mb-2">
            <button
              onClick={handleCrosstalk}
              disabled={isCrosstalk || isSending}
              className="w-full py-2.5 rounded-2xl font-bold text-sm text-white transition-all active:scale-[0.97] flex items-center justify-center gap-2"
              style={{
                background: isCrosstalk || isSending
                  ? 'rgba(255,255,255,0.08)'
                  : 'linear-gradient(135deg, rgba(139,92,246,0.7), rgba(236,72,153,0.7))',
                border: '1px solid rgba(139,92,246,0.4)',
                boxShadow: isCrosstalk || isSending ? 'none' : '0 2px 12px rgba(139,92,246,0.3)',
                color: isCrosstalk || isSending ? 'rgba(255,255,255,0.3)' : 'white',
              }}
            >
              {isCrosstalk ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>掛け合い中…</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <span>キャラ同士で掛け合わせる</span>
                </>
              )}
            </button>
          </div>
        )}
        <div className="max-w-lg mx-auto flex gap-2.5 items-end">
          <textarea
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={`${selectedChars.map(c => c.name.split('・')[0]).join('・')}にメッセージ…`}
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
