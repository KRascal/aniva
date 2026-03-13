'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

// ─── 型定義 ───────────────────────────────────────────────────────────────────

interface Character {
  id: string;
  name: string;
  slug: string;
  franchise: string;
  avatarUrl: string | null;
  catchphrases: string[];
}

// キャラごとのアクセントカラー（最大3体）
const CHAR_COLORS = [
  { bg: 'rgba(139,92,246,0.15)', border: 'rgba(139,92,246,0.4)', text: '#c4b5fd', dot: '#8b5cf6' },
  { bg: 'rgba(236,72,153,0.15)', border: 'rgba(236,72,153,0.4)', text: '#f9a8d4', dot: '#ec4899' },
  { bg: 'rgba(251,146,60,0.15)', border: 'rgba(251,146,60,0.4)', text: '#fcd34d', dot: '#f97316' },
];

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

// ─── メインページ ──────────────────────────────────────────────────────────────

export default function GroupChatPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [coinBalance, setCoinBalance] = useState<number | null>(null);
  const [coinCostPerMsg, setCoinCostPerMsg] = useState(0);
  const [isLoadingChars, setIsLoadingChars] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

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
    const cost = selectedIds.length * 10;
    setCoinCostPerMsg(cost);
  }, [selectedIds]);

  // キャラ選択トグル
  const handleToggleChar = useCallback((id: string) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  }, []);

  // 選択されたキャラ
  const selectedChars = selectedIds
    .map(id => characters.find(c => c.id === id))
    .filter((c): c is Character => c != null);

  // チャット開始 → API でConversation作成 → ルーム遷移
  const handleStartChat = useCallback(async () => {
    if (selectedIds.length < 1 || isStarting) return;

    setIsStarting(true);
    setStartError(null);

    try {
      const res = await fetch('/api/chat/group/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterIds: selectedIds }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStartError(data.error ?? 'チャットの作成に失敗しました');
        return;
      }

      router.push(`/chat/group/${data.conversationId}`);
    } catch {
      setStartError('チャットの作成に失敗しました。もう一度お試しください。');
    } finally {
      setIsStarting(false);
    }
  }, [selectedIds, isStarting, router]);

  // ─── キャラ選択画面 ──────────────────────────────────────────────────────────

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
                <div className="w-14 h-14 rounded-2xl bg-purple-500/15 border border-purple-500/20 flex items-center justify-center mb-3">
                  <svg className="w-7 h-7 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
                  </svg>
                </div>
                <p className="text-white/50 text-sm">キャラをフォローして招待しよう</p>
                <button
                  onClick={() => router.push('/explore')}
                  className="mt-4 px-5 py-2 rounded-full text-sm font-bold text-white"
                  style={{ background: 'linear-gradient(135deg, #8b5cf6, #ec4899)' }}
                >
                  キャラを探す →
                </button>
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
            {startError && (
              <div
                className="mb-2 rounded-xl px-4 py-2 text-sm text-center"
                style={{
                  background: 'rgba(239,68,68,0.15)',
                  border: '1px solid rgba(239,68,68,0.3)',
                  color: 'rgba(252,165,165,0.9)',
                }}
              >
                ⚠️ {startError}
              </div>
            )}
            <button
              onClick={handleStartChat}
              disabled={selectedIds.length < 1 || isStarting}
              className="w-full py-4 rounded-2xl font-bold text-base text-white transition-all active:scale-[0.97]"
              style={{
                background: selectedIds.length >= 1 && !isStarting
                  ? 'linear-gradient(135deg, #8b5cf6, #ec4899)'
                  : 'rgba(255,255,255,0.08)',
                color: selectedIds.length >= 1 ? 'white' : 'rgba(255,255,255,0.3)',
                boxShadow: selectedIds.length >= 1 && !isStarting ? '0 4px 24px rgba(139,92,246,0.4)' : 'none',
              }}
            >
              {isStarting ? (
                <span className="inline-flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  作成中…
                </span>
              ) : selectedIds.length < 1
                ? 'キャラを選択してください'
                : `${selectedChars.map(c => c.name.split('・')[0]).join('・')}とチャット開始`}
            </button>
          </div>
        </div>
      </div>
    );
}
