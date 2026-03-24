'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';

interface ImageItem {
  id: string;
  imageUrl: string;
  role: 'user' | 'assistant';
  createdAt: string;
}

export default function AlbumPage() {
  const params = useParams();
  const router = useRouter();
  const characterId = params.characterId as string;

  const [images, setImages] = useState<ImageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [characterName, setCharacterName] = useState('');
  const [selectedImage, setSelectedImage] = useState<ImageItem | null>(null);

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

  const formatDate = useCallback((dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  }, []);

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
          <div className="grid grid-cols-3 gap-1">
            {images.map((img) => (
              <button
                key={img.id}
                onClick={() => setSelectedImage(img)}
                className="relative aspect-square overflow-hidden rounded-lg bg-gray-800 group"
              >
                <Image
                  src={img.imageUrl}
                  alt=""
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-200"
                  unoptimized
                />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-1.5">
                  <span className="text-[10px] text-white/80">{formatDate(img.createdAt)}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ライトボックス */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setSelectedImage(null)}
        >
          <button
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white z-10"
            style={{ top: 'max(1rem, env(safe-area-inset-top))' }}
            onClick={() => setSelectedImage(null)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <div className="relative w-full h-full max-w-lg max-h-[80vh] mx-4" onClick={(e) => e.stopPropagation()}>
            <Image
              src={selectedImage.imageUrl}
              alt=""
              fill
              className="object-contain"
              unoptimized
            />
          </div>
        </div>
      )}
    </div>
  );
}
