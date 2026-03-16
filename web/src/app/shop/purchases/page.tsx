'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface Purchase {
  id: string;
  totalCoins: number | null;
  createdAt: string;
  item: {
    id: string;
    name: string;
    type: string;
    imageUrl: string | null;
    fileUrl: string | null;
    character: { name: string; slug: string };
  };
}

export default function PurchasesPage() {
  const { status } = useSession();
  const router = useRouter();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status, router]);

  useEffect(() => {
    fetch('/api/shop/purchases')
      .then((r) => r.json())
      .then((d) => setPurchases(d.purchases ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pb-24">
      <div className="sticky top-0 z-10 bg-[#0a0a0a]/95 backdrop-blur-sm border-b border-white/5">
        <div className="px-4 py-4 flex items-center gap-3">
          <button onClick={() => router.back()} className="text-white/60 hover:text-white">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <h1 className="text-lg font-bold">購入履歴</h1>
        </div>
      </div>

      <div className="px-4 pt-4">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
          </div>
        ) : purchases.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-gray-900 border border-white/5 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.75 7.5h16.5" />
              </svg>
            </div>
            <p className="text-white/40 text-sm font-medium">まだ購入したものはありません</p>
            <button
              onClick={() => router.push('/shop')}
              className="mt-4 px-5 py-2 bg-amber-700/60 text-amber-200 text-sm font-medium rounded-full border border-amber-600/30 hover:bg-amber-700/80 transition-all"
            >
              ショップを見る
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {purchases.map((p) => (
              <div key={p.id} className="flex items-center gap-3 p-3 rounded-2xl bg-[#111] border border-white/5">
                <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-900 flex-shrink-0">
                  {p.item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.item.imageUrl} alt={p.item.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-700">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007z" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-semibold truncate">{p.item.name}</p>
                  <p className="text-gray-500 text-xs">{p.item.character.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-amber-400 text-xs font-medium">{p.totalCoins?.toLocaleString() ?? '-'} コイン</span>
                    <span className="text-gray-600 text-xs">{new Date(p.createdAt).toLocaleDateString('ja-JP')}</span>
                  </div>
                </div>
                {p.item.fileUrl && (
                  <a
                    href={p.item.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-shrink-0 px-3 py-1.5 bg-green-900/40 text-green-400 text-xs font-medium rounded-lg border border-green-700/30 hover:bg-green-900/60 transition-colors"
                  >
                    DL
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
