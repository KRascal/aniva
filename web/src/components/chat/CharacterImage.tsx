'use client';

import Image from 'next/image';
import { useState } from 'react';

interface CharacterImageProps {
  src: string;
  alt: string;
  characterName: string;
}

export default function CharacterImage({ src, alt, characterName }: CharacterImageProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  return (
    <>
      <div 
        className="relative cursor-pointer group"
        onClick={() => setIsExpanded(true)}
      >
        <div className="w-48 h-48 rounded-xl overflow-hidden border border-gray-700">
          <img
            src={src}
            alt={alt}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
          />
        </div>
        <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm rounded-lg px-2 py-1">
          <span className="text-xs text-gray-300">📸 {characterName}の自撮り</span>
        </div>
      </div>
      
      {/* フルスクリーンモーダル */}
      {isExpanded && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setIsExpanded(false)}
        >
          <img
            src={src}
            alt={alt}
            className="max-w-full max-h-full object-contain rounded-xl"
          />
          <button
            className="absolute top-4 right-4 text-white text-2xl"
            onClick={() => setIsExpanded(false)}
          >
            ✕
          </button>
        </div>
      )}
    </>
  );
}
