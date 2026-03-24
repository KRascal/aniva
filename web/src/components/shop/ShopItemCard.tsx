'use client';

interface ShopItemData {
  id: string;
  name: string;
  description?: string | null;
  type: string;
  priceCoins: number;
  imageUrl?: string | null;
  isPurchased?: boolean;
  character?: { id?: string; name: string; slug: string; avatarUrl: string | null };
}

interface ShopItemCardProps {
  item: ShopItemData;
  onPurchase: (item: ShopItemData) => void;
}

const TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  digital_wallpaper: { label: '壁紙', color: 'text-blue-400 bg-blue-900/40 border-blue-700/30' },
  digital_voice: { label: 'ボイス', color: 'text-pink-400 bg-pink-900/40 border-pink-700/30' },
  digital_art: { label: 'アート', color: 'text-purple-400 bg-purple-900/40 border-purple-700/30' },
  digital_goods: { label: 'グッズ', color: 'text-amber-400 bg-amber-900/40 border-amber-700/30' },
};

export function ShopItemCard({ item, onPurchase }: ShopItemCardProps) {
  const typeInfo = TYPE_CONFIG[item.type] ?? { label: item.type, color: 'text-gray-400 bg-gray-900/40 border-gray-700/30' };

  return (
    <button
      onClick={() => onPurchase(item)}
      className="w-full text-left rounded-2xl overflow-hidden border border-white/8 bg-[#111] hover:border-white/15 transition-all active:scale-[0.97] group"
    >
      {/* Thumbnail */}
      <div className="relative aspect-[4/3] bg-gray-900 overflow-hidden">
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.imageUrl}
            alt={item.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg className="w-10 h-10 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007z" />
            </svg>
          </div>
        )}
        {/* Type badge */}
        <span className={`absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full border ${typeInfo.color}`}>
          {typeInfo.label}
        </span>
        {/* Purchased badge */}
        {item.isPurchased && (
          <div className="absolute top-2 right-2 bg-green-500/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
            購入済み
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="text-white text-sm font-semibold truncate">{item.name}</p>
        {item.character && (
          <p className="text-gray-500 text-xs mt-0.5">{item.character.name}</p>
        )}
        <div className="flex items-center justify-between mt-2">
          {item.isPurchased ? (
            <span className="text-green-400 text-xs font-medium">ダウンロード可能</span>
          ) : (
            <div className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5 text-amber-400" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="12" r="10" />
                <text x="12" y="16" textAnchor="middle" fontSize="12" fill="#000" fontWeight="bold">C</text>
              </svg>
              <span className="text-amber-300 text-sm font-bold">{item.priceCoins.toLocaleString()}</span>
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
