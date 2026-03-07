'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { playSound } from '@/lib/sound-effects';
import { PackageDisplayItem } from './page';

interface Props {
  packages: PackageDisplayItem[];
  currentBalance: number;
  freeBalance?: number;
  paidBalance?: number;
  status?: string;
}

export default function CoinsPageClient({ packages, currentBalance, freeBalance = 0, paidBalance = 0, status }: Props) {
  const [balance, setBalance] = useState(currentBalance);
  const [freeCoins, setFreeCoins] = useState(freeBalance);
  const [paidCoins, setPaidCoins] = useState(paidBalance);
  const [loading, setLoading] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(status === 'success');
  const [message, setMessage] = useState<string | null>(
    status === 'success' ? '購入が完了しました！' : status === 'cancel' ? '購入がキャンセルされました' : null
  );
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 紙吹雪パーティクル
  const spawnConfetti = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const colors = ['#FFD700', '#FF6B9D', '#8B5CF6', '#06B6D4', '#10B981', '#F59E0B', '#EF4444'];
    const particles: { x: number; y: number; vx: number; vy: number; w: number; h: number; rot: number; rotV: number; color: string; alpha: number }[] = [];
    for (let i = 0; i < 120; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: -20 - Math.random() * 200,
        vx: (Math.random() - 0.5) * 4,
        vy: Math.random() * 3 + 2,
        w: Math.random() * 8 + 4,
        h: Math.random() * 12 + 6,
        rot: Math.random() * 360,
        rotV: (Math.random() - 0.5) * 10,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
      });
    }
    let frame = 0;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;
      for (const p of particles) {
        p.x += p.vx; p.y += p.vy; p.vy += 0.05; p.rot += p.rotV;
        if (frame > 60) p.alpha -= 0.008;
        if (p.alpha <= 0 || p.y > canvas.height + 50) continue;
        alive = true;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rot * Math.PI) / 180);
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
      frame++;
      if (alive) requestAnimationFrame(animate);
      else ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
    requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    if (showCelebration) {
      playSound('coin_earn');
      setTimeout(() => spawnConfetti(), 200);
      setTimeout(() => setShowCelebration(false), 4000);
    }
  }, [showCelebration, spawnConfetti]);

  // Stripe復帰時に残高をリフレッシュ（Webhook処理後の最新残高を取得）
  useEffect(() => {
    if (status === 'success') {
      const refreshBalance = async () => {
        try {
          const res = await fetch('/api/coins/balance');
          if (res.ok) {
            const data = await res.json();
            if (data.balance !== undefined) setBalance(data.balance);
            if (data.freeBalance !== undefined) setFreeCoins(data.freeBalance);
            if (data.paidBalance !== undefined) setPaidCoins(data.paidBalance);
          }
        } catch { /* ignore */ }
      };
      // 少し遅延（Webhook処理を待つ）
      setTimeout(refreshBalance, 1500);
      setTimeout(refreshBalance, 5000);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        setMessage(`エラー: ${data.error ?? '購入に失敗しました'}`);
        return;
      }

      // デモモード: 残高即時反映
      if (data.success && data.balance !== undefined) {
        setBalance(data.balance);
        setPaidCoins(prev => prev + pkg.coinAmount);
        setMessage(`${pkg.coinAmount.toLocaleString()}コインを付与しました`);
        setShowCelebration(true);
        return;
      }

      // 本番: Stripe Checkoutへリダイレクト
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    } catch {
      setMessage('通信エラーが発生しました');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white relative">
      {/* 紙吹雪Canvas */}
      <canvas ref={canvasRef} className="fixed inset-0 z-[100] pointer-events-none" />

      {/* 購入成功オーバーレイ */}
      {showCelebration && (
        <div className="fixed inset-0 z-[99] flex items-center justify-center pointer-events-none">
          <div className="text-center animate-bounce">
            <div className="text-6xl mb-2">🎉</div>
            <p className="text-2xl font-black text-yellow-300 drop-shadow-lg">購入完了！</p>
          </div>
        </div>
      )}

      {/* 戻るボタン */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-gray-950 border-b border-white/5">
        <div className="max-w-2xl mx-auto px-4 h-12 flex items-center">
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors text-sm"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            戻る
          </button>
        </div>
      </div>
      {/* ヘッダー */}
      <div className="bg-gradient-to-b from-purple-950/60 to-gray-950 pb-8 pt-16">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-gradient-to-br from-yellow-500/30 to-yellow-600/20 border border-yellow-500/30 flex items-center justify-center">
            <svg className="w-7 h-7 text-yellow-400" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z"/>
            </svg>
          </div>
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            コインを購入
          </h1>
          <p className="text-gray-400 text-sm mb-6">コインを使って音声通話・特別機能をお楽しみください</p>

          {/* 現在の残高 */}
          <div className="inline-block bg-gray-800/80 border border-gray-700/60 rounded-2xl px-5 py-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-4 h-4 rounded-full bg-yellow-500/40 border border-yellow-500/60" />
              <span className="text-gray-400 text-sm">合計残高</span>
              <span className="text-white font-bold text-lg">{balance.toLocaleString()}</span>
              <span className="text-gray-400 text-sm">コイン</span>
            </div>
            {(freeCoins > 0 || paidCoins > 0) && (
              <div className="flex items-center justify-center gap-3 text-xs">
                <span className="flex items-center gap-1 text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                  無料 {freeCoins.toLocaleString()}
                </span>
                <span className="text-gray-600">|</span>
                <span className="flex items-center gap-1 text-yellow-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 inline-block" />
                  有料 {paidCoins.toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* メッセージ */}
      {message && (
        <div className="max-w-2xl mx-auto px-4 mb-4">
          <div className={`rounded-lg px-4 py-3 text-sm text-center ${
            message.includes('完了') || message.includes('付与')
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
                    人気 No.1
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
                  <span className="text-2xl font-bold text-yellow-400">{pkg.coinAmount.toLocaleString()}</span>
                  <span className="text-gray-400 text-sm">コイン</span>
                </div>

                <div className="text-gray-500 text-xs mt-1.5">
                  通話 約{pkg.callMinutes}分分
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
