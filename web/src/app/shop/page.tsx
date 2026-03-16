'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
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

const CATEGORIES = [
  { id: 'all', label: 'すべて' },
  { id: 'digital_wallpaper', label: '壁紙' },
  { id: 'digital_voice', label: 'ボイス' },
  { id: 'digital_art', label: 'アート' },
  { id: 'digital_goods', label: 'グッズ' },
];

export default function ShopPage() {
  const { status } = useSession();
  const router = useRouter();
  const [items, setItems] = useState<ShopItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('all');
  const [selectedItem, setSelectedItem] = useState<ShopItem | null>(null);
  const [userBalance, setUserBalance] = useState(0);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status, router]);

  // Fetch balance
  useEffect(() => {
    fetch('/api/coins/balance')
      .then((r) => r.json())
      .then((d) => setUserBalance(d.balance ?? 0))
      .catch(() => {});
  }, []);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '40' });
      if (category !== 'all') params.set('type', category);
      const res = await fetch(`/api/shop/items?${params}`);
      const data = await res.json();
      setItems(data.items ?? []);
      setTotal(data.total ?? 0);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handlePurchaseComplete = () => {
    setSelectedItem(null);
    fetchItems();
    // Re-fetch balance
    fetch('/api/coins/balance')
      .then((r) => r.json())
      .then((d) => setUserBalance(d.balance ?? 0))
      .catch(() => {});
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#0a0a0a]/95 backdrop-blur-sm border-b border-white/5">
        <div className="px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="text-white/60 hover:text-white">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <h1 className="text-lg font-bold">ショップ</h1>
          </div>
          <button
            onClick={() => router.push('/shop/purchases')}
            className="text-xs text-gray-400 hover:text-white transition-colors px-3 py-1.5 rounded-full border border-white/10 hover:border-white/20"
          >
            購入履歴
          </button>
        </div>
      </div>

      {/* Hero Banner */}
      <div className="px-4 pt-4 pb-2">
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-amber-900/40 via-orange-900/30 to-purple-900/20 border border-amber-700/20 p-6">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl" />
          <div className="relative z-10">
            <h2 className="text-white font-black text-2xl tracking-tight">限定コンテンツ</h2>
            <p className="text-white/60 text-sm mt-1">推しキャラの特別なデジタルアイテムをコインで手に入れよう</p>
            <div className="flex items-center gap-2 mt-3">
              <div className="flex items-center gap-1 bg-black/30 rounded-full px-3 py-1">
                <svg className="w-3.5 h-3.5 text-amber-400" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="12" r="10" />
                </svg>
                <span className="text-amber-300 text-sm font-bold">{userBalance.toLocaleString()}</span>
                <span className="text-gray-400 text-xs">コイン</span>
              </div>
              <span className="text-gray-600 text-xs">{total}件の商品</span>
            </div>
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="px-4 pt-3 pb-1">
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                category === cat.id
                  ? 'bg-white text-black'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-white/5'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Items Grid */}
      <div className="px-4 pt-3">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-gray-900 border border-white/5 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007z" />
              </svg>
            </div>
            <p className="text-white/40 text-sm font-medium">商品がまだありません</p>
            <p className="text-white/20 text-xs mt-1">新しいコンテンツが追加されるのをお楽しみに</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {items.map((item) => (
              <ShopItemCard
                key={item.id}
                item={item}
                onPurchase={setSelectedItem}
              />
            ))}
          </div>
        )}
      </div>

      {/* Purchase Modal */}
      <PurchaseModal
        item={selectedItem}
        userBalance={userBalance}
        onClose={handlePurchaseComplete}
      />
    </div>
  );
}
