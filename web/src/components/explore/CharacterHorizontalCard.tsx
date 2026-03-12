'use client';

import { useState } from 'react';
import { CountdownTimer } from '@/components/proactive/CountdownTimer';
import { FranchiseBadge } from './FranchiseBadge';
import { FollowButton } from './FollowButton';
import { CARD_GRADIENTS } from '@/app/explore/explore-data';
import type { Character, RelationshipInfo } from '@/app/explore/explore-data';

export interface CharacterHorizontalCardProps {
  character: Character;
  index: number;
  relationship?: RelationshipInfo;
  onFollow: (id: string, following: boolean) => void;
  onClick: () => void;
  proactiveMessage?: { content: string; expiresAt: string } | null;
}

// Horizontal card — glassmorphism hover
export function CharacterHorizontalCard({
  character,
  index,
  relationship,
  onFollow,
  onClick,
  proactiveMessage,
}: CharacterHorizontalCardProps) {
  const gradient = CARD_GRADIENTS[index % CARD_GRADIENTS.length];
  const catchphrase = character.catchphrases?.[0] ?? null;
  const isFollowing = relationship?.isFollowing ?? false;
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="flex items-center gap-4 rounded-2xl p-4 cursor-pointer border"
      style={{
        background: hovered ? 'rgba(139,92,246,0.08)' : 'rgba(255,255,255,0.03)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderColor: hovered ? 'rgba(139,92,246,0.35)' : 'rgba(255,255,255,0.07)',
        transform: hovered ? 'translateY(-3px)' : 'translateY(0)',
        boxShadow: hovered ? '0 12px 40px rgba(0,0,0,0.3), 0 0 20px rgba(139,92,246,0.15)' : '0 2px 8px rgba(0,0,0,0.2)',
        transition: 'all 0.3s cubic-bezier(0.22,1,0.36,1)',
      }}
    >
      {/* Avatar */}
      <div className="flex-shrink-0 relative">
        {character.avatarUrl ? (
          <img
            src={character.avatarUrl}
            alt={character.name}
            className="w-16 h-16 rounded-full object-cover"
            style={{
              transform: hovered ? 'scale(1.06)' : 'scale(1)',
              transition: 'transform 0.3s ease',
              boxShadow: hovered ? '0 4px 16px rgba(139,92,246,0.3)' : 'none',
            }}
          />
        ) : (
          <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-xl font-bold text-white`}>
            {character.name.charAt(0)}
          </div>
        )}
        {/* Online dot */}
        <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-green-400 rounded-full ring-2 ring-gray-950 animate-pulse" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-white font-bold text-base leading-tight">{character.name}</p>
          {proactiveMessage && (
            <span
              className="flex-shrink-0 flex items-center gap-0.5 text-xs font-bold px-1.5 py-0.5 rounded-full"
              style={{
                background: 'linear-gradient(135deg, rgba(236,72,153,0.9), rgba(139,92,246,0.9))',
                color: 'white',
                boxShadow: '0 1px 6px rgba(236,72,153,0.5)',
              }}
            >
              <span className="w-1 h-1 rounded-full bg-white animate-pulse" />
              新着
            </span>
          )}
        </div>
        <div className="mb-1">
          <FranchiseBadge franchise={character.franchise} />
        </div>
        {proactiveMessage ? (
          <div>
            <p className="text-pink-300/90 text-xs italic truncate">「{proactiveMessage.content}」</p>
            <CountdownTimer expiresAt={proactiveMessage.expiresAt} className="text-[10px] text-pink-400/70 mt-0.5" />
          </div>
        ) : catchphrase ? (
          <p className="text-gray-400 text-xs italic truncate">&ldquo;{catchphrase}&rdquo;</p>
        ) : null}
        {(character.followerCount ?? 0) > 0 && !proactiveMessage && (
          <p className="text-gray-500 text-[10px] mt-0.5">
            {(character.followerCount ?? 0).toLocaleString()} フォロワー
          </p>
        )}
      </div>

      {/* Follow button */}
      <div onClick={(e) => e.stopPropagation()}>
        <FollowButton
          characterId={character.id}
          initialFollowing={isFollowing}
          onFollow={onFollow}
        />
      </div>
    </div>
  );
}
