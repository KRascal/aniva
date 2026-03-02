'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

interface Character {
  id: string;
  name: string;
  slug: string;
  avatarUrl: string | null;
  franchise: string | null;
}

export default function RankingIndexPage() {
  const router = useRouter();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/characters')
      .then(r => r.json())
      .then(data => {
        const chars = Array.isArray(data) ? data : data.characters ?? [];
        setCharacters(chars);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 to-black text-white">
      <div className="max-w-lg mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => router.back()} className="text-gray-400 hover:text-white">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold">🏆 ランキング</h1>
        </div>

        <p className="text-gray-400 text-sm mb-6">キャラクターを選んでファンランキングを確認しよう</p>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {characters.map(char => (
              <button
                key={char.id}
                onClick={() => router.push(`/ranking/${char.id}`)}
                className="flex flex-col items-center gap-3 p-4 bg-gray-900/60 hover:bg-gray-900/80 border border-white/5 hover:border-purple-500/30 rounded-2xl transition-all"
              >
                <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white/10">
                  {char.avatarUrl ? (
                    <Image
                      src={char.avatarUrl}
                      alt={char.name}
                      width={64}
                      height={64}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-purple-700 flex items-center justify-center text-2xl">
                      🏴‍☠️
                    </div>
                  )}
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium">{char.name}</p>
                  {char.franchise && (
                    <p className="text-xs text-gray-500 truncate max-w-[100px]">{char.franchise}</p>
                  )}
                </div>
                <span className="text-xs text-purple-400 flex items-center gap-1">
                  🏆 ランキングを見る
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
