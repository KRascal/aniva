'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';

const plans = [
  {
    name: 'Free',
    price: '¥0',
    period: '',
    features: ['1日3メッセージ', 'キャラプロフィール閲覧', 'Moments一部閲覧'],
    cta: '現在のプラン',
    highlighted: false,
    plan: 'FREE',
  },
  {
    name: 'Standard',
    price: '¥980',
    period: '/月',
    features: ['無制限チャット', 'ボイスメッセージ受信', '全Moments閲覧', 'AI画像受信', 'Live2D（動く立ち絵）'],
    cta: 'Standard に登録',
    highlighted: true,
    plan: 'STANDARD',
  },
  {
    name: 'Premium',
    price: '¥2,980',
    period: '/月',
    features: ['Standard全機能', '音声通話（月60分）', 'Live2D通話', '限定Moments', 'パーソナライズ動画', '優先応答'],
    cta: 'Premium に登録',
    highlighted: false,
    plan: 'PREMIUM',
  },
];

export default function PricingPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState<string | null>(null);

  const handleSubscribe = async (plan: string) => {
    if (!session?.user) {
      window.location.href = '/login';
      return;
    }
    
    setLoading(plan);
    try {
      const res = await fetch('/api/subscription/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: (session.user as any).id,
          plan,
          priceId: 'placeholder', // Will be set after Stripe product setup
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Subscribe error:', error);
    }
    setLoading(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 py-16 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-3">推しとの関係を深めよう</h1>
          <p className="text-gray-400 text-lg">あなたに合ったプランを選んでください</p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((p) => (
            <div
              key={p.name}
              className={`rounded-2xl p-6 border ${
                p.highlighted
                  ? 'bg-purple-900/40 border-purple-500 ring-2 ring-purple-500'
                  : 'bg-gray-800/40 border-gray-700'
              }`}
            >
              {p.highlighted && (
                <div className="text-center mb-2">
                  <span className="bg-purple-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                    人気 No.1
                  </span>
                </div>
              )}
              <h2 className="text-2xl font-bold text-white text-center">{p.name}</h2>
              <div className="text-center my-4">
                <span className="text-4xl font-bold text-white">{p.price}</span>
                <span className="text-gray-400">{p.period}</span>
              </div>
              <ul className="space-y-3 mb-6">
                {p.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-gray-300">
                    <span className="text-purple-400">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => p.plan !== 'FREE' && handleSubscribe(p.plan)}
                disabled={p.plan === 'FREE' || loading === p.plan}
                className={`w-full py-3 rounded-xl font-medium transition-all ${
                  p.highlighted
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700'
                    : p.plan === 'FREE'
                    ? 'bg-gray-700 text-gray-400 cursor-default'
                    : 'bg-gray-700 text-white hover:bg-gray-600'
                }`}
              >
                {loading === p.plan ? '処理中...' : p.cta}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
