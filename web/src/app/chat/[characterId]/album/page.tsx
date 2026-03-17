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

function formatMonth(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}年${d.getMonth() + 1}月`;
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return '今日';
  if (diff === 1) return '昨日';
  return `${d.getMonth() + 1}月${d.getDate()}日`;
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

  // スワイプ用
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/chat/${characterId}/album`);
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        setImages(data.images ?? []);
        setCharacterName(data.characterName ?? '');
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
    // スクロールを固定
    document.body.style.overflow = 'hidden';
  }, []);

  const closeViewer = useCallback(() => {
    setSelectedIndex(null);
    document.body.style.overflow = '';
  }, []);

  const goNext = useCallback(() => {
    setSelectedIndex((prev) => (prev !== null ? Math.min(prev + 1, images.length - 1) : null));
  }, [images.length]);

  const goPrev = useCallback(() => {
    setSelectedIndex((prev) => (prev !== null ? Math.max(prev - 1, 0) : null));
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const dx = touchStartX.current - e.changedTouches[0].clientX;
    const dy = touchStartY.current - e.changedTouches[0].clientY;
    // 水平スワイプ優先（縦スワイプより横スワイプが大きい場合）
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
      if (dx > 0) goNext();
      else goPrev();
    } else if (dy > 80) {
      // 下スワイプで閉じる
      closeViewer();
    }
    touchStartX.current = null;
    touchStartY.current = null;
  }, [goNext, goPrev, closeViewer]);

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

  // クリーンアップ
  useEffect(() => {
    return () => { document.body.style.overflow = ''; };
  }, []);

  const selectedImage = selectedIndex !== null ? images[selectedIndex] : null;

  return (
    <div className="min-h-screen bg-black text-white select-none">
      {/* ヘッダー — iOS Photos風 */}
      <div
        className="sticky top-0 z-20 bg-black/90 backdrop-blur-xl"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1 text-[#0A84FF] text-base font-normal active:opacity-60 transition-opacity"
          >
            <svg width="10" height="18" viewBox="0 0 10 18" fill="none">
              <path d="M9 1L1 9L9 17" stroke="#0A84FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>チャット</span>
          </button>
          <h1 className="text-base font-semibold text-white">
            {characterName ? `${characterName}との思い出` : 'アルバム'}
          </h1>
          <div className="w-14" /> {/* spacing balancer */}
        </div>
      </div>

      {/* コンテンツ */}
      <div className="pb-8" style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}>
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          </div>
        ) : images.length === 0 ? (
          /* Empty state — iOS Photos風 */
          <div className="flex flex-col items-center justify-center py-32 gap-4 px-8">
            <div className="w-20 h-20 rounded-2xl bg-white/8 flex items-center justify-center">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-white/40">
                <rect x="3" y="3" width="18" height="18" rx="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <path d="M21 15l-5-5L5 21" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="text-center">
              <p className="text-white/80 text-base font-medium mb-1">まだ写真がありません</p>
              <p className="text-white/40 text-sm">チャットで画像を送ると<br />ここに自動で保存されます</p>
            </div>
          </div>
        ) : (
          <>
            {/* 枚数サマリー */}
            <div className="px-4 pt-2 pb-3">
              <p className="text-white/40 text-xs font-medium tracking-wide uppercase">
                {images.length}枚の写真
              </p>
            </div>

            {/* 月別グリッド */}
            <div className="space-y-0">
              {grouped.map(({ month, items }) => (
                <div key={month}>
                  {/* 月ヘッダー */}
                  <div className="px-4 pt-4 pb-2 flex items-baseline justify-between">
                    <h2 className="text-white text-xl font-bold">{month}</h2>
                    <span className="text-white/40 text-sm">{items.length}枚</span>
                  </div>

                  {/* グリッド — iOS Photos風 3列、gap-px */}
                  <div
                    className="grid gap-px"
                    style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}
                  >
                    {items.map((img) => {
                      const globalIndex = images.findIndex((i) => i.id === img.id);
                      const isRecent = (() => {
                        const d = new Date(img.createdAt);
                        const diff = Math.floor((Date.now() - d.getTime()) / 86400000);
                        return diff <= 1;
                      })();
                      return (
                        <button
                          key={img.id}
                          onClick={() => openViewer(globalIndex)}
                          className="relative overflow-hidden bg-zinc-900 active:opacity-80 transition-opacity"
                          style={{ aspectRatio: '1 / 1' }}
                        >
                          {/* サムネイル */}
                          <img
                            src={img.thumbnailUrl ?? img.imageUrl}
                            alt=""
                            className="absolute inset-0 w-full h-full object-cover"
                            loading="lazy"
                          />
                          {/* 最近バッジ */}
                          {isRecent && (
                            <div className="absolute top-1.5 left-1.5">
                              <span className="text-[10px] font-semibold bg-black/60 text-white px-1.5 py-0.5 rounded-full backdrop-blur-sm">
                                {formatDateLabel(img.createdAt)}
                              </span>
                            </div>
                          )}
                          {/* キャラが送った画像バッジ */}
                          {img.role === 'CHARACTER' && (
                            <div className="absolute bottom-1.5 right-1.5">
                              <span className="text-[9px] font-semibold bg-purple-600/90 text-white px-1.5 py-0.5 rounded-full">
                                From {characterName}
                              </span>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* フルスクリーンビューワー — iOS Photos風 */}
      {selectedImage && selectedIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-black"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onClick={(e) => {
            // 背景タップで閉じる（画像以外）
            if (e.target === e.currentTarget) closeViewer();
          }}
        >
          {/* トップバー */}
          <div
            className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/60 to-transparent"
            style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
          >
            <button
              className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center active:bg-black/60 transition-colors"
              onClick={closeViewer}
              aria-label="閉じる"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            <div className="text-center">
              <p className="text-white text-sm font-semibold">
                {selectedIndex + 1} / {images.length}
              </p>
              <p className="text-white/60 text-xs">
                {formatDateLabel(selectedImage.createdAt)}
              </p>
            </div>

            {/* シェアボタン（将来拡張用） */}
            <div className="w-9" />
          </div>

          {/* 画像本体 — 左右フリックで切替 */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative w-full h-full flex items-center justify-center px-2">
              <img
                src={selectedImage.imageUrl}
                alt=""
                className="max-w-full max-h-full object-contain"
                style={{ maxHeight: '85dvh' }}
              />
            </div>
          </div>

          {/* 前へ / 次へ — タブレット・デスクトップ向け */}
          {selectedIndex > 0 && (
            <button
              className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white z-10 active:bg-black/60 transition-colors md:flex hidden"
              onClick={goPrev}
              aria-label="前の画像"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          )}
          {selectedIndex < images.length - 1 && (
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white z-10 active:bg-black/60 transition-colors md:flex hidden"
              onClick={goNext}
              aria-label="次の画像"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          )}

          {/* ボトム情報バー */}
          <div
            className="absolute bottom-0 left-0 right-0 z-10 px-4 pb-4 pt-8 bg-gradient-to-t from-black/60 to-transparent"
            style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
          >
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${selectedImage.role === 'USER' ? 'bg-blue-400' : 'bg-purple-400'}`} />
              <p className="text-white/70 text-sm">
                {selectedImage.role === 'USER' ? 'あなたが送った写真' : `${characterName}が送った写真`}
              </p>
            </div>
            {/* 下スワイプヒント */}
            <p className="text-white/30 text-xs mt-1.5">下にスワイプで閉じる</p>
          </div>

          {/* インジケータードット（10枚以下の場合） */}
          {images.length <= 10 && (
            <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex gap-1.5 z-10"
              style={{ bottom: 'max(4rem, calc(2rem + env(safe-area-inset-bottom)))' }}>
              {images.map((_, i) => (
                <div
                  key={i}
                  className={`rounded-full transition-all duration-200 ${
                    i === selectedIndex
                      ? 'w-4 h-1.5 bg-white'
                      : 'w-1.5 h-1.5 bg-white/40'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
