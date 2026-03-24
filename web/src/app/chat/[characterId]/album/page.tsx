'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';

interface ImageItem {
  id: string;
  imageUrl: string;
  thumbnailUrl: string | null;
  fileSizeBytes: number;
  width: number | null;
  height: number | null;
  role: string;
  createdAt: string;
  source?: string;
}

interface UsageInfo {
  totalBytes: number;
  limitBytes: number;
  usedPercent: number;
  isFc: boolean;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatMonth(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}年${d.getMonth() + 1}月`;
}

function groupByMonth(images: ImageItem[]): { month: string; items: ImageItem[] }[] {
  const groups: Map<string, ImageItem[]> = new Map();
  for (const img of images) {
    const month = formatMonth(img.createdAt);
    if (!groups.has(month)) groups.set(month, []);
    groups.get(month)!.push(img);
  }
  return Array.from(groups.entries()).map(([month, items]) => ({ month, items }));
}

export default function AlbumPage() {
  const params = useParams();
  const router = useRouter();
  const characterId = params.characterId as string;

  const [images, setImages] = useState<ImageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [characterName, setCharacterName] = useState('');
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [usage, setUsage] = useState<UsageInfo | null>(null);

  // スワイプ用
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/chat/${characterId}/album`);
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        setImages(data.images ?? []);
        setCharacterName(data.characterName ?? '');
        // 容量情報は別エンドポイントから取得（なければスキップ）
        try {
          const usageRes = await fetch(`/api/chat/${characterId}/media-usage`);
          if (usageRes.ok) {
            setUsage(await usageRes.json());
          }
        } catch {
          // 容量情報が取れない場合は画像サイズから計算
          const imgs: ImageItem[] = data.images ?? [];
          const totalBytes = imgs.reduce((sum: number, img: ImageItem) => sum + (img.fileSizeBytes ?? 0), 0);
          setUsage({
            totalBytes,
            limitBytes: 50 * 1024 * 1024,
            usedPercent: Math.min(100, Math.round((totalBytes / (50 * 1024 * 1024)) * 100)),
            isFc: false,
          });
        }
      } catch {
        // fallback
      } finally {
        setLoading(false);
      }
    })();
  }, [characterId]);

  const grouped = groupByMonth(images);

  const openViewer = useCallback((index: number) => {
    setSelectedIndex(index);
  }, []);

  const closeViewer = useCallback(() => {
    setSelectedIndex(null);
  }, []);

  const goNext = useCallback(() => {
    if (selectedIndex === null) return;
    setSelectedIndex((prev) => (prev !== null ? Math.min(prev + 1, images.length - 1) : null));
  }, [selectedIndex, images.length]);

  const goPrev = useCallback(() => {
    if (selectedIndex === null) return;
    setSelectedIndex((prev) => (prev !== null ? Math.max(prev - 1, 0) : null));
  }, [selectedIndex]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) goNext();
      else goPrev();
    }
    touchStartX.current = null;
  }, [goNext, goPrev]);

  // キーボード操作
  useEffect(() => {
    if (selectedIndex === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'Escape') closeViewer();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedIndex, goNext, goPrev, closeViewer]);

  const selectedImage = selectedIndex !== null ? images[selectedIndex] : null;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* ヘッダー */}
      <div className="sticky top-0 z-20 bg-gray-950/90 backdrop-blur-md border-b border-white/8">
        <div className="flex items-center gap-3 px-4 py-3" style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
          <button
            onClick={() => router.back()}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <div>
            <h1 className="text-base font-bold">アルバム</h1>
            <p className="text-xs text-gray-500">{characterName}との共有画像</p>
          </div>
        </div>

        {/* 容量使用量バー */}
        {usage && (
          <div className="px-4 pb-3">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>
                {usage.isFc ? 'FC' : 'FREE'}: {formatBytes(usage.limitBytes)}中 {formatBytes(usage.totalBytes)} 使用
              </span>
              <span>{usage.usedPercent}%</span>
            </div>
            <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  usage.usedPercent >= 90 ? 'bg-red-500' :
                  usage.usedPercent >= 70 ? 'bg-yellow-500' :
                  'bg-purple-500'
                }`}
                style={{ width: `${usage.usedPercent}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* コンテンツ */}
      <div className="px-2 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : images.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-600">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <path d="M21 15l-5-5L5 21" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <p className="text-gray-500 text-sm">まだ画像はありません</p>
            <p className="text-gray-600 text-xs">チャットで画像を送るとここに保存されます</p>
          </div>
        ) : (
          <div className="space-y-6">
            {grouped.map(({ month, items }) => (
              <div key={month}>
                {/* 月別セクションヘッダー */}
                <div className="px-1 pb-2">
                  <h2 className="text-sm font-semibold text-gray-400">{month}</h2>
                  <p className="text-xs text-gray-600">{items.length}枚</p>
                </div>
                {/* グリッド（3列、gap-1、Instagram風） */}
                <div className="grid grid-cols-3 gap-1">
                  {items.map((img) => {
                    const globalIndex = images.findIndex((i) => i.id === img.id);
                    return (
                      <button
                        key={img.id}
                        onClick={() => openViewer(globalIndex)}
                        className="relative aspect-square overflow-hidden rounded-sm bg-gray-800 group"
                      >
                        <Image
                          src={img.thumbnailUrl ?? img.imageUrl}
                          alt=""
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-200"
                          unoptimized
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* フルスクリーンビューワー */}
      {selectedImage && selectedIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-black flex items-center justify-center"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* 閉じるボタン */}
          <button
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white z-10"
            style={{ top: 'max(1rem, env(safe-area-inset-top))' }}
            onClick={closeViewer}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          {/* 前へボタン */}
          {selectedIndex > 0 && (
            <button
              className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white z-10"
              onClick={goPrev}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          )}

          {/* 次へボタン */}
          {selectedIndex < images.length - 1 && (
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white z-10"
              onClick={goNext}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          )}

          {/* 画像本体 */}
          <div className="relative w-full h-full max-w-lg max-h-[80vh] mx-4">
            <Image
              src={selectedImage.imageUrl}
              alt=""
              fill
              className="object-contain"
              unoptimized
            />
          </div>

          {/* 枚数インジケーター */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-sm text-white/60"
            style={{ bottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
            {selectedIndex + 1} / {images.length}
          </div>
        </div>
      )}
    </div>
  );
}
