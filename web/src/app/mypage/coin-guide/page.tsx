'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

// デフォルト値（APIからの動的取得でオーバーライド）
const DEFAULT_RATES = {
  chat: 10,
  image: 15,
  deepReply: 20,
  groupChatPerChar: 10,
  gachaSingle: 100,
  gachaTen: 900,
};

const COIN_EARNS = [
  { label: 'ログインボーナス', amount: '10〜50コイン', note: '毎日ログインで獲得。連続日数で増加' },
  { label: 'デイリーミッション', amount: '最大100コイン/日', note: 'チャット・ガチャ・探索など日替わりタスク' },
  { label: '週チャレンジ', amount: '最大500コイン/週', note: '週間目標を達成でまとめて獲得' },
  { label: '称号・実績解除', amount: '50〜200コイン', note: '初回クリアで報酬コインをゲット' },
  { label: '月間ログイン達成', amount: '500コイン', note: '月15日以上ログインで獲得' },
];

export default function CoinGuidePage() {
  const router = useRouter();
  const [rates, setRates] = useState(DEFAULT_RATES);

  useEffect(() => {
    fetch('/api/settings/coin-rates')
      .then(r => r.json())
      .then(d => { if (d.rates) setRates(prev => ({ ...prev, ...d.rates })); })
      .catch(() => {});
  }, []);

  const COIN_SPENDS = [
    { label: 'チャット送信', cost: `${rates.chat}コイン / 回`, note: '1on1チャット1通ごと' },
    { label: '画像送信', cost: `${rates.image}コイン / 回`, note: 'チャットに画像を送る' },
    { label: '深い回答リクエスト', cost: `${rates.deepReply}コイン / 回`, note: 'じっくり考えた返答を受け取る' },
    { label: 'グループチャット', cost: `キャラ数 × ${rates.groupChatPerChar}コイン`, note: '参加キャラ数分を消費' },
    { label: 'ガチャ（1回）', cost: `${rates.gachaSingle}コイン`, note: '単発ガチャ' },
    { label: 'ガチャ（10連）', cost: `${rates.gachaTen}コイン`, note: '10連一括（1割お得）' },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-white pb-24">
      {/* ヘッダー */}
      <header className="sticky top-0 z-40 bg-gray-950 border-b border-white/8 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="text-gray-400 hover:text-white transition-colors p-2 rounded-full hover:bg-gray-800 -ml-1"
          aria-label="戻る"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex items-center gap-2">
          
          <h1 className="text-lg font-bold text-white">コイン経済について</h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 pt-6 space-y-6">
        {/* ── コインの消費 ── */}
        <section className="bg-gray-900/80 border border-white/8 rounded-2xl overflow-hidden">
          <div className="px-4 pt-4 pb-2 flex items-center gap-2">
            <span className="text-base"></span>
            <h2 className="text-sm font-bold text-gray-300">コインの消費先</h2>
          </div>
          <div className="divide-y divide-white/5">
            {COIN_SPENDS.map((item, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-gray-800 flex items-center justify-center text-base flex-shrink-0">
                    
                  </div>
                  <div>
                    <p className="text-sm text-white font-medium">{item.label}</p>
                    <p className="text-xs text-gray-500">{item.note}</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-yellow-400 flex-shrink-0 ml-3 text-right">
                  {item.cost}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* ── コインの獲得方法 ── */}
        <section className="bg-gray-900/80 border border-white/8 rounded-2xl overflow-hidden">
          <div className="px-4 pt-4 pb-2 flex items-center gap-2">
            <span className="text-base"></span>
            <h2 className="text-sm font-bold text-gray-300">コインの獲得方法</h2>
          </div>
          <div className="divide-y divide-white/5">
            {COIN_EARNS.map((item, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-gray-800 flex items-center justify-center text-base flex-shrink-0">
                    
                  </div>
                  <div>
                    <p className="text-sm text-white font-medium">{item.label}</p>
                    <p className="text-xs text-gray-500">{item.note}</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-green-400 flex-shrink-0 ml-3 text-right">
                  +{item.amount}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* コインパッケージセクション削除済み */}

        {/* ── よくある質問 ── */}
        <section className="bg-gray-900/80 border border-white/8 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-base"></span>
            <h2 className="text-sm font-bold text-gray-300">よくある質問</h2>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-white font-medium mb-1">コインは有効期限がありますか？</p>
              <p className="text-xs text-gray-500 leading-relaxed">無料で獲得したコインは180日間、購入コインは購入日から1年間有効です。</p>
            </div>
            <div>
              <p className="text-sm text-white font-medium mb-1">コインは返金できますか？</p>
              <p className="text-xs text-gray-500 leading-relaxed">
                購入したコインの払い戻しは原則できません。詳細は
                <a href="/legal/tokushoho" className="text-purple-400 underline ml-1">特定商取引法に基づく表記</a>
                をご確認ください。
              </p>
            </div>
            <div>
              <p className="text-sm text-white font-medium mb-1">無料でどのくらい遊べますか？</p>
              <p className="text-xs text-gray-500 leading-relaxed">
                デイリーミッションと毎日のログインボーナスで、毎日100〜150コイン程度獲得できます。
                チャット10〜15回相当は無料で楽しめます。
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
