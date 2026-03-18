'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
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

export default function CharacterShopPage() {
  const { status } = useSession();
  const router = useRouter();
  const params = useParams();
  const characterSlug = params.characterSlug as string;

  const [items, setItems] = useState<ShopItem[]>([]);
  const [charName, setCharName] = useState('');
  const [charAvatar, setCharAvatar] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<ShopItem | null>(null);
  const [userBalance, setUserBalance] = useState(0);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status, router]);

  useEffect(() => {
    fetch('/api/coins/balance')
      .then((r) => r.json())
      .then((d) => setUserBalance(d.balance ?? 0))
      .catch(() => {});
  }, []);

  const fetchItems = useCallback(async () => {
    if (!characterSlug) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/shop/items?characterId=${characterSlug}&limit=40`);
      const data = await res.json();
      setItems(data.items ?? []);
      if (data.items?.[0]?.character) {
        setCharName(data.items[0].character.name);
        setCharAvatar(data.items[0].character.avatarUrl);
      }
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [characterSlug]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // Also fetch character info separately
  useEffect(() => {
    if (!characterSlug) return;
    fetch(`/api/characters/${characterSlug}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.character) {
          setCharName(d.character.name);
          setCharAvatar(d.character.avatarUrl);
        }
      })
      .catch(() => {});
  }, [characterSlug]);

  const handlePurchaseComplete = () => {
    setSelectedItem(null);
    fetchItems();
    fetch('/api/coins/balance')
      .then((r) => r.json())
      .then((d) => setUserBalance(d.balance ?? 0))
      .catch(() => {});
  };

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
          <div className="flex items-center gap-2">
            {charAvatar && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={charAvatar} alt="" className="w-7 h-7 rounded-lg object-cover" />
            )}
            <div>
              <h1 className="text-base font-bold leading-tight">{charName || characterSlug} ショップ</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="px-4 pt-4">
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
            <p className="text-white/40 text-sm font-medium">まだ商品がありません</p>
            <p className="text-white/20 text-xs mt-1">このキャラの限定コンテンツを準備中です</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {items.map((item) => (
              <ShopItemCard
                key={item.id}
                item={item}
                onPurchase={(item) => setSelectedItem(item as ShopItem)}
              />
            ))}
          </div>
        )}
      </div>

      <PurchaseModal
        item={selectedItem}
        userBalance={userBalance}
        onClose={handlePurchaseComplete}
      />
    </div>
  );
}
