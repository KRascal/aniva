'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface CoinPackage {
  id: string;
  name: string;
  coinAmount: number;
  priceWebJpy: number;
}

const COIN_BONUSES: Record<string, number> = {
  スターター: 0,
  スタンダード: 100,
  プレミアム: 500,
};

const COIN_ICON = '🪙';

export default function PricingPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [packages, setPackages] = useState<CoinPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/coins/packages')
      .then((r) => r.json())
      .then((data: { packages?: CoinPackage[] }) => {
        setPackages(data.packages ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handlePurchase = async (packageId: string) => {
    if (!session) {
      router.push('/login?from=/pricing');
      return;
    }

    setPurchasing(packageId);
    setError(null);

    try {
      const res = await fetch('/api/coins/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageId,
          successUrl: `${window.location.origin}/coins?status=success`,
          cancelUrl: `${window.location.origin}/pricing`,
        }),
      });

      const data = await res.json() as { checkoutUrl?: string; balance?: number; error?: string };

      if (!res.ok) {
        throw new Error(data.error ?? '購入に失敗しました');
      }

      // Stripe Checkout へリダイレクト or デモモード（balance返却）
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else if (typeof data.balance === 'number') {
        // デモモード: そのままコインページへ
        router.push(`/coins?status=success&balance=${data.balance}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '購入に失敗しました');
      setPurchasing(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-950 to-black px-4 py-12">
      {/* ヘッダー */}
      <div className="text-center mb-12">
        <div className="text-4xl mb-3">{COIN_ICON}</div>
        <h1 className="text-3xl font-bold text-white mb-2">コインを購入</h1>
        <p className="text-gray-400 text-sm">
          コインでキャラとチャット・ファンクラブ入会・投げ銭ができます
        </p>
      </div>

      {/* コイン消費ガイド */}
      <div className="max-w-md mx-auto mb-8 bg-white/5 rounded-2xl p-4 border border-white/10">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">コインの使いみち</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-gray-300">
            <span>💬 チャット1回</span>
            <span className="text-purple-400">1コイン</span>
          </div>
          <div className="flex justify-between text-gray-300">
            <span>💝 ファンクラブ月会費</span>
            <span className="text-rose-400">500コイン/月</span>
          </div>
          <div className="flex justify-between text-gray-300">
            <span>🎁 投げ銭</span>
            <span className="text-yellow-400">10〜1,000コイン</span>
          </div>
        </div>
      </div>

      {/* パッケージ一覧 */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
        </div>
      ) : (
        <div className="max-w-md mx-auto space-y-4">
          {packages.map((pkg, i) => {
            const bonus = COIN_BONUSES[pkg.name] ?? 0;
            const totalCoins = pkg.coinAmount + bonus;
            const isPopular = i === 1;
            const isPurchasing = purchasing === pkg.id;

            return (
              <div
                key={pkg.id}
                className={`relative rounded-2xl border p-5 transition-all ${
                  isPopular
                    ? 'border-purple-500 bg-purple-500/10 shadow-lg shadow-purple-500/20'
                    : 'border-white/10 bg-white/5'
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                    人気 No.1
                  </div>
                )}

                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-white font-semibold text-lg">{pkg.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-2xl font-bold text-yellow-400">
                        {COIN_ICON} {totalCoins.toLocaleString()}
                      </span>
                      {bonus > 0 && (
                        <span className="text-xs bg-rose-500/20 text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded-full">
                          +{bonus}ボーナス
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-white font-bold text-xl">
                      ¥{pkg.priceWebJpy.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-400">
                      ¥{Math.round(pkg.priceWebJpy / totalCoins * 10) / 10}/コイン
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => void handlePurchase(pkg.id)}
                  disabled={!!purchasing}
                  className={`w-full py-3 rounded-xl font-semibold text-sm transition-all ${
                    isPopular
                      ? 'bg-purple-500 hover:bg-purple-400 text-white'
                      : 'bg-white/10 hover:bg-white/20 text-white'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isPurchasing ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      処理中...
                    </span>
                  ) : (
                    `${pkg.name}を購入`
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {error && (
        <div className="max-w-md mx-auto mt-4 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-400 text-center">
          {error}
        </div>
      )}

      {/* フッター */}
      <div className="text-center mt-12 text-xs text-gray-600 space-y-1">
        <p>コインは有効期限なし・払い戻し不可</p>
        <p>
          <a href="/terms" className="underline hover:text-gray-400">利用規約</a>
          {' / '}
          <a href="/privacy" className="underline hover:text-gray-400">プライバシーポリシー</a>
        </p>
      </div>
    </div>
  );
}
