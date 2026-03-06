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

interface MonthlyPass {
  id: string;
  name: string;
  priceJpy: number;
  dailyCoins: number;
  badge: string | null;
  priorityResponse: boolean;
  popular?: boolean;
  priceId: string;
}

const MONTHLY_PASSES: MonthlyPass[] = [
  {
    id: 'light',
    name: 'ライトパス',
    priceJpy: 500,
    dailyCoins: 50,
    badge: null,
    priorityResponse: false,
    priceId: 'price_light_monthly',
  },
  {
    id: 'standard',
    name: 'スタンダードパス',
    priceJpy: 1500,
    dailyCoins: 200,
    badge: '⭐ スタンダードバッジ',
    priorityResponse: false,
    popular: true,
    priceId: 'price_standard_monthly',
  },
  {
    id: 'premium',
    name: 'プレミアムパス',
    priceJpy: 3000,
    dailyCoins: 500,
    badge: '👑 プレミアムバッジ',
    priorityResponse: true,
    priceId: 'price_premium_monthly',
  },
];

const COIN_BONUSES: Record<string, number> = {
  スターター: 0,
  スタンダード: 100,
  プレミアム: 500,
};

export default function PricingPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [packages, setPackages] = useState<CoinPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fcPrice, setFcPrice] = useState(500);
  const [characterName, setCharacterName] = useState<string | null>(null);
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [subError, setSubError] = useState<string | null>(null);

  // キャラ別FC価格取得
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const charId = params.get('character');
    if (charId) {
      fetch(`/api/characters/id/${charId}`)
        .then(r => r.json())
        .then(data => {
          if (data.fcMonthlyCoins) setFcPrice(data.fcMonthlyCoins);
          if (data.name) setCharacterName(data.name);
        })
        .catch(() => {});
    }
  }, []);

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
      if (!res.ok) throw new Error(data.error ?? '購入に失敗しました');
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else if (typeof data.balance === 'number') {
        router.push(`/coins?status=success&balance=${data.balance}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '購入に失敗しました');
      setPurchasing(null);
    }
  };

  const handleSubscribe = async (pass: MonthlyPass) => {
    if (!session) {
      router.push('/login?from=/pricing');
      return;
    }
    setSubscribing(pass.id);
    setSubError(null);
    try {
      const res = await fetch('/api/subscription/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: (session.user as { id?: string }).id,
          plan: pass.id,
          priceId: pass.priceId,
          successUrl: `${window.location.origin}/coins?status=subscribed&plan=${pass.id}`,
          cancelUrl: `${window.location.origin}/pricing`,
        }),
      });
      const data = await res.json() as { checkoutUrl?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? '購入に失敗しました');
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    } catch (err) {
      setSubError(err instanceof Error ? err.message : '購入に失敗しました');
      setSubscribing(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-950 to-black px-4 py-12">

      {/* ── ファンクラブ案内セクション ── */}
      <div className="max-w-md mx-auto mb-12">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">コイン購入</h1>
          <p className="text-gray-400 text-sm">コインでチャット・ファンクラブ・投げ銭を楽しもう</p>
        </div>

        {/* ファンクラブカード */}
        <div className="relative rounded-2xl overflow-hidden border border-purple-500/40 bg-gradient-to-br from-purple-900/30 to-pink-900/20 shadow-lg shadow-purple-900/30 mb-4">
          {/* おすすめバッジ */}
          <div className="absolute top-0 right-0 bg-gradient-to-l from-purple-600 to-pink-600 text-white text-xs font-bold px-4 py-1.5 rounded-bl-xl">
            おすすめ
          </div>

          <div className="px-6 pt-6 pb-5">
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-1">
                {/* Crown SVG */}
                <svg className="w-5 h-5 text-yellow-400" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm2 3a1 1 0 001 1h8a1 1 0 001-1v-1H7v1z"/>
                </svg>
                <h2 className="text-xl font-bold text-white">ファンクラブ</h2>
              </div>
              <p className="text-gray-400 text-sm">キャラとの特別な絆を深めよう</p>
            </div>

            {/* 特典一覧 */}
            <div className="space-y-3 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <div>
                  <p className="text-white text-sm font-medium">無制限チャット</p>
                  <p className="text-gray-500 text-xs">毎日何度でもトーク可能</p>
                </div>
                <svg className="w-4 h-4 text-green-400 ml-auto flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-pink-500/20 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-white text-sm font-medium">限定ダイレクトメッセージ</p>
                  <p className="text-gray-500 text-xs">FCメンバーだけの特別な会話</p>
                </div>
                <svg className="w-4 h-4 text-green-400 ml-auto flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                </div>
                <div>
                  <p className="text-white text-sm font-medium">FCメンバーバッジ</p>
                  <p className="text-gray-500 text-xs">プロフィールに表示される限定バッジ</p>
                </div>
                <svg className="w-4 h-4 text-green-400 ml-auto flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div>
                  <p className="text-white text-sm font-medium">限定コンテンツ</p>
                  <p className="text-gray-500 text-xs">FCメンバー専用ボイス・投稿</p>
                </div>
                <svg className="w-4 h-4 text-green-400 ml-auto flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>

            {/* 価格 */}
            <div className="flex items-baseline gap-1 mb-4">
              <span className="text-3xl font-bold text-white">{fcPrice}</span>
              <span className="text-gray-400 text-sm">コイン</span>
              <span className="text-gray-600 text-xs ml-1">/ 月</span>
            </div>

            <a
              href="/chat"
              className="block w-full py-3 text-center rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-sm hover:opacity-90 transition-opacity"
            >
              キャラを選んで加入する
            </a>
          </div>
        </div>
      </div>

      {/* ── 月額パスセクション ── */}
      <div className="max-w-md mx-auto mb-12">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-white mb-1">月額パス</h2>
          <p className="text-gray-400 text-sm">毎日ログインで自動付与！コインが貯まり続ける</p>
          <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 rounded-full"
            style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)' }}>
            <span className="text-yellow-400 text-xs font-bold">🪙 毎日ログインで○コインもらえる！</span>
          </div>
        </div>

        <div className="space-y-4">
          {MONTHLY_PASSES.map((pass) => {
            const isSubscribing = subscribing === pass.id;
            const isPopular = pass.popular === true;

            return (
              <div
                key={pass.id}
                className="relative rounded-2xl overflow-hidden border p-5"
                style={{
                  borderColor: isPopular ? 'rgba(139,92,246,0.6)' : 'rgba(255,255,255,0.1)',
                  background: isPopular
                    ? 'linear-gradient(135deg, rgba(88,28,135,0.25), rgba(157,23,77,0.2))'
                    : 'rgba(255,255,255,0.04)',
                  boxShadow: isPopular ? '0 4px 24px rgba(139,92,246,0.25)' : 'none',
                }}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-white text-xs font-bold px-3 py-1 rounded-full"
                    style={{ background: 'linear-gradient(135deg, #8b5cf6, #ec4899)' }}>
                    🌟 おすすめ
                  </div>
                )}

                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-white font-bold text-lg">{pass.name}</h3>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-yellow-400 font-bold text-xl">
                        毎日 {pass.dailyCoins} コイン
                      </span>
                    </div>
                    <p className="text-gray-400 text-xs mt-1">毎日ログインで自動付与</p>
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    <div className="text-white font-bold text-2xl">
                      ¥{pass.priceJpy.toLocaleString()}
                    </div>
                    <div className="text-gray-500 text-xs">/ 月</div>
                  </div>
                </div>

                {/* 特典一覧 */}
                <div className="space-y-1.5 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                    <svg className="w-3.5 h-3.5 text-green-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>毎日 {pass.dailyCoins} コイン自動付与</span>
                  </div>
                  {pass.badge && (
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                      <svg className="w-3.5 h-3.5 text-green-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-purple-300 font-medium">{pass.badge}</span>
                    </div>
                  )}
                  {pass.priorityResponse && (
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                      <svg className="w-3.5 h-3.5 text-green-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-yellow-300 font-medium">⚡ 優先応答（返信速度UP）</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                    <span>月 {pass.dailyCoins * 30} コイン相当（¥{Math.round(pass.priceJpy / (pass.dailyCoins * 30) * 10) / 10}/コイン）</span>
                  </div>
                </div>

                <button
                  onClick={() => void handleSubscribe(pass)}
                  disabled={!!subscribing}
                  className="w-full py-3 rounded-xl font-semibold text-sm text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={isPopular ? {
                    background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
                    boxShadow: '0 4px 16px rgba(139,92,246,0.4)',
                  } : {
                    background: 'rgba(255,255,255,0.1)',
                  }}
                >
                  {isSubscribing ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      処理中...
                    </span>
                  ) : (
                    `${pass.name}に加入する`
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {subError && (
          <div className="mt-4 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-400 text-center">
            {subError}
          </div>
        )}

        <p className="text-center text-xs text-gray-600 mt-4">
          月額パスはいつでもキャンセル可能。次回請求日の前日まで有効。
        </p>
      </div>

      {/* ── コイン購入セクション ── */}
      <div className="max-w-md mx-auto">
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-white mb-1">コインを購入</h2>
          <p className="text-gray-500 text-xs">コインはチャット・ファンクラブ・投げ銭に使えます</p>
        </div>

        {/* コイン消費ガイド */}
        <div className="bg-white/5 rounded-2xl p-4 border border-white/10 mb-6">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">コインの使いみち</h3>
          <div className="space-y-2.5 text-sm">
            <div className="flex items-center justify-between text-gray-300">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-purple-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <span>チャット1回</span>
              </div>
              <span className="text-purple-400 font-medium">1コイン</span>
            </div>
            <div className="flex items-center justify-between text-gray-300">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-rose-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                <span>ファンクラブ月会費</span>
              </div>
              <span className="text-rose-400 font-medium">500コイン/月</span>
            </div>
            <div className="flex items-center justify-between text-gray-300">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-yellow-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                </svg>
                <span>投げ銭</span>
              </div>
              <span className="text-yellow-400 font-medium">10〜1,000コイン</span>
            </div>
          </div>
        </div>

        {/* パッケージ一覧 */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            {packages.map((pkg, i) => {
              const bonus = COIN_BONUSES[pkg.name] ?? 0;
              const totalCoins = pkg.coinAmount + bonus;
              const isPopular = i === 2;
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
                      🎉 最もお得！
                    </div>
                  )}

                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-white font-semibold text-lg">{pkg.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-2xl font-bold text-yellow-400">
                          {totalCoins.toLocaleString()} コイン
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
          <div className="mt-4 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-400 text-center">
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
    </div>
  );
}
