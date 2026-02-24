'use client';

import { useState } from 'react';
import { PackageDisplayItem } from './page';

interface Props {
  packages: PackageDisplayItem[];
  currentBalance: number;
  status?: string;
}

export default function CoinsPageClient({ packages, currentBalance, status }: Props) {
  const [balance, setBalance] = useState(currentBalance);
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(
    status === 'success' ? '✅ 購入が完了しました！' : status === 'cancel' ? '❌ 購入がキャンセルされました' : null
  );

  const handlePurchase = async (pkg: PackageDisplayItem) => {
    setLoading(pkg.id);
    setMessage(null);
    try {
      const res = await fetch('/api/coins/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageId: pkg.id }),
      });
      const data = await res.json();

      if (!res.ok) {
        setMessage(`❌ エラー: ${data.error ?? '購入に失敗しました'}`);
        return;
      }

      // デモモード: 残高即時反映
      if (data.success && data.balance !== undefined) {
        setBalance(data.balance);
        setMessage(`✅ ${pkg.coinAmount.toLocaleString()}コインを付与しました！（デモモード）`);
        return;
      }

      // 本番: Stripe Checkoutへリダイレクト
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    } catch {
      setMessage('❌ 通信エラーが発生しました');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* ヘッダー */}
      <div className="bg-gradient-to-b from-purple-950/60 to-gray-950 pb-8 pt-12">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <div className="text-5xl mb-3">🪙</div>
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            コインを購入
          </h1>
          <p className="text-gray-400 text-sm mb-6">コインを使って音声通話・特別機能をお楽しみください</p>

          {/* 現在の残高 */}
          <div className="inline-flex items-center gap-2 bg-gray-800/80 border border-gray-700/60 rounded-full px-5 py-2.5">
            <span className="text-yellow-400 text-lg">🪙</span>
            <span className="text-gray-400 text-sm">現在の残高</span>
            <span className="text-white font-bold text-lg">{balance.toLocaleString()}</span>
            <span className="text-gray-400 text-sm">コイン</span>
          </div>
        </div>
      </div>

      {/* メッセージ */}
      {message && (
        <div className="max-w-2xl mx-auto px-4 mb-4">
          <div className={`rounded-lg px-4 py-3 text-sm text-center ${
            message.startsWith('✅')
              ? 'bg-green-900/40 border border-green-700/50 text-green-300'
              : 'bg-red-900/40 border border-red-700/50 text-red-300'
          }`}>
            {message}
          </div>
        </div>
      )}

      {/* パッケージ一覧 */}
      <div className="max-w-2xl mx-auto px-4 pb-16">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              className={`relative rounded-2xl border p-5 flex flex-col gap-4 transition-all ${
                pkg.popular
                  ? 'bg-gradient-to-b from-purple-900/50 to-gray-900 border-purple-500/60 shadow-lg shadow-purple-900/20'
                  : 'bg-gray-900 border-gray-700/50 hover:border-gray-600/70'
              }`}
            >
              {/* 人気バッジ */}
              {pkg.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow">
                    🏆 人気No.1
                  </span>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-lg font-bold text-white">{pkg.name}</span>
                  {pkg.bonus > 0 && (
                    <span className="text-xs bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-2 py-0.5 rounded-full font-semibold">
                      +{pkg.bonus}%ボーナス
                    </span>
                  )}
                </div>

                <div className="flex items-baseline gap-1.5 mt-2">
                  <span className="text-yellow-400 text-sm">🪙</span>
                  <span className="text-2xl font-bold text-white">{pkg.coinAmount.toLocaleString()}</span>
                  <span className="text-gray-400 text-sm">コイン</span>
                </div>

                <div className="text-gray-500 text-xs mt-1.5">
                  📞 通話約{pkg.callMinutes}分分
                </div>
              </div>

              <button
                onClick={() => handlePurchase(pkg)}
                disabled={loading !== null}
                className={`w-full py-2.5 rounded-xl font-semibold text-sm transition-all ${
                  pkg.popular
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow'
                    : 'bg-gray-700 hover:bg-gray-600 text-white'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {loading === pkg.id ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    処理中...
                  </span>
                ) : (
                  `¥${pkg.priceWebJpy.toLocaleString()} で購入`
                )}
              </button>
            </div>
          ))}
        </div>

        <p className="text-center text-gray-600 text-xs mt-8">
          ※ 購入したコインに有効期限はありません。返金・換金はできません。
        </p>
      </div>
    </div>
  );
}
