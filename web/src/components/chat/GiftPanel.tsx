'use client';

import { useState, useEffect } from 'react';

interface GiftType {
  id: string;
  name: string;
  emoji: string;
  coinCost: number;
  xpReward: number;
}

interface GiftPanelProps {
  characterId: string;
  characterName: string;
  isOpen: boolean;
  onClose: () => void;
  onGiftSent: (reaction: string, giftEmoji: string) => void;
}

export function GiftPanel({ characterId, characterName, isOpen, onClose, onGiftSent }: GiftPanelProps) {
  const [gifts, setGifts] = useState<GiftType[]>([]);
  const [balance, setBalance] = useState<number>(0);
  const [sending, setSending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      // ギフト一覧取得
      fetch('/api/gift/send').then(r => r.json()).then(d => setGifts(d.gifts || [])).catch(() => {});
      // コイン残高取得
      fetch('/api/coins/balance').then(r => r.json()).then(d => setBalance(d.balance ?? 0)).catch(() => {});
    }
  }, [isOpen]);

  const sendGift = async (gift: GiftType) => {
    if (sending) return;
    if (balance < gift.coinCost) {
      setError('コインが足りません 😢');
      setTimeout(() => setError(null), 2000);
      return;
    }

    setSending(gift.id);
    try {
      const res = await fetch('/api/gift/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterId, giftType: gift.id }),
      });
      const data = await res.json();
      if (data.success) {
        setBalance(data.newBalance);
        onGiftSent(data.reaction, gift.emoji);
        onClose();
      } else {
        setError(data.error || '送信に失敗しました');
        setTimeout(() => setError(null), 2000);
      }
    } catch {
      setError('送信に失敗しました');
      setTimeout(() => setError(null), 2000);
    } finally {
      setSending(null);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <style>{`
        @keyframes giftSlideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .gift-slide { animation: giftSlideUp 0.3s cubic-bezier(0.22,1,0.36,1); }
      `}</style>
      {/* バックドロップ */}
      <div className="absolute inset-0 bg-black/40 z-30" onClick={onClose} />
      {/* パネル */}
      <div className="absolute bottom-0 left-0 right-0 z-40 gift-slide">
        <div className="bg-gray-900/95 backdrop-blur-lg border-t border-purple-500/20 rounded-t-3xl px-4 pt-4 pb-6">
          {/* ハンドル */}
          <div className="flex justify-center mb-3">
            <div className="w-10 h-1 bg-gray-700 rounded-full" />
          </div>

          {/* ヘッダー */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-bold text-sm">
              🎁 {characterName}にプレゼント
            </h3>
            <div className="flex items-center gap-1.5 bg-yellow-900/30 px-3 py-1 rounded-full border border-yellow-600/30">
              <span className="text-sm">🪙</span>
              <span className="text-yellow-300 text-sm font-bold">{balance.toLocaleString()}</span>
            </div>
          </div>

          {/* エラー */}
          {error && (
            <div className="text-center text-red-400 text-sm mb-3 bg-red-900/20 rounded-xl py-2">
              {error}
            </div>
          )}

          {/* ギフトグリッド */}
          <div className="grid grid-cols-3 gap-3">
            {gifts.map((gift) => {
              const canAfford = balance >= gift.coinCost;
              const isSending = sending === gift.id;
              return (
                <button
                  key={gift.id}
                  onClick={() => sendGift(gift)}
                  disabled={!canAfford || !!sending}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border transition-all active:scale-[0.95] ${
                    canAfford
                      ? 'bg-gray-800/80 border-white/10 hover:border-purple-500/40 hover:bg-purple-900/20'
                      : 'bg-gray-900/50 border-gray-800/50 opacity-40'
                  } ${isSending ? 'animate-pulse' : ''}`}
                >
                  <span className="text-3xl">{gift.emoji}</span>
                  <span className="text-white text-xs font-semibold">{gift.name}</span>
                  <div className="flex items-center gap-0.5">
                    <span className="text-[10px]">🪙</span>
                    <span className={`text-[11px] font-bold ${canAfford ? 'text-yellow-300' : 'text-gray-600'}`}>
                      {gift.coinCost}
                    </span>
                  </div>
                  <span className="text-[9px] text-purple-400/70">+{gift.xpReward}XP</span>
                </button>
              );
            })}
          </div>

          {/* コイン購入リンク */}
          <div className="mt-4 text-center">
            <a href="/coins" className="text-purple-400 text-xs hover:text-purple-300 transition-colors">
              🪙 コインを購入する →
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
