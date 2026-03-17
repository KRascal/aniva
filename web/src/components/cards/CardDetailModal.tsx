'use client';

import Image from 'next/image';
import React, { useRef, useState } from 'react';
import { type OwnedCard, getRarityStyle } from './cards-types';

export function CardDetailModal({ card, onClose }: { card: OwnedCard; onClose: () => void }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [mouse, setMouse] = useState({ x: 0.5, y: 0.5 });
  const [isDragging, setIsDragging] = useState(false);

  const rarity = card.card.rarity;
  const style = getRarityStyle(rarity);
  const isHolo = ['SR', 'SSR', 'UR'].includes(rarity);
  const isUR = rarity === 'UR';
  const isSSRPlus = ['SSR', 'UR'].includes(rarity);

  const rotX = (mouse.y - 0.5) * -20;
  const rotY = (mouse.x - 0.5) * 20;

  const handleMove = (clientX: number, clientY: number) => {
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    setMouse({
      x: Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (clientY - rect.top) / rect.height)),
    });
  };

  return (
    <div
      className="fixed inset-0 z-[90] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4"
      onClick={onClose}
    >
      <style>{`
        @keyframes modalCardAppear {
          0% { transform: perspective(800px) rotateY(-30deg) scale(0.7); opacity: 0; }
          100% { transform: perspective(800px) rotateY(0deg) scale(1); opacity: 1; }
        }
        @keyframes starTwinkle {
          0%, 100% { opacity: 0.2; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>

      {/* 3D Card */}
      <div
        ref={cardRef}
        className="relative cursor-grab active:cursor-grabbing"
        style={{
          width: 260,
          aspectRatio: '3/4',
          transform: `perspective(800px) rotateX(${rotX}deg) rotateY(${rotY}deg)`,
          transition: isDragging ? 'none' : 'transform 0.4s ease',
          transformStyle: 'preserve-3d',
          animation: 'modalCardAppear 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        }}
        onClick={e => e.stopPropagation()}
        onMouseMove={e => { setIsDragging(true); handleMove(e.clientX, e.clientY); }}
        onMouseLeave={() => { setIsDragging(false); setMouse({ x: 0.5, y: 0.5 }); }}
        onTouchMove={e => { setIsDragging(true); handleMove(e.touches[0].clientX, e.touches[0].clientY); }}
        onTouchEnd={() => { setIsDragging(false); setMouse({ x: 0.5, y: 0.5 }); }}
      >
        <div
          className={`w-full h-full rounded-2xl overflow-hidden border-2 ${style.border}`}
          style={{
            boxShadow: [
              `0 0 30px ${isUR ? 'rgba(255,200,50,0.5)' : isSSRPlus ? 'rgba(168,85,247,0.4)' : 'rgba(0,0,0,0.3)'}`,
              `0 20px 60px rgba(0,0,0,0.5)`,
              `0 0 80px ${isUR ? 'rgba(255,180,0,0.3)' : 'transparent'}`,
            ].join(', '),
          }}
        >
          {/* Image */}
          {card.card.imageUrl ? (
            <Image src={card.card.imageUrl} alt={card.card.name} fill className="object-cover object-top" unoptimized />
          ) : card.card.character?.avatarUrl ? (
            <Image src={card.card.character.avatarUrl} alt={card.card.name} fill className="object-cover object-top" unoptimized />
          ) : (
            <div className={`absolute inset-0 bg-gradient-to-br ${style.bg} opacity-40`} />
          )}

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

          {/* Rarity badge */}
          <div className={`absolute top-3 right-3 px-2.5 py-1 rounded-lg text-sm font-black bg-gradient-to-r ${style.bg} text-white shadow-lg z-10`}>
            {rarity}
          </div>

          {/* Name + info */}
          <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
            <p className="text-white font-bold text-lg drop-shadow-lg">{card.card.name}</p>
            {card.card.character && <p className="text-purple-300 text-sm">{card.card.character.name}</p>}
          </div>

          {/* Hologram overlay */}
          {isHolo && (
            <div
              className="absolute inset-0 z-20 pointer-events-none"
              style={{
                background: `conic-gradient(from ${mouse.x * 360}deg at ${mouse.x * 100}% ${mouse.y * 100}%, #ff008060, #ff8c0060, #40e0d060, #0080ff60, #8800ff60, #ff008060)`,
                opacity: isDragging ? (isUR ? 0.5 : 0.35) : 0.12,
                mixBlendMode: 'color-dodge',
                transition: isDragging ? 'none' : 'opacity 0.5s ease',
              }}
            />
          )}

          {/* Mouse-follow light */}
          <div
            className="absolute inset-0 z-20 pointer-events-none"
            style={{
              background: `radial-gradient(circle at ${mouse.x * 100}% ${mouse.y * 100}%, rgba(255,255,255,0.2) 0%, transparent 50%)`,
              transition: isDragging ? 'none' : 'background 0.5s ease',
            }}
          />

          {/* Sparkles for SSR/UR */}
          {isSSRPlus && Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="absolute z-30 pointer-events-none"
              style={{
                width: i % 3 === 0 ? 5 : 3,
                height: i % 3 === 0 ? 5 : 3,
                borderRadius: '50%',
                background: 'white',
                left: `${8 + i * 7.5}%`,
                top: `${10 + Math.sin(i * 1.5) * 35 + Math.cos(i * 0.7) * 15}%`,
                opacity: isDragging ? 0.9 : 0.3,
                boxShadow: isUR
                  ? '0 0 8px 3px rgba(255,200,50,0.9), 0 0 16px rgba(255,180,0,0.5)'
                  : '0 0 6px white, 0 0 12px rgba(255,255,255,0.5)',
                transform: `translate(${(mouse.x - 0.5) * 12}px, ${(mouse.y - 0.5) * 12}px)`,
                transition: isDragging ? 'transform 0.05s ease, opacity 0.15s ease' : 'all 0.5s ease',
                animation: `starTwinkle ${1.5 + i * 0.2}s ease-in-out infinite ${i * 0.15}s`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Card info below */}
      <div className="mt-6 text-center max-w-[280px]" onClick={e => e.stopPropagation()}>
        <h3 className="text-white text-xl font-bold mb-1">{card.card.name}</h3>
        {card.card.character && <p className="text-purple-400 text-sm mb-2">{card.card.character.name}</p>}
        {card.card.description && <p className="text-white/50 text-sm mb-3 leading-relaxed">{card.card.description}</p>}
        <p className="text-white/25 text-xs mb-4">入手: {new Date(card.obtainedAt).toLocaleDateString('ja-JP')}</p>
        <button
          onClick={onClose}
          className="px-8 py-2.5 bg-white/10 hover:bg-white/15 text-white rounded-full text-sm font-medium transition-colors border border-white/10"
        >
          閉じる
        </button>
      </div>
    </div>
  );
}
