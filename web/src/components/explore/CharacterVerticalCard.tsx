'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getDailyState } from '@/lib/character-daily-state';
import { CountdownTimer } from '@/components/proactive/CountdownTimer';
import { Character, RelationshipInfo } from './types';
import { CARD_GRADIENTS } from './constants';
import { FranchiseBadge } from './FranchiseBadge';
import { FollowButton } from './FollowButton';

export interface CharacterVerticalCardProps {
  character: Character;
  index: number;
  relationship?: RelationshipInfo;
  onFollow: (id: string, following: boolean) => void;
  onClick: () => void;
  proactiveMessage?: { content: string; expiresAt: string } | null;
  showChatButton?: boolean;
}

const GOLD_HOLO_FRANCHISES = ['ONE PIECE', '呪術廻戦', '鬼滅の刃'];
const SILVER_HOLO_FRANCHISES = ['ドラゴンボール', 'NARUTO'];

// Tall vertical card (Instagram Reels style) — glassmorphism + hover lift
export function CharacterVerticalCard({
  character,
  index,
  relationship,
  onFollow,
  onClick,
  proactiveMessage,
  showChatButton,
}: CharacterVerticalCardProps) {
  const router = useRouter();
  const gradient = CARD_GRADIENTS[index % CARD_GRADIENTS.length];
  const catchphrase = character.catchphrases?.[0] ?? null;
  const isFollowing = relationship?.isFollowing ?? false;
  const isFanclub = relationship?.isFanclub ?? false;
  const [hovered, setHovered] = useState(false);
  const [mouseX, setMouseX] = useState(0.5);
  const [mouseY, setMouseY] = useState(0.5);

  // Franchise-based rarity for hologram effect
  const franchise = character.franchise ?? '';
  const cardRarity = GOLD_HOLO_FRANCHISES.some((f) => franchise.includes(f))
    ? 'gold'
    : SILVER_HOLO_FRANCHISES.some((f) => franchise.includes(f))
    ? 'silver'
    : 'normal';

  const holoGradient =
    cardRarity === 'gold'
      ? `radial-gradient(circle at ${mouseX * 100}% ${mouseY * 100}%, rgba(255,215,0,0.65) 0%, rgba(255,140,0,0.45) 15%, rgba(255,105,180,0.35) 30%, rgba(138,43,226,0.25) 50%, transparent 70%)`
      : cardRarity === 'silver'
      ? `radial-gradient(circle at ${mouseX * 100}% ${mouseY * 100}%, rgba(220,230,255,0.7) 0%, rgba(100,180,255,0.45) 20%, rgba(160,120,255,0.3) 40%, transparent 70%)`
      : `radial-gradient(circle at ${mouseX * 100}% ${mouseY * 100}%, rgba(255,255,255,0.45) 0%, rgba(100,200,255,0.25) 20%, rgba(200,100,255,0.2) 40%, transparent 70%)`;

  const tiltX = hovered ? (mouseY - 0.5) * -30 : 0;
  const tiltY = hovered ? (mouseX - 0.5) * 30 : 0;

  const depthShadow =
    cardRarity === 'gold'
      ? `0 ${20 + tiltX * 0.5}px 60px rgba(0,0,0,0.7), 0 0 40px rgba(255,180,0,0.35), 0 0 15px rgba(255,215,0,0.2)`
      : cardRarity === 'silver'
      ? `0 ${20 + tiltX * 0.5}px 60px rgba(0,0,0,0.7), 0 0 40px rgba(100,180,255,0.35), 0 0 15px rgba(200,220,255,0.2)`
      : `0 ${20 + tiltX * 0.5}px 60px rgba(0,0,0,0.6), 0 0 30px rgba(139,92,246,0.3)`;

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setMouseX(0.5); setMouseY(0.5); }}
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setMouseX((e.clientX - rect.left) / rect.width);
        setMouseY((e.clientY - rect.top) / rect.height);
      }}
      onTouchStart={() => setHovered(true)}
      onTouchMove={(e) => {
        const touch = e.touches[0];
        const rect = e.currentTarget.getBoundingClientRect();
        setMouseX((touch.clientX - rect.left) / rect.width);
        setMouseY((touch.clientY - rect.top) / rect.height);
      }}
      onTouchEnd={() => { setHovered(false); setMouseX(0.5); setMouseY(0.5); }}
      className="relative flex-shrink-0 w-44 cursor-pointer"
      style={{
        transform: hovered
          ? `perspective(600px) translateY(-8px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`
          : 'perspective(600px) translateY(0) rotateX(0deg) rotateY(0deg)',
        transition: hovered
          ? 'transform 0.08s ease-out'
          : 'transform 0.35s cubic-bezier(0.22,1,0.36,1)',
        transformStyle: 'preserve-3d',
        willChange: 'transform',
      }}
    >
      {/* Glow shadow on hover */}
      <div
        className="absolute -inset-1 rounded-3xl opacity-0 transition-opacity duration-300 pointer-events-none"
        style={{
          opacity: hovered ? 0.6 : 0,
          background: 'radial-gradient(ellipse at center, rgba(139,92,246,0.4) 0%, transparent 70%)',
          filter: 'blur(8px)',
        }}
      />

      {/* Card */}
      <div
        className="relative h-64 rounded-2xl overflow-hidden"
        style={{
          boxShadow: hovered ? depthShadow : '0 8px 32px rgba(0,0,0,0.4)',
          transition: 'box-shadow 0.35s ease',
        }}
      >
        {/* Background image */}
        {character.coverUrl ? (
          <img
            src={character.coverUrl}
            alt={character.name}
            className="absolute inset-0 w-full h-full object-cover"
            style={{
              transform: hovered ? 'scale(1.08)' : 'scale(1.02)',
              transition: 'transform 0.6s cubic-bezier(0.22,1,0.36,1)',
            }}
          />
        ) : character.avatarUrl ? (
          <img
            src={character.avatarUrl}
            alt={character.name}
            className="absolute inset-0 w-full h-full object-cover"
            style={{
              filter: 'brightness(0.65) saturate(1.4)',
              transform: hovered ? 'scale(1.12)' : 'scale(1.08)',
              transition: 'transform 0.6s cubic-bezier(0.22,1,0.36,1)',
            }}
          />
        ) : (
          <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`} />
        )}

        {/* Multi-layer overlay — richer depth */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent" />
        {/* Iridescent tint on hover */}
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-300"
          style={{
            opacity: hovered ? 0.15 : 0,
            background: 'linear-gradient(135deg, rgba(139,92,246,0.6) 0%, rgba(236,72,153,0.4) 50%, rgba(251,146,60,0.3) 100%)',
          }}
        />

        {/* Hologram gloss overlay — cursor-tracking rainbow sheen */}
        <div
          className="absolute inset-0 pointer-events-none z-10"
          style={{
            opacity: hovered ? (cardRarity === 'normal' ? 0.4 : 0.55) : 0,
            background: holoGradient,
            transition: hovered ? 'opacity 0.15s ease, background 0.06s ease' : 'opacity 0.3s ease',
            mixBlendMode: 'screen',
          }}
        />
        {/* Rainbow shimmer stripe for gold/silver rarity */}
        {cardRarity !== 'normal' && (
          <div
            className="absolute inset-0 pointer-events-none z-10"
            style={{
              opacity: hovered ? 0.25 : 0,
              background: cardRarity === 'gold'
                ? `linear-gradient(${mouseX * 180}deg, rgba(255,0,128,0.4) 0%, rgba(255,165,0,0.4) 25%, rgba(0,255,128,0.3) 50%, rgba(0,128,255,0.4) 75%, rgba(255,0,255,0.4) 100%)`
                : `linear-gradient(${mouseX * 180}deg, rgba(200,220,255,0.5) 0%, rgba(100,200,255,0.4) 25%, rgba(180,160,255,0.3) 50%, rgba(220,240,255,0.4) 75%, rgba(150,180,255,0.5) 100%)`,
              transition: hovered ? 'opacity 0.15s ease, background 0.1s ease' : 'opacity 0.3s ease',
              mixBlendMode: 'screen',
            }}
          />
        )}

        {/* オンラインドット */}
        <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1 bg-black/50 rounded-full px-1.5 py-0.5 backdrop-blur-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse shadow-sm shadow-green-400/50" />
          <span className="text-[10px] text-green-300/80 font-medium">ONLINE</span>
        </div>

        {/* プロアクティブメッセージバッジ（新着あり） */}
        {proactiveMessage && (
          <div className="absolute top-2.5 left-2.5 z-10 flex flex-col gap-1">
            <div
              className="flex items-center gap-1 rounded-full px-2 py-0.5"
              style={{
                background: 'linear-gradient(135deg, rgba(236,72,153,0.95), rgba(139,92,246,0.95))',
                boxShadow: '0 2px 8px rgba(236,72,153,0.5)',
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              <span className="text-[10px] text-white font-bold">NEW MSG</span>
            </div>
            <CountdownTimer expiresAt={proactiveMessage.expiresAt} className="text-[10px] text-pink-300/90 font-semibold px-1" />
          </div>
        )}

        {/* Glassmorphism overlay card at bottom */}
        <div
          className="absolute bottom-0 left-0 right-0 p-3"
          style={{
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.2) 60%, transparent 100%)',
          }}
        >
          {/* Franchise badge */}
          <div className="mb-1.5">
            <FranchiseBadge franchise={character.franchise} />
          </div>

          <p className="text-white font-bold text-sm leading-tight mb-1">{character.name}</p>
          {/* 今日のキャラ状態バッジ */}
          {(() => {
            const state = getDailyState(character.slug ?? character.id);
            return (
              <div className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 mb-1 text-xs font-medium ${
                state.isRareDay
                  ? 'bg-yellow-500/30 border border-yellow-500/50 text-yellow-300'
                  : state.energy === 'high'
                  ? 'bg-purple-600/20 border border-purple-500/30 text-purple-300'
                  : 'bg-gray-700/40 border border-gray-600/30 text-gray-400'
              }`}>
                <span>{state.moodEmoji}</span>
                <span>{state.mood}</span>
              </div>
            );
          })()}
          {catchphrase && (
            <p className="text-white/65 text-[10px] leading-tight line-clamp-2 mb-1 italic">
              &ldquo;{catchphrase}&rdquo;
            </p>
          )}
          {(character.followerCount ?? 0) > 0 && (
            <p className="text-white/45 text-xs mb-1.5">
              {(character.followerCount ?? 0).toLocaleString()} フォロワー
            </p>
          )}
          <div onClick={(e) => e.stopPropagation()}>
            <FollowButton
              characterId={character.id}
              initialFollowing={isFollowing}
              onFollow={onFollow}
            />
          </div>
          {showChatButton && (
            <button
              onClick={(e) => { e.stopPropagation(); router.push(`/chat/${character.slug}`); }}
              className="mt-2 w-full px-3 py-1.5 text-xs font-bold text-white rounded-full transition-all active:scale-95"
              style={{
                background: 'linear-gradient(135deg, rgba(139,92,246,0.9), rgba(236,72,153,0.9))',
                boxShadow: '0 2px 8px rgba(139,92,246,0.4)',
              }}
            >
              チャット →
            </button>
          )}
        </div>

        {/* Fanclub badge */}
        {isFanclub && (
          <div className="absolute top-2 left-2 flex items-center gap-1 text-white text-xs font-bold px-2 py-0.5 rounded-full"
            style={{ background: 'linear-gradient(135deg, rgba(236,72,153,0.9), rgba(139,92,246,0.9))', boxShadow: '0 2px 8px rgba(236,72,153,0.5)' }}
          >
            推し
          </div>
        )}

        {/* Avatar circle */}
        <div className="absolute top-3 right-3">
          {character.avatarUrl ? (
            <img
              src={character.avatarUrl}
              alt={character.name}
              className="w-10 h-10 rounded-full object-cover"
              style={{ boxShadow: '0 0 0 2px rgba(255,255,255,0.3), 0 4px 12px rgba(0,0,0,0.5)' }}
            />
          ) : (
            <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-base font-bold text-white`}
              style={{ boxShadow: '0 0 0 2px rgba(255,255,255,0.3)' }}
            >
              {character.name.charAt(0)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
