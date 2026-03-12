'use client';

import React, { useRef, useState } from 'react';
import { type OwnedCard, getRarityStyle } from './cards-types';

export function HoloCardThumbnail({ oc, onClick }: { oc: OwnedCard; onClick: () => void }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [mouse, setMouse] = useState({ x: 0.5, y: 0.5 });
  const [isHovering, setIsHovering] = useState(false);

  const rarity = oc.card.rarity;
  const style = getRarityStyle(rarity);
  const isHolo = ['SR', 'SSR', 'UR'].includes(rarity);
  const isSSRPlus = ['SSR', 'UR'].includes(rarity);
  const isUR = rarity === 'UR';

  const rotX = isHovering ? (mouse.y - 0.5) * -12 : 0;
  const rotY = isHovering ? (mouse.x - 0.5) * 12 : 0;

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    setMouse({
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    });
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => { setIsHovering(false); setMouse({ x: 0.5, y: 0.5 }); }}
      onClick={onClick}
      style={{
        aspectRatio: '3/4',
        transform: `perspective(600px) rotateX(${rotX}deg) rotateY(${rotY}deg)`,
        transition: isHovering ? 'transform 0.08s ease' : 'transform 0.5s ease',
        transformStyle: 'preserve-3d',
        willChange: 'transform',
        boxShadow: [
          '0 0 0 1px rgba(255,255,255,0.08)',
          '0 4px 8px rgba(0,0,0,0.4)',
          '0 8px 16px rgba(0,0,0,0.3)',
          '0 16px 32px rgba(0,0,0,0.15)',
        ].join(', '),
        borderRadius: '12px',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
      }}
      className={`bg-gray-900 border active:scale-95 transition-[transform,box-shadow] ${style.border} ${style.glow}`}
    >
      {/* Card image or avatar fallback */}
      {oc.card.imageUrl ? (
        <img src={oc.card.imageUrl} alt={oc.card.name} className="absolute inset-0 w-full h-full object-cover object-top" />
      ) : oc.card.character?.avatarUrl ? (
        <img src={oc.card.character.avatarUrl} alt={oc.card.name} className="absolute inset-0 w-full h-full object-cover object-top" />
      ) : (
        <div className={`absolute inset-0 bg-gradient-to-br ${style.bg} opacity-30`} />
      )}

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

      {/* Rarity badge */}
      <div className={`absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded text-xs font-black bg-gradient-to-r ${style.bg} text-white shadow-sm z-10`}>
        {rarity}
      </div>

      {/* Card name */}
      <div className="absolute bottom-0 left-0 right-0 p-2 z-10">
        <p className="text-white text-xs font-bold truncate drop-shadow">{oc.card.name}</p>
        {oc.card.character && (
          <p className="text-white/50 text-xs truncate">{oc.card.character.name}</p>
        )}
      </div>

      {/* ホログラムオーバーレイ（SR以上） */}
      {isHolo && (
        <div
          style={{
            position: 'absolute', inset: 0,
            background: `conic-gradient(from ${mouse.x * 360}deg, #ff0080, #ff8c00, #40e0d0, #0080ff, #8800ff, #ff0080)`,
            opacity: isUR ? (isHovering ? 0.45 : 0.15) : (isHovering ? 0.3 : 0.08),
            mixBlendMode: 'color-dodge',
            transition: isHovering ? 'opacity 0.2s ease' : 'opacity 0.5s ease',
            pointerEvents: 'none',
            zIndex: 5,
          }}
        />
      )}

      {/* マウス追従ライト */}
      <div
        style={{
          position: 'absolute', inset: 0,
          background: `radial-gradient(circle at ${mouse.x * 100}% ${mouse.y * 100}%, rgba(255,255,255,0.15) 0%, transparent 55%)`,
          pointerEvents: 'none',
          zIndex: 6,
          transition: isHovering ? 'none' : 'background 0.5s ease',
        }}
      />

      {/* キラキラ星（SSR/UR） */}
      {isSSRPlus && Array.from({ length: 7 }).map((_, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            width: i % 3 === 0 ? 4 : 2,
            height: i % 3 === 0 ? 4 : 2,
            borderRadius: '50%',
            background: 'white',
            left: `${10 + i * 12}%`,
            top: `${15 + Math.sin(i * 1.2) * 35 + Math.cos(i * 0.8) * 12}%`,
            opacity: isHovering ? (i % 2 === 0 ? 0.95 : 0.7) : 0.2,
            boxShadow: isUR
              ? '0 0 6px 2px rgba(255,200,50,0.8), 0 0 12px rgba(255,180,0,0.5)'
              : '0 0 5px white, 0 0 10px rgba(255,255,255,0.5)',
            transform: `translate(${(mouse.x - 0.5) * 8}px, ${(mouse.y - 0.5) * 8}px)`,
            transition: isHovering ? 'transform 0.08s ease, opacity 0.2s ease' : 'all 0.5s ease',
            pointerEvents: 'none',
            zIndex: 7,
          }}
        />
      ))}
    </div>
  );
}
