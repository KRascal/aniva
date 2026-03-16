'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShopItemCard } from '@/components/shop/ShopItemCard';
import { PurchaseModal } from '@/components/shop/PurchaseModal';

interface ShopItem {
  id: string;
  name: string;
  description?: string | null;
  type: string;
  priceCoins: number;
  imageUrl?: string | null;
  fileUrl?: string | null;
  isPurchased?: boolean;
  character?: { id: string; name: string; slug: string; avatarUrl: string | null };
}

interface ShopTabProps {
  characterId: string;
  characterSlug?: string;
}

export function ShopTab({ characterId, characterSlug }: ShopTabProps) {
  const router = useRouter();
  const [items, setItems] = useState<ShopItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<ShopItem | null>(null);
  const [userBalance, setUserBalance] = useState(0);

  const slug = characterSlug || characterId;

  useEffect(() => {
    fetch('/api/coins/balance')
      .then((r) => r.json())
      .then((d) => setUserBalance(d.balance ?? 0))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/shop/items?characterId=${characterId}&limit=6`)
      .then((r) => r.json())
      .then((d) => setItems(d.items ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [characterId]);

  const handlePurchaseComplete = () => {
    setSelectedItem(null);
    fetch(`/api/shop/items?characterId=${characterId}&limit=6`)
      .then((r) => r.json())
      .then((d) => setItems(d.items ?? []))
      .catch(() => {});
    fetch('/api/coins/balance')
      .then((r) => r.json())
      .then((d) => setUserBalance(d.balance ?? 0))
      .catch(() => {});
  };

  return (
    <div className="space-y-4 pt-2 pb-24">
      {/* ヘッダーバナー */}
      <div className="rounded-2xl overflow-hidden border border-amber-700/30 bg-gradient-to-br from-amber-900/30 to-orange-900/20 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-800/50 flex items-center justify-center border border-amber-700/30">
              <svg className="w-5 h-5 text-amber-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007z" />
              </svg>
            </div>
            <div>
              <h2 className="text-white font-bold text-base">キャラ限定ショップ</h2>
              <p className="text-amber-300/70 text-xs">コインでデジタルコンテンツを購入</p>
            </div>
          </div>
          <button
            onClick={() => router.push(`/shop/${slug}`)}
            className="text-xs text-amber-300 hover:text-amber-200 px-3 py-1.5 rounded-full border border-amber-600/30 hover:border-amber-500/40 bg-amber-900/30 hover:bg-amber-900/50 transition-all"
          >
            すべて見る →
          </button>
        </div>
      </div>

      {/* 商品プレビュー */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="py-12 flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gray-900 border border-white/5 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007z" />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-white/60 text-sm font-semibold mb-1">近日公開</p>
            <p className="text-white/30 text-xs">限定コンテンツを準備中です</p>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            {items.map((item) => (
              <ShopItemCard key={item.id} item={item} onPurchase={setSelectedItem} />
            ))}
          </div>

          {/* もっと見るリンク */}
          {items.length >= 6 && (
            <button
              onClick={() => router.push(`/shop/${slug}`)}
              className="w-full py-3 rounded-2xl bg-white/5 text-white/40 text-sm font-medium hover:bg-white/8 hover:text-white/60 transition-all border border-white/5"
            >
              もっと見る
            </button>
          )}
        </>
      )}

      <PurchaseModal
        item={selectedItem}
        userBalance={userBalance}
        onClose={handlePurchaseComplete}
      />
    </div>
  );
}
