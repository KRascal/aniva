'use client';

import type { DlContent } from '../profileTypes';

interface ShopTabProps {
  characterId: string;
  dlContents: DlContent[];
}

// 将来のShop API hookポイント用プレースホルダー価格
const DEFAULT_COIN_PRICE = 100;

export function ShopTab({ characterId, dlContents }: ShopTabProps) {
  const handlePurchase = (_itemId: string, _price: number) => {
    // TODO: Shop API実装時にここで購入処理を呼び出す
    // await fetch(`/api/shop/purchase`, { method: 'POST', body: JSON.stringify({ characterId, itemId, price }) })
    console.log('Shop purchase hook - characterId:', characterId, 'itemId:', _itemId, 'price:', _price);
    alert('ショップ機能は近日公開予定です');
  };

  return (
    <div className="space-y-4 pt-2 pb-24">
      {/* ヘッダーバナー */}
      <div className="rounded-2xl overflow-hidden border border-amber-700/30 bg-gradient-to-br from-amber-900/30 to-orange-900/20 p-5">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-amber-800/50 flex items-center justify-center border border-amber-700/30">
            <svg className="w-5 h-5 text-amber-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
          </div>
          <div>
            <h2 className="text-white font-bold text-base">キャラ限定ショップ</h2>
            <p className="text-amber-300/70 text-xs">コインでデジタルコンテンツを購入</p>
          </div>
        </div>
        <p className="text-gray-400 text-xs leading-relaxed">
          このキャラクター限定のデジタルコンテンツをコインで購入できます。購入したコンテンツはいつでもダウンロード可能です。
        </p>
      </div>

      {/* 商品リスト */}
      {dlContents.length === 0 ? (
        <div className="py-12 flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gray-900 border border-white/5 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007z" />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-white/60 text-sm font-semibold mb-1">近日公開</p>
            <p className="text-white/30 text-xs">限定コンテンツを準備中です</p>
          </div>
        </div>
      ) : (
        <>
          <p className="text-gray-400 text-xs font-semibold uppercase tracking-widest px-1">限定コンテンツ</p>
          <div className="grid grid-cols-2 gap-3">
            {dlContents.map((item) => (
              <div
                key={item.id}
                className="relative rounded-2xl overflow-hidden border border-white/8 bg-[#111111]"
              >
                {/* サムネイル */}
                {item.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.thumbnailUrl} alt={item.title} className="w-full h-28 object-cover" />
                ) : (
                  <div className="w-full h-28 flex items-center justify-center bg-gray-800/50">
                    <svg className="w-8 h-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.75 7.5h16.5" />
                    </svg>
                  </div>
                )}

                {/* ロックオーバーレイ */}
                {item.locked && (
                  <div className="absolute top-2 right-2 bg-black/70 rounded-lg px-1.5 py-0.5 flex items-center gap-1">
                    <svg className="w-3 h-3 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                    <span className="text-amber-400 text-xs font-bold">有料</span>
                  </div>
                )}

                <div className="p-3">
                  <p className="text-xs font-semibold truncate text-white mb-0.5">{item.title}</p>
                  {item.description && (
                    <p className="text-gray-500 text-xs line-clamp-1 mb-2">{item.description}</p>
                  )}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <span className="text-amber-400 text-xs">🪙</span>
                      <span className="text-amber-300 text-xs font-bold">{DEFAULT_COIN_PRICE}</span>
                    </div>
                    <button
                      onClick={() => handlePurchase(item.id, DEFAULT_COIN_PRICE)}
                      className="inline-flex items-center gap-1 text-xs bg-amber-700/60 hover:bg-amber-700/80 active:scale-95 text-amber-200 px-2.5 py-1 rounded-lg transition-all border border-amber-600/30"
                    >
                      購入
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* フッターノート */}
          <div className="rounded-xl bg-gray-900/40 border border-white/5 p-3 text-center">
            <p className="text-gray-600 text-xs">
              ※ ショップ機能は近日正式公開予定です。現在は準備中です。
            </p>
          </div>
        </>
      )}
    </div>
  );
}
