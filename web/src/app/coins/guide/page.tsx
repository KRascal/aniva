'use client';

import { useRouter } from 'next/navigation';

const COIN_TABLE = [
  { feature: 'チャット（1通）', free: '10コイン', fc: '無料', icon: '💬' },
  { feature: '深い会話（AI Pro）', free: '20コイン', fc: '無料', icon: '🧠' },
  { feature: '画像送信（Vision）', free: '15コイン', fc: '無料', icon: '📸' },
  { feature: '掛け合い（2キャラ）', free: '20コイン', fc: '無料', icon: '⚡' },
  { feature: '掛け合い（3キャラ）', free: '30コイン', fc: '無料', icon: '⚡' },
  { feature: 'ガチャ（1回）', free: '5コイン', fc: '5コイン', icon: '🎴' },
  { feature: 'ガチャ（10連）', free: '45コイン', fc: '45コイン', icon: '🎴' },
  { feature: '音声通話（1分）', free: '10コイン', fc: '無料（月30分）', icon: '📞' },
];

export default function CoinGuidePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-950 pb-24">
      {/* ヘッダー */}
      <header className="sticky top-0 z-30 bg-gray-950/95 backdrop-blur-md border-b border-white/5">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.back()} className="text-white/60 hover:text-white">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-white font-bold text-lg">コイン消費ガイド</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pt-6 space-y-6">
        {/* 概要 */}
        <section>
          <p className="text-white/70 text-sm leading-relaxed">
            ANIVAでは、キャラクターとの会話やアクションにコインを消費します。
            FC会員になると、チャット・通話が定額で無制限に楽しめます。
          </p>
        </section>

        {/* コイン消費テーブル */}
        <section>
          <h2 className="text-white font-bold text-sm mb-3 uppercase tracking-widest">消費コイン一覧</h2>
          <div className="rounded-2xl border border-white/8 overflow-hidden">
            {/* ヘッダー行 */}
            <div className="grid grid-cols-3 bg-white/[0.04] px-4 py-2.5 border-b border-white/8">
              <span className="text-white/40 text-xs font-semibold">機能</span>
              <span className="text-white/40 text-xs font-semibold text-center">通常</span>
              <span className="text-purple-400/80 text-xs font-semibold text-center">FC会員</span>
            </div>
            {COIN_TABLE.map((row, i) => (
              <div
                key={i}
                className={`grid grid-cols-3 px-4 py-3 items-center ${i < COIN_TABLE.length - 1 ? 'border-b border-white/5' : ''}`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm">{row.icon}</span>
                  <span className="text-white text-xs font-medium">{row.feature}</span>
                </div>
                <span className="text-yellow-400/80 text-xs text-center font-mono">{row.free}</span>
                <span className={`text-xs text-center font-bold ${row.fc === '無料' ? 'text-green-400' : 'text-yellow-400/80 font-mono'}`}>
                  {row.fc}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* 深い会話の説明 */}
        <section className="rounded-2xl p-4 border border-white/8 bg-white/[0.02]">
          <h3 className="text-white font-bold text-sm mb-2">深い会話（AI Pro）とは？</h3>
          <p className="text-white/60 text-xs leading-relaxed">
            10ターン以上の長い会話や、悩み相談などの深いテーマの場合、
            キャラクターがより深く考えて応答します。
            キャラクターが「ちょっと考えさせて…」と言った場合、
            高性能AIモデルで丁寧に考えた回答が返ってきます。
          </p>
        </section>

        {/* FC会員のメリット */}
        <section className="rounded-2xl p-4 border border-purple-500/20 bg-purple-500/[0.04]">
          <h3 className="text-purple-400 font-bold text-sm mb-2">FC会員なら</h3>
          <ul className="space-y-1.5">
            <li className="text-white/70 text-xs flex items-start gap-2">
              <span className="text-green-400 mt-0.5">✓</span>
              チャット無制限（通常・深い会話どちらも）
            </li>
            <li className="text-white/70 text-xs flex items-start gap-2">
              <span className="text-green-400 mt-0.5">✓</span>
              画像送信・Vision無制限
            </li>
            <li className="text-white/70 text-xs flex items-start gap-2">
              <span className="text-green-400 mt-0.5">✓</span>
              掛け合い無制限
            </li>
            <li className="text-white/70 text-xs flex items-start gap-2">
              <span className="text-green-400 mt-0.5">✓</span>
              音声通話 月30分無料
            </li>
            <li className="text-white/70 text-xs flex items-start gap-2">
              <span className="text-green-400 mt-0.5">✓</span>
              FC限定コンテンツ
            </li>
          </ul>
        </section>
      </main>
    </div>
  );
}
