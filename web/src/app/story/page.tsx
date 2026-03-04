'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

interface StoryCharacter {
  id: string;
  name: string;
  slug: string;
  franchise: string;
  avatarUrl: string | null;
  catchphrase: string | null;
  totalChapters: number;
  completedChapters: number;
  userLevel: number;
}

export default function StoryIndexPage() {
  const router = useRouter();
  const [characters, setCharacters] = useState<StoryCharacter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/story')
      .then((res) => {
        if (res.status === 401) {
          router.push('/login');
          return null;
        }
        return res.json() as Promise<{ characters: StoryCharacter[] }>;
      })
      .then((data) => {
        if (data) setCharacters(data.characters);
      })
      .catch(() => setError('読み込みに失敗しました'))
      .finally(() => setLoading(false));
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-950">
      {/* 背景 */}
      <div className="fixed inset-0 pointer-events-none">
        <div
          style={{
            background:
              'radial-gradient(ellipse at top-left, rgba(168,85,247,0.12) 0%, transparent 55%), radial-gradient(ellipse at bottom-right, rgba(236,72,153,0.1) 0%, transparent 50%)',
          }}
          className="absolute inset-0"
        />
      </div>

      {/* ヘッダー */}
      <header className="relative z-10 border-b border-gray-800 bg-gray-950 px-4 py-4 sticky top-0">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="text-gray-400 hover:text-white transition-colors p-1"
            aria-label="戻る"
          >
            ←
          </button>
          <div>
            <h1 className="text-white font-bold text-xl">📖 ストーリー</h1>
            <p className="text-gray-400 text-xs">キャラクターとの秘密のストーリーを解き明かそう</p>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-2xl mx-auto px-4 py-6">
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="text-gray-400 animate-pulse text-base">読み込み中...</div>
          </div>
        )}

        {error && (
          <div className="text-center py-20 text-gray-400">{error}</div>
        )}

        {!loading && !error && characters.length === 0 && (
          <div className="text-center py-20">
            <div className="text-4xl mb-3">📖</div>
            <p className="text-gray-400">ストーリーはまだありません</p>
            <p className="text-gray-500 text-sm mt-1">キャラクターとチャットしてストーリーを解放しよう</p>
          </div>
        )}

        {!loading && !error && characters.length > 0 && (
          <>
            {/* 進捗サマリー */}
            <ProgressSummary characters={characters} />

            {/* キャラグリッド */}
            <div className="grid grid-cols-1 gap-3 mt-5">
              {characters.map((char) => (
                <StoryCharacterCard
                  key={char.id}
                  character={char}
                  onClick={() => router.push(`/story/${char.id}`)}
                />
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

// ─── 進捗サマリー ───────────────────────────────────────────
function ProgressSummary({ characters }: { characters: StoryCharacter[] }) {
  const totalChapters = characters.reduce((s, c) => s + c.totalChapters, 0);
  const completedChapters = characters.reduce((s, c) => s + c.completedChapters, 0);
  const startedCharacters = characters.filter((c) => c.completedChapters > 0).length;
  const completedCharacters = characters.filter(
    (c) => c.completedChapters > 0 && c.completedChapters >= c.totalChapters,
  ).length;
  const pct = totalChapters > 0 ? Math.round((completedChapters / totalChapters) * 100) : 0;

  return (
    <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-gray-300 text-sm font-medium">全体の進捗</span>
        <span className="text-purple-400 text-sm font-bold">{pct}%</span>
      </div>
      {/* プログレスバー */}
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden mb-3">
        <div
          className="h-full bg-gradient-to-r from-purple-600 to-pink-500 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex gap-4 text-xs text-gray-500">
        <span>{completedChapters} / {totalChapters} 章 クリア</span>
        <span>{startedCharacters} キャラ 開始済み</span>
        {completedCharacters > 0 && (
          <span className="text-yellow-400">{completedCharacters} キャラ 完了 ⭐</span>
        )}
      </div>
    </div>
  );
}

// ─── キャラカード ────────────────────────────────────────────
function StoryCharacterCard({
  character,
  onClick,
}: {
  character: StoryCharacter;
  onClick: () => void;
}) {
  const { completedChapters, totalChapters } = character;
  const pct = totalChapters > 0 ? Math.round((completedChapters / totalChapters) * 100) : 0;
  const isCompleted = completedChapters >= totalChapters && totalChapters > 0;
  const isStarted = completedChapters > 0;

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-gray-900/70 border border-gray-700/60 rounded-2xl p-4 hover:border-purple-500/40 hover:bg-gray-800/70 transition-all duration-200 active:scale-[0.99]"
    >
      <div className="flex items-center gap-4">
        {/* アバター */}
        <div className="relative flex-shrink-0">
          {character.avatarUrl ? (
            <Image
              src={character.avatarUrl}
              alt={character.name}
              width={52}
              height={52}
              className="w-13 h-13 rounded-full object-cover border-2 border-gray-700"
            />
          ) : (
            <div className="w-13 h-13 rounded-full bg-gray-800 border-2 border-gray-700 flex items-center justify-center text-xl">
              📖
            </div>
          )}
          {isCompleted && (
            <span className="absolute -top-1 -right-1 text-sm">⭐</span>
          )}
        </div>

        {/* 情報 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-white font-bold text-base">{character.name}</span>
            <span className="text-xs text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded-md">
              {character.franchise}
            </span>
            {isCompleted && (
              <span className="text-xs text-yellow-400 font-bold">COMPLETE</span>
            )}
          </div>

          {character.catchphrase && (
            <p className="text-gray-400 text-xs mb-2 truncate">「{character.catchphrase}」</p>
          )}

          {/* 進捗バー */}
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isCompleted
                    ? 'bg-yellow-400'
                    : isStarted
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500'
                    : 'bg-gray-700'
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-xs text-gray-500 flex-shrink-0">
              {completedChapters}/{totalChapters}
            </span>
          </div>

          {/* Lvゲート表示 */}
          {!isStarted && (
            <p className="text-gray-600 text-xs mt-1.5">
              {character.userLevel < 2 ? `Lv${character.userLevel} · チャットしてストーリーを解放` : '続きが待っている…'}
            </p>
          )}
        </div>

        {/* 矢印 */}
        <div className="text-gray-600 flex-shrink-0">›</div>
      </div>
    </button>
  );
}
