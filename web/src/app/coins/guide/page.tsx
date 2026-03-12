'use client';

import { useRouter } from 'next/navigation';
import { CoinIcon } from '@/components/ui/CoinIcon';

const COIN_ITEMS = [
  {
    category: 'チャット',
    icon: '💬',
    items: [
      { action: 'テキストメッセージ送信', cost: 10, note: 'FC会員は無制限' },
      { action: '画像送信 + AI解析リアクション', cost: 15, note: 'Vision AIが画像を認識して返信' },
      { action: '音声通話（1分あたり）', cost: 30, note: 'FC会員は月5分無料' },
    ],
  },
  {
    category: 'グループチャット',
    icon: '👥',
    items: [
      { action: '2キャラ参加', cost: 20, note: '1メッセージあたり' },
      { action: '3キャラ参加', cost: 30, note: '1メッセージあたり' },
      { action: '追加掛け合いラウンド', cost: 20, note: 'キャラ同士の会話を追加' },
    ],
  },
  {
    category: 'ガチャ',
    icon: '🎰',
    items: [
      { action: '単発ガチャ', cost: 50, note: 'SR以上確率10%' },
      { action: '10連ガチャ', cost: 450, note: 'SR以上1枚確定' },
    ],
  },
  {
    category: 'ギフト',
    icon: '🎁',
    items: [
      { action: 'ギフト送信', cost: 10, note: '最小10コイン〜 関係値UP' },
    ],
  },
  {
    category: 'コインの入手方法',
    icon: '✨',
    items: [
      { action: '毎日ログインボーナス', cost: -5, note: '無料で毎日もらえる' },
      { action: 'ストーリークリア報酬', cost: -10, note: 'チャプターごとに獲得' },
      { action: 'コイン購入', cost: 0, note: '¥120〜 COIN SHOPで購入' },
      { action: 'FC会員特典', cost: -50, note: '毎月50コインプレゼント' },
    ],
  },
];

export default function CoinGuidePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-950 text-white pb-24">
      {/* ヘッダー */}
      <header className="sticky top-0 z-20 bg-gray-950/90 backdrop-blur-md border-b border-white/8">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3" style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-all"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <CoinIcon size={24} />
            <h1 className="text-white font-bold text-lg">コインガイド</h1>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* 説明 */}
        <div
          className="rounded-2xl px-5 py-4 mb-6"
          style={{
            background: 'linear-gradient(135deg, rgba(250,204,21,0.1), rgba(245,158,11,0.05))',
            border: '1px solid rgba(250,204,21,0.2)',
          }}
        >
          <p className="text-yellow-200/80 text-sm leading-relaxed">
            コインはキャラクターとの会話やガチャなど、様々な機能で使えるアプリ内通貨です。
            FC（ファンクラブ）会員になると、対象キャラとのチャットが無制限になります。
          </p>
        </div>

        {/* カテゴリ別一覧 */}
        <div className="space-y-6">
          {COIN_ITEMS.map((category) => (
            <div key={category.category}>
              <h2 className="flex items-center gap-2 text-white font-bold text-base mb-3">
                <span>{category.icon}</span>
                {category.category}
              </h2>
              <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                {category.items.map((item, idx) => (
                  <div
                    key={item.action}
                    className="flex items-center gap-3 px-4 py-3.5"
                    style={{
                      background: idx % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.04)',
                      borderTop: idx > 0 ? '1px solid rgba(255,255,255,0.05)' : undefined,
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium">{item.action}</p>
                      <p className="text-gray-500 text-xs mt-0.5">{item.note}</p>
                    </div>
                    <div className="flex-shrink-0 flex items-center gap-1">
                      {item.cost > 0 ? (
                        <>
                          <CoinIcon size={14} />
                          <span className="text-yellow-300 text-sm font-bold">{item.cost}</span>
                        </>
                      ) : item.cost < 0 ? (
                        <>
                          <CoinIcon size={14} />
                          <span className="text-green-400 text-sm font-bold">+{Math.abs(item.cost)}</span>
                        </>
                      ) : (
                        <span className="text-gray-400 text-xs">様々</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* CTAボタン */}
        <div className="mt-8 space-y-3">
          <button
            onClick={() => router.push('/coins')}
            className="w-full py-3.5 rounded-2xl font-bold text-base text-white transition-all active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
              boxShadow: '0 4px 24px rgba(139,92,246,0.4)',
            }}
          >
            コインを購入する
          </button>
        </div>
      </main>
    </div>
  );
}
