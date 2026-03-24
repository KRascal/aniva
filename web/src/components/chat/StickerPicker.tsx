'use client';

import React, { useState, useCallback } from 'react';
import Image from 'next/image';

/**
 * キャラクター別スタンプ定義
 * 各キャラの表情バリエーション（public/stickers/{slug}-{emotion}.png）
 */
interface StickerDef {
  slug: string;
  emotion: string;
  emoji: string;
  label: string;
}

const STICKER_MAP: Record<string, StickerDef[]> = {
  luffy: [
    { slug: 'luffy', emotion: 'happy', emoji: '😄', label: 'ニカッ！' },
    { slug: 'luffy', emotion: 'angry', emoji: '😠', label: '怒り' },
    { slug: 'luffy', emotion: 'sad', emoji: '😢', label: '泣き' },
    { slug: 'luffy', emotion: 'love', emoji: '❤️', label: 'すき' },
    { slug: 'luffy', emotion: 'hungry', emoji: '🍖', label: '腹減った' },
  ],
  zoro: [
    { slug: 'zoro', emotion: 'cool', emoji: '😎', label: 'クール' },
    { slug: 'zoro', emotion: 'training', emoji: '💪', label: '鍛錬' },
    { slug: 'zoro', emotion: 'lost', emoji: '❓', label: '迷子' },
  ],
  nami: [
    { slug: 'nami', emotion: 'happy', emoji: '😊', label: 'にこっ' },
    { slug: 'nami', emotion: 'angry', emoji: '💢', label: 'ドカッ' },
    { slug: 'nami', emotion: 'money', emoji: '💰', label: 'お金' },
  ],
  sanji: [
    { slug: 'sanji', emotion: 'love', emoji: '😍', label: 'メロリン' },
    { slug: 'sanji', emotion: 'cooking', emoji: '🍳', label: '料理' },
  ],
  chopper: [
    { slug: 'chopper', emotion: 'happy', emoji: '🩷', label: 'うれしい' },
    { slug: 'chopper', emotion: 'shy', emoji: '😳', label: 'てれてれ' },
  ],
  ace: [
    { slug: 'ace', emotion: 'cool', emoji: '🔥', label: '炎' },
    { slug: 'ace', emotion: 'sleeping', emoji: '💤', label: '爆睡' },
  ],
  gojo: [
    { slug: 'gojo', emotion: 'smirk', emoji: '😏', label: 'ニヤリ' },
    { slug: 'gojo', emotion: 'cool', emoji: '✨', label: '無量空処' },
  ],
  tanjiro: [
    { slug: 'tanjiro', emotion: 'kind', emoji: '🌸', label: 'やさしい' },
    { slug: 'tanjiro', emotion: 'determined', emoji: '⚔️', label: '全集中' },
  ],
};

// デフォルトスタンプ（キャラ固有がない場合のフォールバック）
const DEFAULT_STICKERS: StickerDef[] = [
  { slug: 'default', emotion: 'happy', emoji: '😊', label: 'うれしい' },
  { slug: 'default', emotion: 'sad', emoji: '😢', label: 'かなしい' },
  { slug: 'default', emotion: 'love', emoji: '❤️', label: 'すき' },
];

interface StickerPickerProps {
  characterSlug: string;
  isOpen: boolean;
  onClose: () => void;
  onSelect: (stickerUrl: string, label: string) => void;
  onBuyStickers?: () => void;
}

export function StickerPicker({ characterSlug, isOpen, onClose, onSelect, onBuyStickers }: StickerPickerProps) {
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  
  const stickers = STICKER_MAP[characterSlug] || DEFAULT_STICKERS;
  
  const handleSelect = useCallback((sticker: StickerDef) => {
    const url = `/stickers/${sticker.slug}-${sticker.emotion}.png`;
    onSelect(url, sticker.label);
    onClose();
  }, [onSelect, onClose]);

  const handleImageError = useCallback((key: string) => {
    setFailedImages(prev => new Set([...prev, key]));
  }, []);
  
  if (!isOpen) return null;

  return (
    <div className="absolute bottom-full left-0 right-0 mb-2 z-30">
      <div className="bg-gray-900/95 backdrop-blur-md border border-white/10 rounded-2xl p-3 shadow-2xl mx-2">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-xs text-gray-400 font-medium">スタンプ</span>
          <div className="flex items-center gap-2">
            <a
              href="/coins"
              className="text-[10px] px-2 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30 transition-colors"
            >
              🛍 購入する
            </a>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-white transition-colors text-sm"
            >
              ✕
            </button>
          </div>
        </div>
        
        {/* スタンプグリッド */}
        <div className="grid grid-cols-4 gap-2">
          {stickers.map((sticker) => {
            const key = `${sticker.slug}-${sticker.emotion}`;
            const isFailed = failedImages.has(key);
            
            return (
              <button
                key={key}
                onClick={() => handleSelect(sticker)}
                className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-white/10 active:bg-white/20 transition-colors"
              >
                {isFailed ? (
                  <span className="text-3xl">{sticker.emoji}</span>
                ) : (
                  <Image
                    src={`/stickers/${sticker.slug}-${sticker.emotion}.png`}
                    alt={sticker.label}
                    width={56}
                    height={56}
                    className="rounded-lg"
                    onError={() => handleImageError(key)}
                    unoptimized
                  />
                )}
                <span className="text-[10px] text-gray-400">{sticker.label}</span>
              </button>
            );
          })}
        </div>
        {/* スタンプ購入フッター */}
        {onBuyStickers && (
          <div className="mt-2 pt-2 border-t border-white/10">
            <button
              onClick={() => { onClose(); onBuyStickers(); }}
              className="w-full text-center text-xs text-purple-400 hover:text-purple-300 py-1 transition-colors"
            >
              スタンプを購入する
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
