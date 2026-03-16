'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface Character {
  id: string;
  name: string;
  nameEn: string;
  slug: string;
  franchise: string;
  avatarUrl: string | null;
}

export default function ShopPage() {
  const { status } = useSession();
  const router = useRouter();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status, router]);

  useEffect(() => {
    fetch('/api/characters')
      .then((r) => r.json())
      .then((data) => {
        if (data.characters) setCharacters(data.characters);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#0a0a0a]/95 backdrop-blur-sm border-b border-white/5">
        <div className="px-4 py-4 flex items-center gap-3">
          <button onClick={() => router.back()} className="text-white/60 hover:text-white">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <h1 className="text-lg font-bold">ショップ</h1>
        </div>
      </div>

      {/* Shop Banner */}
      <div className="px-4 pt-4 pb-2">
        <div className="rounded-2xl overflow-hidden border border-amber-700/30 bg-gradient-to-br from-amber-900/30 to-orange-900/20 p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-amber-800/50 flex items-center justify-center border border-amber-700/30">
              <svg className="w-6 h-6 text-amber-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-white font-bold text-xl">限定コンテンツショップ</h2>
              <p className="text-amber-300/70 text-sm">キャラクター限定のデジタルコンテンツをコインで購入</p>
            </div>
          </div>
          <p className="text-gray-400 text-sm leading-relaxed">
            壁紙、ボイスクリップ、特別アートなど、推しキャラの限定コンテンツを手に入れよう。購入したコンテンツはいつでもダウンロード可能です。
          </p>
        </div>
      </div>

      {/* Character Shop List */}
      <div className="px-4 pt-4">
        <p className="text-gray-400 text-xs font-semibold uppercase tracking-widest mb-3">キャラクター別ショップ</p>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
          </div>
        ) : characters.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-white/40 text-sm">キャラクターが見つかりません</p>
          </div>
        ) : (
          <div className="space-y-2">
            {characters.map((char) => (
              <button
                key={char.id}
                onClick={() => router.push(`/profile/${char.id}?tab=shop`)}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-gray-900/60 border border-white/5 hover:border-white/10 hover:bg-gray-900/80 transition-all active:scale-[0.98]"
              >
                <div className="w-11 h-11 rounded-xl overflow-hidden bg-gray-800 flex-shrink-0">
                  {char.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={char.avatarUrl} alt={char.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-600 text-lg">
                      {char.name[0]}
                    </div>
                  )}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-white text-sm font-semibold truncate">{char.name}</p>
                  <p className="text-gray-500 text-xs">{char.franchise}</p>
                </div>
                <svg className="w-4 h-4 text-gray-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Coming Soon Note */}
      <div className="px-4 pt-6">
        <div className="rounded-xl bg-gray-900/40 border border-white/5 p-4 text-center">
          <p className="text-gray-500 text-xs">
            ショップ機能は順次拡充予定です。各キャラクターページのショップタブからもアクセスできます。
          </p>
        </div>
      </div>
    </div>
  );
}
