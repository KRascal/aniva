'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

interface ContentItem {
  id: string;
  characterId: string;
  character: { name: string; slug: string; avatarUrl: string | null };
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  category: string;
  isFcOnly: boolean;
  isLocked: boolean;
  downloadCount: number;
}

const CATEGORY_LABELS: Record<string, { label: string; icon: string }> = {
  wallpaper: { label: '壁紙', icon: '🖼' },
  voice_clip: { label: 'ボイス', icon: '🎙' },
  illustration: { label: 'イラスト', icon: '🎨' },
  special: { label: '特典', icon: '⭐' },
};

export default function ContentPage() {
  const router = useRouter();
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    fetch(`/api/content?${params}`)
      .then(r => r.json())
      .then(d => setItems(d.contents ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [category]);

  const handleDownload = async (item: ContentItem) => {
    if (item.isLocked) {
      // FC加入誘導
      router.push(`/profile/${item.character.slug}#fc`);
      return;
    }
    window.open(`/api/content/${item.id}/download`, '_blank');
  };

  return (
    <div className="min-h-screen bg-gray-950 pb-28">
      <header className="sticky top-0 z-20 bg-gray-950/95 backdrop-blur border-b border-white/5">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => router.back()} className="w-9 h-9 flex items-center justify-center text-white/50 hover:text-white rounded-xl hover:bg-white/5">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-base font-bold text-white">🎁 ダウンロードコンテンツ</h1>
        </div>
      </header>

      {/* カテゴリフィルター */}
      <div className="max-w-lg mx-auto px-4 py-3 flex gap-2 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setCategory(null)}
          className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
            !category ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400'
          }`}
        >
          すべて
        </button>
        {Object.entries(CATEGORY_LABELS).map(([key, { label, icon }]) => (
          <button
            key={key}
            onClick={() => setCategory(key)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              category === key ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400'
            }`}
          >
            {icon} {label}
          </button>
        ))}
      </div>

      {/* コンテンツグリッド */}
      <div className="max-w-lg mx-auto px-4">
        {loading ? (
          <div className="flex justify-center py-20"><div className="aniva-shimmer w-10 h-10 rounded-full bg-gray-700" /></div>
        ) : items.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-5xl mb-4">🎁</p>
            <p className="text-gray-400 text-sm">コンテンツはまだありません</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {items.map(item => (
              <button
                key={item.id}
                onClick={() => handleDownload(item)}
                className="bg-gray-900/60 border border-white/5 rounded-2xl overflow-hidden text-left hover:border-purple-500/20 transition-all active:scale-[0.97] group"
              >
                {/* サムネイル */}
                <div className="relative aspect-[4/3] bg-gray-800">
                  {item.thumbnailUrl ? (
                    <Image src={item.thumbnailUrl} alt="" fill className="object-cover" unoptimized />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl text-gray-600">
                      {CATEGORY_LABELS[item.category]?.icon ?? '📦'}
                    </div>
                  )}
                  {item.isLocked && (
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center">
                      <span className="text-2xl">🔒</span>
                    </div>
                  )}
                  {item.isFcOnly && (
                    <div className="absolute top-2 right-2 bg-yellow-500/90 text-black text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                      FC
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <p className="text-white text-xs font-semibold truncate">{item.title}</p>
                  <p className="text-gray-500 text-[10px] mt-0.5">{item.character.name} • {item.downloadCount} DL</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
