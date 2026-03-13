'use client';

import { useRouter } from 'next/navigation';
import { CoinIcon } from '@/components/ui/CoinIcon';

/* ── SVG アイコン ── */
function ChatIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function GroupIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87" />
      <path d="M16 3.13a4 4 0 010 7.75" />
    </svg>
  );
}

function ImageIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  );
}

function GachaIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M8 12h8" />
      <path d="M12 8v8" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function GiftIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 12 20 22 4 22 4 12" />
      <rect x="2" y="7" width="20" height="5" />
      <line x1="12" y1="22" x2="12" y2="7" />
      <path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z" />
      <path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z" />
    </svg>
  );
}

function SparklesIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
      <path d="M5 17l.5 1.5L7 19l-1.5.5L5 21l-.5-1.5L3 19l1.5-.5L5 17z" />
      <path d="M19 13l.5 1.5L21 15l-1.5.5L19 17l-.5-1.5L17 15l1.5-.5L19 13z" />
    </svg>
  );
}

/* ── データ ── */
const COIN_CATEGORIES = [
  {
    category: 'チャット',
    icon: ChatIcon,
    accentColor: 'rgba(139, 92, 246, 0.5)',
    items: [
      { action: '通常チャット', cost: 10, unit: '/メッセージ', note: 'FC会員は無制限' },
      { action: 'FCチャット（プレミアム応答）', cost: 15, unit: '/メッセージ', note: 'FC限定の高品質応答' },
    ],
  },
  {
    category: 'グループチャット',
    icon: GroupIcon,
    accentColor: 'rgba(59, 130, 246, 0.5)',
    items: [
      { action: 'グループチャット', cost: 10, unit: '× 参加キャラ数', note: 'キャラ数に応じたコイン消費' },
    ],
  },
  {
    category: '画像解析チャット',
    icon: ImageIcon,
    accentColor: 'rgba(236, 72, 153, 0.5)',
    items: [
      { action: '画像解析付きチャット', cost: 20, unit: '/メッセージ', note: 'Vision AIが画像を認識して返信' },
    ],
  },
  {
    category: 'ガチャ',
    icon: GachaIcon,
    accentColor: 'rgba(245, 158, 11, 0.5)',
    items: [
      { action: 'ガチャ（1回）', cost: 50, unit: '/回', note: 'SR以上確率10%' },
      { action: 'ガチャ（10連）', cost: 450, unit: '/回', note: 'SR以上1枚確定' },
    ],
  },
  {
    category: 'ギフト',
    icon: GiftIcon,
    accentColor: 'rgba(16, 185, 129, 0.5)',
    items: [
      { action: 'ギフト送信', cost: null, unit: '', note: 'ギフトアイテムによる・関係値UP' },
    ],
  },
  {
    category: 'コインの入手方法',
    icon: SparklesIcon,
    accentColor: 'rgba(250, 204, 21, 0.5)',
    items: [
      { action: '毎日ログインボーナス', cost: -5, unit: '', note: '無料で毎日もらえる' },
      { action: 'ストーリークリア報酬', cost: -10, unit: '', note: 'チャプターごとに獲得' },
      { action: 'コイン購入', cost: null, unit: '', note: '¥120〜 COIN SHOPで購入' },
      { action: 'FC会員特典', cost: -50, unit: '', note: '毎月50コインプレゼント' },
    ],
  },
];

export default function CoinGuidePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-950 text-white pb-24">
      {/* ヘッダー */}
      <header className="sticky top-0 z-20 bg-gray-900/80 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3" style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-all"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
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
          className="rounded-2xl px-5 py-4 mb-8 bg-white/[0.03] backdrop-blur-sm"
          style={{ border: '1px solid rgba(250,204,21,0.15)' }}
        >
          <p className="text-yellow-200/70 text-sm leading-relaxed">
            コインはキャラクターとの会話やガチャなど、様々な機能で使えるアプリ内通貨です。
            FC（ファンクラブ）会員になると、対象キャラとのチャットが無制限になります。
          </p>
        </div>

        {/* カテゴリ別カード */}
        <div className="space-y-5">
          {COIN_CATEGORIES.map((cat) => {
            const IconComponent = cat.icon;
            return (
              <div
                key={cat.category}
                className="rounded-2xl overflow-hidden bg-white/[0.03] backdrop-blur-sm"
                style={{ border: '1px solid rgba(255,255,255,0.08)' }}
              >
                {/* カテゴリヘッダー */}
                <div
                  className="flex items-center gap-2.5 px-5 py-3"
                  style={{
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    background: `linear-gradient(135deg, ${cat.accentColor.replace('0.5', '0.08')}, transparent)`,
                  }}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: cat.accentColor.replace('0.5', '0.15') }}
                  >
                    <div style={{ color: cat.accentColor.replace('0.5', '1') }}>
                      <IconComponent />
                    </div>
                  </div>
                  <h2 className="text-white font-bold text-[15px]">{cat.category}</h2>
                </div>

                {/* アイテム一覧 */}
                {cat.items.map((item, idx) => (
                  <div
                    key={item.action}
                    className="flex items-center gap-3 px-5 py-3.5"
                    style={{
                      borderTop: idx > 0 ? '1px solid rgba(255,255,255,0.04)' : undefined,
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-white/90 text-sm font-medium">{item.action}</p>
                      <p className="text-gray-500 text-xs mt-0.5">{item.note}</p>
                    </div>
                    <div className="flex-shrink-0 flex items-center gap-1.5">
                      {item.cost !== null && item.cost > 0 ? (
                        <>
                          <CoinIcon size={14} />
                          <span className="text-amber-400 text-sm font-bold tabular-nums">{item.cost}</span>
                          {item.unit && <span className="text-gray-500 text-xs">{item.unit}</span>}
                        </>
                      ) : item.cost !== null && item.cost < 0 ? (
                        <>
                          <CoinIcon size={14} />
                          <span className="text-emerald-400 text-sm font-bold tabular-nums">+{Math.abs(item.cost)}</span>
                        </>
                      ) : (
                        <span className="text-gray-500 text-xs">アイテムによる</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        {/* CTAボタン */}
        <div className="mt-10">
          <button
            onClick={() => router.push('/coins')}
            className="w-full py-3.5 rounded-2xl font-bold text-base text-white transition-all active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
              boxShadow: '0 4px 24px rgba(139,92,246,0.3)',
            }}
          >
            コインを購入する
          </button>
        </div>
      </main>
    </div>
  );
}
