'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { track, EVENTS } from '@/lib/analytics';
import { DailyBonus } from '@/components/DailyBonus';
import { ProactiveMessagePanel } from '@/components/proactive/ProactiveMessagePanel';
import { getTodayMainEvent } from '@/lib/today-events';
import { getDailyState } from '@/lib/character-daily-state';
import { useMissionTrigger } from '@/hooks/useMissionTrigger';
import { useProactiveMessages } from '@/hooks/useProactiveMessages';
import { CountdownTimer } from '@/components/proactive/CountdownTimer';
import { useTutorial } from '@/hooks/useTutorial';
import { TutorialOverlay } from '@/components/tutorial/TutorialOverlay';
import { SwipeModal } from '@/components/discover/SwipeModal';
import { FadeSection } from '@/components/explore/FadeSection';
import { GachaBannerSection } from '@/components/explore/GachaBannerSection';
import { RankingBannerSection } from '@/components/explore/RankingBannerSection';
import { PollBannerSection } from '@/components/explore/PollBannerSection';
import { ContentLinksSection } from '@/components/explore/ContentLinksSection';
import { LimitedScenariosSection } from '@/components/explore/LimitedScenariosSection';
import { TodayGreetingSection } from '@/components/explore/TodayGreetingSection';
import { getBirthdayCountdown } from '@/lib/birthday-utils';


interface Character {
  id: string;
  name: string;
  nameEn: string | null;
  slug: string;
  franchise: string;
  franchiseEn: string | null;
  description: string | null;
  avatarUrl: string | null;
  coverUrl: string | null;
  catchphrases: string[];
  followerCount?: number;
  birthday?: string | null;
}

interface RelationshipInfo {
  characterId: string;
  level: number;
  levelName: string;
  xp: number;
  totalMessages: number;
  isFollowing: boolean;
  isFanclub: boolean;
}

// Franchise categories with gradient
const FRANCHISE_CATEGORIES = [
  { name: 'すべて', gradient: 'from-purple-500 to-pink-500' },
  { name: 'ONE PIECE', gradient: 'from-orange-500 to-red-500' },
  { name: 'アイシールド21', gradient: 'from-green-500 to-lime-500' },
  { name: '呪術廻戦', gradient: 'from-blue-500 to-indigo-600' },
  { name: '鬼滅の刃', gradient: 'from-pink-500 to-rose-600' },
  { name: 'ドラゴンボール', gradient: 'from-yellow-400 to-orange-500' },
  { name: 'NARUTO', gradient: 'from-orange-400 to-yellow-500' },
  { name: '進撃の巨人', gradient: 'from-gray-600 to-gray-800' },
  { name: 'アニメ', gradient: 'from-emerald-500 to-cyan-500' },
];

const FRANCHISE_META: Record<string, { gradient: string }> = {
  'ONE PIECE':    { gradient: 'from-orange-500 to-red-500' },
  'アイシールド21': { gradient: 'from-green-500 to-lime-500' },
  '呪術廻戦':     { gradient: 'from-blue-500 to-indigo-600' },
  '鬼滅の刃':     { gradient: 'from-pink-500 to-rose-600' },
  'ドラゴンボール':{ gradient: 'from-yellow-400 to-orange-500' },
  'NARUTO':       { gradient: 'from-orange-400 to-yellow-500' },
  '進撃の巨人':   { gradient: 'from-gray-500 to-gray-700' },
  'アニメ':       { gradient: 'from-emerald-500 to-cyan-500' },
};

const CARD_GRADIENTS = [
  'from-purple-600 via-pink-600 to-rose-500',
  'from-blue-600 via-cyan-500 to-teal-500',
  'from-orange-500 via-amber-500 to-yellow-400',
  'from-green-600 via-emerald-500 to-cyan-500',
  'from-indigo-600 via-violet-500 to-purple-500',
  'from-rose-600 via-red-500 to-orange-500',
];

/* ── Franchise Badge ── */
function FranchiseBadge({ franchise }: { franchise: string }) {
  const meta = FRANCHISE_META[franchise];
  if (!meta) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-bold px-1.5 py-0.5 rounded-full bg-white/15 text-white/70 border border-white/20">
        {franchise}
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center text-xs font-bold px-2 py-0.5 rounded-full bg-gradient-to-r ${meta.gradient} text-white shadow-sm`}>
      {franchise}
    </span>
  );
}

function FollowButton({
  characterId,
  initialFollowing,
  onFollow,
}: {
  characterId: string;
  initialFollowing: boolean;
  onFollow: (id: string, following: boolean) => void;
}) {
  const [loading, setLoading] = useState(false);

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setLoading(true);
    try {
      const res = await fetch(`/api/relationship/${characterId}/follow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ follow: !initialFollowing }),
      });
      if (res.ok) {
        const newFollowing = !initialFollowing;
        onFollow(characterId, newFollowing);
        if (newFollowing) {
          track(EVENTS.CHARACTER_FOLLOWED, { characterId });
          fetch(`/api/relationship/${characterId}/follow-welcome`, { method: 'POST' }).catch(() => {});
        }
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`
        flex-shrink-0 px-4 py-2 rounded-full text-xs font-bold transition-all duration-200 active:scale-95
        ${initialFollowing
          ? 'bg-white/10 text-white border border-white/25 hover:bg-red-900/30 hover:text-red-300 hover:border-red-500/40 hover:scale-105'
          : 'text-white hover:scale-105'
        }
        ${loading ? 'opacity-50' : ''}
      `}
      style={!initialFollowing ? {
        background: 'linear-gradient(135deg, rgba(139,92,246,0.9), rgba(236,72,153,0.9))',
        boxShadow: '0 2px 12px rgba(139,92,246,0.4)',
      } : undefined}
    >
      {loading ? '…' : initialFollowing ? 'フォロー中' : 'フォローする'}
    </button>
  );
}

// Tall vertical card (Instagram Reels style) — glassmorphism + hover lift
function CharacterVerticalCard({
  character,
  index,
  relationship,
  onFollow,
  onClick,
  proactiveMessage,
  showChatButton,
}: {
  character: Character;
  index: number;
  relationship?: RelationshipInfo;
  onFollow: (id: string, following: boolean) => void;
  onClick: () => void;
  proactiveMessage?: { content: string; expiresAt: string } | null;
  showChatButton?: boolean;
}) {
  const router = useRouter();
  const gradient = CARD_GRADIENTS[index % CARD_GRADIENTS.length];
  const catchphrase = character.catchphrases?.[0] ?? null;
  const isFollowing = relationship?.isFollowing ?? false;
  const isFanclub = relationship?.isFanclub ?? false;
  const [hovered, setHovered] = useState(false);
  const [mouseX, setMouseX] = useState(0.5);
  const [mouseY, setMouseY] = useState(0.5);

  // Franchise-based rarity for hologram effect
  const GOLD_HOLO_FRANCHISES = ['ONE PIECE', '呪術廻戦', '鬼滅の刃'];
  const SILVER_HOLO_FRANCHISES = ['ドラゴンボール', 'NARUTO'];
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

// Horizontal card — glassmorphism hover
function CharacterHorizontalCard({
  character,
  index,
  relationship,
  onFollow,
  onClick,
  proactiveMessage,
}: {
  character: Character;
  index: number;
  relationship?: RelationshipInfo;
  onFollow: (id: string, following: boolean) => void;
  onClick: () => void;
  proactiveMessage?: { content: string; expiresAt: string } | null;
}) {
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

// ── ミッション進捗バーセクション ──
function MissionProgressSection({
  completed,
  total,
}: {
  completed: number;
  total: number;
}) {
  const router = useRouter();
  const pct = total > 0 ? Math.min((completed / total) * 100, 100) : 0;
  const remaining = total - completed;
  const isAllDone = completed >= total && total > 0;
  const isNearDone = pct >= 80 && !isAllDone;

  return (
    <FadeSection delay={13}>
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-white font-bold text-base flex items-center gap-2">
            📋 今日のミッション
          </h3>
          <button
            onClick={() => { router.push('/mypage'); setTimeout(() => { const el = document.getElementById('daily-missions'); if (el) el.scrollIntoView({ behavior: 'smooth' }); }, 500); }}
            className="text-xs font-semibold"
            style={{ color: 'rgba(167,139,250,0.85)' }}
          >
            一覧 →
          </button>
        </div>

        <div
          className="rounded-2xl p-4 relative overflow-hidden"
          style={{
            background: isAllDone
              ? 'linear-gradient(135deg, rgba(16,185,129,0.18), rgba(6,182,212,0.12))'
              : isNearDone
              ? 'linear-gradient(135deg, rgba(245,158,11,0.18), rgba(251,191,36,0.12))'
              : 'rgba(255,255,255,0.04)',
            border: isAllDone
              ? '1px solid rgba(16,185,129,0.35)'
              : isNearDone
              ? '1px solid rgba(245,158,11,0.35)'
              : '1px solid rgba(255,255,255,0.08)',
          }}
        >
          {/* 花火エフェクト（全完了時） */}
          {isAllDone && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {[...Array(14)].map((_, i) => (
                <div
                  key={i}
                  className="absolute rounded-full"
                  style={{
                    width: 3 + (i % 3),
                    height: 3 + (i % 3),
                    left: `${8 + i * 6.5}%`,
                    top: '60%',
                    background: ['#f59e0b', '#10b981', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'][i % 6],
                    animation: `missionFw${i % 4 + 1} 1.4s ease-out ${i * 0.07}s infinite`,
                  }}
                />
              ))}
            </div>
          )}

          {/* ステータス行 */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex-1 min-w-0">
              <p
                className={`font-bold text-sm ${
                  isAllDone ? 'text-emerald-300' : isNearDone ? 'text-yellow-300' : 'text-white'
                }`}
              >
                {isAllDone
                  ? '全ミッションクリア'
                  : isNearDone
                  ? `あと${remaining}個で達成`
                  : `${completed} / ${total} ミッション完了`}
              </p>
              {!isAllDone && (
                <p className="text-white/45 text-xs mt-0.5">
                  {isNearDone
                    ? '今日中にクリアしてボーナスを獲得'
                    : 'ミッション達成でコインを獲得'}
                </p>
              )}
              {isAllDone && (
                <p className="text-emerald-400/70 text-xs mt-0.5">
                  今日のボーナスコインを全て獲得しました
                </p>
              )}
            </div>
            <span
              className={`text-xs font-bold px-2.5 py-1 rounded-full ml-3 flex-shrink-0 ${
                isAllDone
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : isNearDone
                  ? 'bg-yellow-500/20 text-yellow-300'
                  : 'bg-white/10 text-white/60'
              }`}
            >
              {Math.round(pct)}%
            </span>
          </div>

          {/* プログレスバー */}
          <div
            className="h-2.5 rounded-full overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.08)' }}
          >
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${pct}%`,
                background: isAllDone
                  ? 'linear-gradient(90deg, #10b981, #06b6d4)'
                  : isNearDone
                  ? 'linear-gradient(90deg, #f59e0b, #fbbf24)'
                  : 'linear-gradient(90deg, #8b5cf6, #ec4899)',
                boxShadow: isAllDone
                  ? '0 0 10px rgba(16,185,129,0.6)'
                  : isNearDone
                  ? '0 0 10px rgba(245,158,11,0.6)'
                  : '0 0 8px rgba(139,92,246,0.5)',
              }}
            />
          </div>

          {/* ミッションドット（6個以下の場合） */}
          {total > 0 && total <= 6 && (
            <div className="flex gap-2 mt-3 justify-center">
              {Array.from({ length: total }, (_, i) => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full transition-all duration-300"
                  style={{
                    background:
                      i < completed
                        ? isAllDone
                          ? '#10b981'
                          : isNearDone
                          ? '#f59e0b'
                          : '#8b5cf6'
                        : 'rgba(255,255,255,0.15)',
                    transform: i < completed ? 'scale(1.2)' : 'scale(1)',
                    boxShadow: i < completed
                      ? isNearDone
                        ? '0 0 4px rgba(245,158,11,0.6)'
                        : '0 0 4px rgba(139,92,246,0.5)'
                      : 'none',
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </FadeSection>
  );
}

export default function ExplorePage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();

  // ミッション「キャラを探す」自動完了
  useMissionTrigger('explore_visit');

  // ポストオンボーディング・チュートリアル
  const { tutorialState, initialized: tutorialInitialized, advanceTutorial, skipTutorial, completeTutorial } = useTutorial(
    session?.user?.onboardingStep,
    session?.user?.nickname,
  );

  const [characters, setCharacters] = useState<Character[]>([]);
  const [relationships, setRelationships] = useState<Map<string, RelationshipInfo>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [scrollY, setScrollY] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('すべて');
  const [incompleteMissions, setIncompleteMissions] = useState(0);
  const [missionHint, setMissionHint] = useState('');
  const [missionProgress, setMissionProgress] = useState<{ completed: number; total: number } | null>(null);
  const [freeGachaAvailable, setFreeGachaAvailable] = useState(false);
  const [exploreActivePollCount, setExploreActivePollCount] = useState(0);

  // パララックススクロール検知
  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // プロアクティブメッセージ（未読マップ: characterId → message）
  const { messages: proactiveMsgs } = useProactiveMessages();
  const proactiveUnreadMap = new Map<string, { content: string; expiresAt: string }>(
    proactiveMsgs
      .filter(m => !m.isRead)
      .map(m => [m.characterId, { content: m.content, expiresAt: m.expiresAt }])
  );

  // オンボーディング未完了ならリダイレクト（stale JWT対策: proxyをバイパスした場合のフォールバック）
  useEffect(() => {
    if (status === 'authenticated') {
      const step = session?.user?.onboardingStep;
      if (step !== 'completed') {
        // JWTがstaleかもしれない → update()でDB最新を取得してから再判定
        update().then((updated) => {
          const updatedStep = updated?.user?.onboardingStep;
          if (updatedStep !== 'completed') {
            router.push('/onboarding');
          }
        });
      }
    }
  }, [status, session, update, router]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  // 未完了ミッション数を取得
  useEffect(() => {
    if (status !== 'authenticated') return;
    fetch('/api/missions')
      .then(r => r.json())
      .then(data => {
        const allMissions = (data.missions ?? []) as { completed: boolean }[];
        const allWeekly = (data.weeklyMissions ?? []) as { completed: boolean }[];
        const totalMissions = allMissions.length + allWeekly.length;
        const completedMissions =
          allMissions.filter(m => m.completed).length +
          allWeekly.filter(m => m.completed).length;
        const incomplete = totalMissions - completedMissions;
        setIncompleteMissions(incomplete);
        setMissionProgress({ completed: completedMissions, total: totalMissions });
        if (incomplete === 1) setMissionHint('あと1個でコイン獲得！急げ！');
        else if (incomplete === 2) setMissionHint('あと2個！今日中にクリアしよう');
        else if (incomplete > 0) setMissionHint(`${incomplete}個の未完了ミッション`);
      })
      .catch(() => {});
  }, [status]);

  useEffect(() => {
    if (status === 'authenticated') {
      // ガチャ無料状態を取得
      fetch('/api/gacha/banners')
        .then(r => r.json())
        .then(data => setFreeGachaAvailable(data.freeGachaAvailable ?? false))
        .catch(() => {});

      fetch('/api/polls/active')
        .then(r => r.ok ? r.json() : null)
        .then(data => setExploreActivePollCount((data?.polls ?? []).length))
        .catch(() => {});

      // 両方のfetchが完了するまでisLoadingを維持（レース条件防止）
      const charPromise = fetch('/api/characters').then(r => r.json()).then(charData => {
        const chars = charData.characters || [];
        setCharacters(chars);
        // 初回フェッチで空だった場合、1秒後にリトライ（セッション初期化遅延対策）
        if (chars.length === 0) {
          setTimeout(() => {
            fetch('/api/characters').then(r => r.json()).then(d => {
              if (d.characters?.length > 0) setCharacters(d.characters);
            }).catch(() => {});
          }, 1000);
        }
      }).catch(err => console.error('Failed to fetch characters:', err));

      const relPromise = fetch('/api/relationship/all').then(r => r.json()).then(relData => {
        if (relData.relationships) {
          const map = new Map<string, RelationshipInfo>();
          for (const rel of relData.relationships as RelationshipInfo[]) {
            map.set(rel.characterId, rel);
          }
          setRelationships(map);
        }
      }).catch(err => console.error('Failed to fetch relationships:', err));

      Promise.all([charPromise, relPromise]).finally(() => setIsLoading(false));
    }
  }, [status]);

  // フォロー中キャラがゼロの新規ユーザーのみ /discover にリダイレクト
  // DB状態で判定（localStorageはSafariシークレットで消えるため使わない）
  const [showSwipeModal, setShowSwipeModal] = useState(false);
  const [discoverChecked, setDiscoverChecked] = useState(false);
  useEffect(() => {
    if (status !== 'authenticated' || isLoading || discoverChecked) return;
    setDiscoverChecked(true);
    const hasFollowing = Array.from(relationships.values()).some(r => r.isFollowing);
    if (!hasFollowing && relationships.size === 0) {
      // フォロー0人 = 新規ユーザー → /discover
      const step = session?.user?.onboardingStep;
      if (step === 'completed') {
        // オンボーディング済みだがフォロー0 → モーダル表示
        setShowSwipeModal(true);
      } else {
        router.push('/discover');
      }
    }
  }, [status, isLoading, relationships, discoverChecked, session, router]);

  const handleFollow = useCallback((characterId: string, following: boolean) => {
    setRelationships(prev => {
      const next = new Map(prev);
      const existing = next.get(characterId);
      if (existing) {
        next.set(characterId, { ...existing, isFollowing: following });
      } else {
        next.set(characterId, {
          characterId,
          level: 1,
          levelName: '知り合い',
          xp: 0,
          totalMessages: 0,
          isFollowing: following,
          isFanclub: false,
        });
      }
      return next;
    });
  }, []);

  // Filter characters + sort by unread proactive messages first
  const filteredCharacters = characters
    .filter(c => {
      const matchesSearch = !searchQuery ||
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.nameEn?.toLowerCase().includes(searchQuery.toLowerCase())) ||
        c.franchise.toLowerCase().includes(searchQuery.toLowerCase());

      // 「アニメ」はスーパーカテゴリ（franchiseが'アニメ'でないキャラも含む = 全アニメキャラ）
      // 'アニメ' franchise自体ではなく、DBの既存franchise全てをアニメとして扱う
      const matchesCategory = selectedCategory === 'すべて'
        || c.franchise === selectedCategory
        || selectedCategory === 'アニメ'; // アニメカテゴリ = 全キャラ表示（= すべてと同じ動作）

      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      // 未読プロアクティブメッセージがあるキャラを上位に
      const aHasMsg = proactiveUnreadMap.has(a.id) ? 1 : 0;
      const bHasMsg = proactiveUnreadMap.has(b.id) ? 1 : 0;
      return bHasMsg - aHasMsg;
    });

  const availableFranchises = new Set(characters.map(c => c.franchise));
  const visibleCategories = FRANCHISE_CATEGORIES.filter(
    cat => cat.name === 'すべて' || availableFranchises.has(cat.name) || cat.name === 'アニメ'
  );

  if (status === 'loading' || (status === 'authenticated' && isLoading)) {
    return (
      <div className="min-h-screen bg-gray-950 pb-24">
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-40 -left-20 w-80 h-80 rounded-full bg-purple-600/15 blur-3xl" />
          <div className="absolute top-1/3 right-0 w-64 h-64 rounded-full bg-pink-600/10 blur-3xl" />
        </div>
        <header className="sticky top-0 z-30 bg-gray-950 border-b border-white/5">
          <div className="max-w-lg mx-auto px-4 pt-4 pb-3">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">A</div>
              <div className="h-5 w-24 bg-white/10 rounded-full animate-pulse" />
            </div>
            <div className="h-10 bg-white/6 rounded-full animate-pulse" />
          </div>
          <div className="flex gap-2 px-4 pb-3 overflow-hidden">
            {[60, 100, 70, 80, 90].map((w, i) => (
              <div key={i} className="flex-shrink-0 h-8 rounded-full bg-white/6 animate-pulse" style={{ width: `${w}px`, animationDelay: `${i * 100}ms` }} />
            ))}
          </div>
        </header>
        <div className="max-w-lg mx-auto px-4 py-6">
          <div className="h-44 rounded-3xl bg-white/5 animate-pulse mb-6" />
          <div className="mb-2 h-5 w-32 bg-white/10 rounded-full animate-pulse" />
          <div className="flex gap-3 overflow-hidden mt-3 mb-6 pb-2">
            {[0,1,2,3].map(i => (
              <div key={i} className="flex-shrink-0 w-44">
                <div className="h-64 rounded-2xl bg-white/5 animate-pulse" style={{ animationDelay: `${i * 80}ms` }} />
              </div>
            ))}
          </div>
          <div className="mb-2 h-5 w-36 bg-white/10 rounded-full animate-pulse" />
          <div className="space-y-3 mt-3">
            {[0,1,2,3].map(i => (
              <div key={i} className="flex items-center gap-4 bg-white/[0.04] rounded-2xl p-4" style={{ animationDelay: `${i * 80}ms` }}>
                <div className="w-16 h-16 rounded-full bg-white/8 animate-pulse flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-white/8 rounded-full animate-pulse w-24" />
                  <div className="h-3 bg-white/5 rounded-full animate-pulse w-16" />
                  <div className="h-3 bg-white/5 rounded-full animate-pulse w-32" />
                </div>
                <div className="w-20 h-8 rounded-full bg-white/8 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Empty state: 通常40キャラ存在するため、空は一時的な読み込みエラー → リロード促す
  if (!isLoading && characters.length === 0 && status === 'authenticated') {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center pb-24 px-4">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin mb-4" />
        <p className="text-gray-400 text-sm text-center mb-4">読み込み中...</p>
        <button
          onClick={() => window.location.reload()}
          className="text-purple-400 text-sm underline"
        >
          再読み込み
        </button>
      </div>
    );
  }

  const followingChars = filteredCharacters.filter(c => relationships.get(c.id)?.isFollowing);
  const popularChars = filteredCharacters.slice(0, 6);
  const newChars = [...filteredCharacters].reverse().slice(0, 4);

  return (
    <>
      {/* デイリーログインボーナス */}
      <DailyBonus />

      {/* 久しぶりユーザー用スワイプモーダル（アンダーバー上に表示） */}
      {showSwipeModal && (
        <SwipeModal onClose={() => setShowSwipeModal(false)} />
      )}

      {/* ポストオンボーディング・チュートリアル — 会話済みユーザーには非表示 */}
      {tutorialInitialized && tutorialState.step >= 1 && tutorialState.step <= 5 && (() => {
        // 既に会話したことがあるユーザーはチュートリアル不要
        let hasConversation = false;
        relationships.forEach(rel => {
          if (rel.totalMessages > 0) hasConversation = true;
        });
        return !hasConversation;
      })() && (
        <TutorialOverlay
          tutorialState={tutorialState}
          onAdvance={advanceTutorial}
          onSkip={skipTutorial}
          onComplete={completeTutorial}
        />
      )}
      <style>{`
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        @keyframes catBadgePop {
          0%   { transform: scale(0.85); opacity: 0; }
          60%  { transform: scale(1.08); }
          100% { transform: scale(1); opacity: 1; }
        }
        .cat-badge-active { animation: catBadgePop 0.25s cubic-bezier(0.22,1,0.36,1) forwards; }
        @keyframes missionFw1 { 0% { transform: translateY(0) scale(1); opacity:1; } 100% { transform: translateY(-44px) translateX(-22px) scale(0); opacity:0; } }
        @keyframes missionFw2 { 0% { transform: translateY(0) scale(1); opacity:1; } 100% { transform: translateY(-38px) translateX(22px) scale(0); opacity:0; } }
        @keyframes missionFw3 { 0% { transform: translateY(0) scale(1); opacity:1; } 100% { transform: translateY(-50px) scale(0); opacity:0; } }
        @keyframes missionFw4 { 0% { transform: translateY(0) scale(1); opacity:1; } 100% { transform: translateY(-32px) translateX(-32px) scale(0); opacity:0; } }
      `}</style>

      <div className="min-h-screen bg-gray-950 pb-24">
        {/* Fixed background blobs */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-40 -left-20 w-96 h-96 rounded-full bg-purple-600/12 blur-3xl" />
          <div className="absolute top-1/3 right-0 w-72 h-72 rounded-full bg-pink-600/10 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 w-80 h-80 rounded-full bg-indigo-600/08 blur-3xl" />
          <div className="absolute top-2/3 left-0 w-60 h-60 rounded-full bg-orange-600/06 blur-3xl" />
        </div>

        {/* Header */}
        <header className="sticky top-0 z-30 border-b border-white/5 transition-all duration-300"
          style={{
            background: scrollY > 40
              ? 'rgba(3,7,18,0.85)'
              : 'rgb(3,7,18)',
            backdropFilter: scrollY > 40 ? 'blur(16px) saturate(180%)' : 'none',
            WebkitBackdropFilter: scrollY > 40 ? 'blur(16px) saturate(180%)' : 'none',
          }}
        >
          <div className="max-w-lg mx-auto px-4 pt-4 pb-3">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', boxShadow: '0 2px 12px rgba(139,92,246,0.5)' }}
              >
                A
              </div>
              <h1 className="text-lg font-black text-white tracking-tight">推しを探す</h1>
            </div>

            {/* Search bar */}
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="キャラ名、作品名で検索…"
                className="w-full pl-10 pr-4 py-2.5 text-white placeholder-gray-500 text-sm focus:outline-none transition-all rounded-full"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.10)',
                }}
                onFocus={(e) => { e.target.style.borderColor = 'rgba(139,92,246,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(139,92,246,0.12)'; }}
                onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.10)'; e.target.style.boxShadow = ''; }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Category scroll */}
          <div className="overflow-x-auto no-scrollbar">
            <div className="flex gap-2 px-4 pb-3">
              {visibleCategories.map(cat => (
                <button
                  key={cat.name}
                  onClick={() => setSelectedCategory(cat.name)}
                  className={`
                    flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200
                    ${selectedCategory === cat.name ? 'cat-badge-active text-white' : 'text-gray-400 border border-white/10 hover:text-gray-200 hover:border-white/20'}
                  `}
                  style={selectedCategory === cat.name ? {
                    background: `linear-gradient(135deg, var(--tw-gradient-stops))`,
                    boxShadow: '0 2px 12px rgba(0,0,0,0.4)',
                    backgroundImage: `linear-gradient(135deg, ${cat.gradient.includes('purple') ? '#8b5cf6, #ec4899' : cat.gradient.includes('orange') ? '#f97316, #ef4444' : cat.gradient.includes('blue') ? '#3b82f6, #4f46e5' : cat.gradient.includes('pink') ? '#ec4899, #f43f5e' : cat.gradient.includes('yellow') ? '#facc15, #f97316' : cat.gradient.includes('gray') ? '#6b7280, #374151' : '#10b981, #06b6d4'})`,
                  } : {
                    background: 'rgba(255,255,255,0.04)',
                  }}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        </header>

        <main className="relative z-10 max-w-lg mx-auto px-4">

          {/* HERO section — only on no search/filter */}
          {!searchQuery && selectedCategory === 'すべて' && (
            <div className="py-6">
              {/* Hero banner — dynamic character avatars */}
              <FadeSection>
                {(() => {
                  // Pick up to 4 characters with avatarUrl for the banner
                  const heroChars = characters
                    .filter(c => c.avatarUrl)
                    .slice(0, 4);
                  // Background blur source: first char with coverUrl or avatarUrl
                  const bgSrc = characters.find(c => c.coverUrl)?.coverUrl
                    ?? heroChars[0]?.avatarUrl ?? null;
                  return (
                    <div className="relative rounded-3xl overflow-hidden mb-6 cursor-pointer active:scale-[0.98] transition-transform"
                      style={{ boxShadow: '0 8px 48px rgba(139,92,246,0.35), 0 0 0 1px rgba(255,255,255,0.06)', minHeight: 220 }}
                      onClick={() => router.push('/discover')}
                    >
                      {/* Blurred background from character art */}
                      {bgSrc ? (
                        <img
                          src={bgSrc}
                          alt=""
                          className="absolute inset-0 w-full h-full object-cover"
                          style={{ filter: 'blur(20px) saturate(1.4) brightness(0.45)', transform: 'scale(1.1)' }}
                          aria-hidden="true"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-purple-700 via-pink-600 to-rose-500" />
                      )}
                      {/* Color overlay */}
                      <div className="absolute inset-0"
                        style={{
                          background: 'linear-gradient(135deg, rgba(88,28,135,0.72) 0%, rgba(157,23,77,0.55) 60%, rgba(0,0,0,0.3) 100%)',
                        }}
                      />
                      {/* Shimmer sweep */}
                      <div className="absolute inset-0 opacity-25"
                        style={{
                          background: 'linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.18) 50%, transparent 65%)',
                          backgroundSize: '200% 100%',
                          animation: 'heroShimmer 3.5s ease-in-out infinite',
                        }}
                      />
                      {/* Particle dots */}
                      <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        {[...Array(8)].map((_, i) => (
                          <div
                            key={i}
                            className="absolute rounded-full bg-white"
                            style={{
                              width: 3 + (i % 3),
                              height: 3 + (i % 3),
                              left: `${10 + i * 11}%`,
                              top: `${15 + (i % 4) * 18}%`,
                              opacity: 0.25 + (i % 3) * 0.15,
                              animation: `heroPart${i % 3 + 1} ${2.5 + i * 0.3}s ease-in-out infinite`,
                              animationDelay: `${i * 0.4}s`,
                            }}
                          />
                        ))}
                      </div>
                      <style>{`
                        @keyframes heroShimmer { 0%,100% { background-position: 200% 0; } 50% { background-position: -200% 0; } }
                        @keyframes heroPart1 { 0%,100% { transform: translateY(0) scale(1); } 50% { transform: translateY(-8px) scale(1.2); } }
                        @keyframes heroPart2 { 0%,100% { transform: translateY(0) scale(1); } 50% { transform: translateY(-5px) scale(0.9); } }
                        @keyframes heroPart3 { 0%,100% { transform: translateY(0) scale(1); } 50% { transform: translateY(-10px) scale(1.1); } }
                        @keyframes heroFloat { 0%,100% { transform: translateY(0px) rotate(-2deg); } 50% { transform: translateY(-6px) rotate(2deg); } }
                        @keyframes heroFloatAlt { 0%,100% { transform: translateY(0px) rotate(2deg); } 50% { transform: translateY(-8px) rotate(-2deg); } }
                        @keyframes heroGlitter { 0%,100% { opacity: 0; transform: scale(0.5); } 50% { opacity: 1; transform: scale(1.2); } }
                        @keyframes heroTicker { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
                      `}</style>

                      <div className="relative z-10 px-5 pt-7 pb-4">
                        <p className="text-white/70 text-xs font-semibold tracking-widest uppercase mb-1.5">✦ Discover</p>
                        <h2 className="text-3xl font-black text-white leading-tight mb-1">
                          推しが、<br />待ってる。
                        </h2>
                        <p className="text-white/65 text-xs leading-relaxed mb-4">
                          フォローして、推しとリアルにトークしよう。
                        </p>

                        {/* Character avatar row */}
                        {heroChars.length > 0 && (
                          <div className="flex items-center mb-4" style={{ gap: '-8px' }}>
                            {heroChars.map((c, i) => (
                              <div
                                key={c.id}
                                className="relative rounded-full border-2 border-white/60 overflow-hidden bg-purple-900 flex-shrink-0"
                                style={{
                                  width: 52,
                                  height: 52,
                                  marginLeft: i === 0 ? 0 : -14,
                                  zIndex: heroChars.length - i,
                                  animation: i % 2 === 0 ? 'heroFloat 3s ease-in-out infinite' : 'heroFloatAlt 3.5s ease-in-out infinite',
                                  animationDelay: `${i * 0.4}s`,
                                  boxShadow: '0 4px 16px rgba(0,0,0,0.5), 0 0 0 2px rgba(255,255,255,0.15)',
                                }}
                                title={c.name}
                              >
                                <img
                                  src={c.avatarUrl!}
                                  alt={c.name}
                                  className="w-full h-full object-cover"
                                />
                                {/* Glitter star */}
                                <div
                                  className="absolute"
                                  style={{
                                    top: -4,
                                    right: -4,
                                    fontSize: 10,
                                    animation: `heroGlitter ${1.5 + i * 0.3}s ease-in-out infinite`,
                                    animationDelay: `${i * 0.6}s`,
                                  }}
                                >✨</div>
                              </div>
                            ))}
                            {characters.filter(c => c.avatarUrl).length > 4 && (
                              <div
                                className="rounded-full border-2 border-white/40 flex items-center justify-center bg-white/10 flex-shrink-0"
                                style={{ width: 52, height: 52, marginLeft: -14, fontSize: 10, color: 'rgba(255,255,255,0.8)', fontWeight: 700 }}
                              >
                                +{characters.filter(c => c.avatarUrl).length - 4}
                              </div>
                            )}
                          </div>
                        )}

                        <div className="flex gap-3">
                          <button
                            onClick={() => router.push('/discover')}
                            className="px-5 py-2.5 bg-white text-gray-900 rounded-full font-bold text-sm hover:bg-gray-100 active:scale-95 transition-all shadow-lg"
                          >
                            スワイプで探す →
                          </button>
                          <button
                            onClick={() => router.push('/chat')}
                            className="px-5 py-2.5 rounded-full font-medium text-sm text-white border border-white/30 hover:bg-white/15 transition-all"
                            style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)' }}
                          >
                            チャットへ
                          </button>
                        </div>
                      </div>

                      {/* Character name ticker marquee */}
                      {characters.length > 0 && (
                        <div
                          className="relative z-10 overflow-x-auto border-t py-2 no-scrollbar ticker-container"
                          style={{ borderColor: 'rgba(255,255,255,0.12)', background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(4px)', WebkitOverflowScrolling: 'touch' }}
                          onTouchStart={(e) => {
                            const el = e.currentTarget.querySelector('.ticker-track') as HTMLElement;
                            if (el) el.style.animationPlayState = 'paused';
                          }}
                          onTouchEnd={(e) => {
                            const el = e.currentTarget.querySelector('.ticker-track') as HTMLElement;
                            if (el) setTimeout(() => { el.style.animationPlayState = 'running'; }, 3000);
                          }}
                          onMouseDown={(e) => {
                            const el = e.currentTarget.querySelector('.ticker-track') as HTMLElement;
                            if (el) el.style.animationPlayState = 'paused';
                          }}
                          onMouseUp={(e) => {
                            const el = e.currentTarget.querySelector('.ticker-track') as HTMLElement;
                            if (el) setTimeout(() => { el.style.animationPlayState = 'running'; }, 3000);
                          }}
                          onMouseLeave={(e) => {
                            const el = e.currentTarget.querySelector('.ticker-track') as HTMLElement;
                            if (el) setTimeout(() => { el.style.animationPlayState = 'running'; }, 1000);
                          }}
                        >
                          <div
                            className="ticker-track flex gap-6 whitespace-nowrap text-white/60 text-xs font-medium"
                            style={{ animation: 'heroTicker 20s linear infinite', width: 'max-content' }}
                          >
                            {/* Duplicate for seamless loop */}
                            {[...characters, ...characters].map((c, i) => (
                              <span key={i} className="flex items-center gap-1.5 flex-shrink-0">
                                <span className="opacity-50">✦</span>
                                {c.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </FadeSection>

              {/* ランキング */}
              <RankingBannerSection />

              {/* ガチャ */}
              <div className="mt-3">
                <GachaBannerSection freeAvailable={freeGachaAvailable} />
              </div>

              {/* 今日のひとこと */}
              <TodayGreetingSection characters={characters} relationships={relationships} />

              {/* 今日のミッション進捗バー */}
              {missionProgress !== null && missionProgress.total > 0 && (
                <MissionProgressSection
                  completed={missionProgress.completed}
                  total={missionProgress.total}
                />
              )}

              {/* 限定キャラメッセージ */}
              {session?.user && (
                <FadeSection delay={20}>
                  <div className="mb-5">
                    <ProactiveMessagePanel />
                  </div>
                </FadeSection>
              )}

              {/* 期間限定シナリオバナー */}
              <LimitedScenariosSection />

              {/* ストーリー投票バナー */}
              <PollBannerSection />

              {/* 今日のイベントバナー（hype高めのみ表示） */}
              {(() => {
                const todayEvent = getTodayMainEvent();
                const eventEmojis: Record<string, string> = {
                  'ひな祭り': '🎎',
                  'バレンタイン': '💝',
                  'ホワイトデー': '🍬',
                  'ハロウィン': '🎃',
                  'クリスマスイブ': '🎄',
                  'クリスマス': '🎄',
                  '元日': '🎍',
                  '大晦日': '🎊',
                  '七夕': '🌟',
                  '花見シーズン': '🌸',
                  'TGIF！花金': '🎉',
                  'ポッキーの日': '🍫',
                  '猫の日': '🐱',
                };
                if (!todayEvent) return null;
                const emoji = eventEmojis[todayEvent] ?? '✨';
                return (
                  <FadeSection delay={30}>
                    <div className="rounded-2xl px-4 py-3 mb-5 flex items-center gap-3 cursor-pointer hover:opacity-90 active:scale-[0.99] transition-all"
                      style={{
                        background: 'linear-gradient(135deg, rgba(236,72,153,0.18), rgba(139,92,246,0.18))',
                        border: '1px solid rgba(236,72,153,0.3)',
                        boxShadow: '0 2px 16px rgba(236,72,153,0.12)',
                      }}
                      onClick={() => router.push('/moments')}
                    >
                      <span className="text-2xl flex-shrink-0">{emoji}</span>
                      <div>
                        <p className="text-white font-semibold text-sm">今日は{todayEvent}！</p>
                        <p className="text-white/55 text-xs mt-0.5">推しと{todayEvent}を楽しもう →</p>
                      </div>
                    </div>
                  </FadeSection>
                );
              })()}

              {/* 誕生日カウントダウンバナー（7日以内） */}
              {(() => {
                const upcomingBirthdays = characters
                  .map(c => ({ c, days: getBirthdayCountdown(c.birthday) }))
                  .filter(({ days }) => days !== null)
                  .sort((a, b) => (a.days ?? 99) - (b.days ?? 99))
                  .slice(0, 2);
                if (upcomingBirthdays.length === 0) return null;
                return (
                  <FadeSection delay={35}>
                    <div className="mb-5 space-y-2">
                      {upcomingBirthdays.map(({ c, days }) => (
                        <div
                          key={c.id}
                          className="rounded-2xl px-4 py-3 flex items-center gap-3 cursor-pointer hover:opacity-90 active:scale-[0.99] transition-all"
                          style={{
                            background: 'linear-gradient(135deg, rgba(251,191,36,0.15), rgba(244,63,94,0.15))',
                            border: '1px solid rgba(251,191,36,0.3)',
                            boxShadow: '0 2px 16px rgba(251,191,36,0.08)',
                          }}
                          onClick={() => router.push(`/chat/${c.slug}`)}
                        >
                          {c.avatarUrl ? (
                            <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 border-2 border-yellow-400/40">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={c.avatarUrl} alt={c.name} className="w-full h-full object-cover" />
                            </div>
                          ) : (
                            <span className="text-2xl flex-shrink-0">🎂</span>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-semibold text-sm">
                              {days === 0 ? `🎉 今日は${c.name.split('・').pop()}の誕生日！` : `🎂 ${c.name.split('・').pop()}の誕生日まであと${days}日`}
                            </p>
                            <p className="text-yellow-300/70 text-xs mt-0.5">
                              {days === 0 ? 'お祝いメッセージを送ろう ✨' : `特別なメッセージを届けよう →`}
                            </p>
                          </div>
                          <span className="text-yellow-400 text-lg flex-shrink-0">🎁</span>
                        </div>
                      ))}
                    </div>
                  </FadeSection>
                );
              })()}

              {/* 未完了ミッションリマインダー */}
              {incompleteMissions > 0 && (
                <FadeSection delay={40}>
                  <div
                    className="mb-4 rounded-2xl px-4 py-3 flex items-center gap-3 cursor-pointer hover:opacity-90 active:scale-[0.99] transition-all"
                    style={{
                      background: incompleteMissions <= 2
                        ? 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(249,115,22,0.15))'
                        : 'linear-gradient(135deg, rgba(168,85,247,0.12), rgba(99,102,241,0.12))',
                      border: incompleteMissions <= 2
                        ? '1px solid rgba(239,68,68,0.3)'
                        : '1px solid rgba(168,85,247,0.2)',
                    }}
                    onClick={() => {
                      router.push('/mypage');
                      setTimeout(() => { const el = document.getElementById('daily-missions'); if (el) el.scrollIntoView({ behavior: 'smooth' }); }, 500);
                    }}
                  >
                    <span className="text-2xl flex-shrink-0">{incompleteMissions <= 2 ? '⚡' : '📋'}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold text-sm ${incompleteMissions <= 2 ? 'text-red-300' : 'text-purple-300'}`}>
                        {missionHint}
                      </p>
                      <p className="text-gray-400 text-xs mt-0.5">
                        タップしてミッションを確認 →
                      </p>
                    </div>
                    <span className="text-xs bg-red-500/30 text-red-300 px-2 py-1 rounded-full font-bold flex-shrink-0">
                      {incompleteMissions}
                    </span>
                  </div>
                </FadeSection>
              )}

              {/* Following characters strip (if any) */}
              {followingChars.length > 0 && (
                <FadeSection delay={60}>
                  <div className="mb-6">
                    <h3 className="text-white font-bold text-base mb-3">
                      フォロー中
                    </h3>
                    <div className="flex gap-3 overflow-x-auto no-scrollbar pb-3">
                      {followingChars.map((character, i) => (
                        <CharacterVerticalCard
                          key={character.id}
                          character={character}
                          index={i}
                          relationship={relationships.get(character.id)}
                          onFollow={handleFollow}
                          onClick={() => router.push(`/profile/${character.id}`)}
                          proactiveMessage={proactiveUnreadMap.get(character.id) ?? null}
                          showChatButton={true}
                        />
                      ))}
                    </div>
                  </div>
                </FadeSection>
              )}

              {/* Popular characters */}
              <FadeSection delay={120}>
                <div id="popular-section" className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-white font-bold text-base">
                      人気のキャラクター
                    </h3>
                    <span className="text-xs px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(139,92,246,0.15)', color: 'rgba(196,181,253,0.9)', border: '1px solid rgba(139,92,246,0.25)' }}
                    >
                      {popularChars.length}人
                    </span>
                  </div>
                  {popularChars.length > 0 ? (
                    <div className="flex gap-3 overflow-x-auto no-scrollbar pb-3">
                      {popularChars.map((character, i) => (
                        <CharacterVerticalCard
                          key={character.id}
                          character={character}
                          index={i}
                          relationship={relationships.get(character.id)}
                          onFollow={handleFollow}
                          onClick={() => router.push(`/profile/${character.id}`)}
                          proactiveMessage={proactiveUnreadMap.get(character.id) ?? null}
                        />
                      ))}
                    </div>
                  ) : (
                    <EmptyState />
                  )}
                </div>
              </FadeSection>

              {/* New characters */}
              {newChars.length > 0 && (
                <FadeSection delay={180}>
                  <div className="mb-6">
                    <h3 className="text-white font-bold text-base mb-3">
                      新着キャラクター
                    </h3>
                    <div className="space-y-3">
                      {newChars.map((character, i) => (
                        <CharacterHorizontalCard
                          key={character.id}
                          character={character}
                          index={i}
                          relationship={relationships.get(character.id)}
                          onFollow={handleFollow}
                          onClick={() => router.push(`/profile/${character.id}`)}
                          proactiveMessage={proactiveUnreadMap.get(character.id) ?? null}
                        />
                      ))}
                    </div>
                  </div>
                </FadeSection>
              )}

              {/* All characters */}
              {characters.length > 6 && (
                <FadeSection delay={240}>
                  <div>
                    <h3 className="text-white font-bold text-base mb-3">
                      すべてのキャラクター
                    </h3>
                    <div className="space-y-3">
                      {characters.slice(6).map((character, i) => (
                        <CharacterHorizontalCard
                          key={character.id}
                          character={character}
                          index={i + 6}
                          relationship={relationships.get(character.id)}
                          onFollow={handleFollow}
                          onClick={() => router.push(`/profile/${character.id}`)}
                          proactiveMessage={proactiveUnreadMap.get(character.id) ?? null}
                        />
                      ))}
                    </div>
                  </div>
                </FadeSection>
              )}

              {/* ── コンテンツリンク：メモリーブック・ストーリー ── */}
              <ContentLinksSection activePollCount={exploreActivePollCount} />
            </div>
          )}

          {/* Search / Filter results */}
          {(searchQuery || selectedCategory !== 'すべて') && (
            <FadeSection>
              <div className="py-6">
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="text-white font-bold text-base">
                    {searchQuery ? `「${searchQuery}」の検索結果` : `${selectedCategory}のキャラクター`}
                  </h3>
                  <span className="text-gray-500 text-xs">{filteredCharacters.length}件</span>
                </div>

                {filteredCharacters.length > 0 ? (
                  <div className="space-y-3">
                    {filteredCharacters.map((character, i) => (
                      <CharacterHorizontalCard
                        key={character.id}
                        character={character}
                        index={i}
                        relationship={relationships.get(character.id)}
                        onFollow={handleFollow}
                        onClick={() => router.push(`/profile/${character.id}`)}
                        proactiveMessage={proactiveUnreadMap.get(character.id) ?? null}
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState message="まだ出会えてないキャラがいるかも…" />
                )}
              </div>
            </FadeSection>
          )}
        </main>
      </div>
    </>
  );
}

function EmptyState({ message }: { message?: string }) {
  const router = useRouter();
  return (
    <div className="flex flex-col items-center py-16 px-4">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
        style={{
          background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(236,72,153,0.1))',
          border: '1px solid rgba(139,92,246,0.2)',
        }}
      >
        <svg className="w-7 h-7 text-purple-400/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
      <p className="text-white/60 text-sm font-medium mb-1">{message ?? '新しいキャラクターがまもなく登場'}</p>
      <p className="text-white/30 text-xs leading-relaxed text-center mb-5">
        あなたを待っているキャラクターがいます
      </p>
      <button
        onClick={() => router.push('/discover')}
        className="px-5 py-2.5 rounded-full text-xs font-bold text-white transition-all active:scale-95"
        style={{
          background: 'linear-gradient(135deg, rgba(139,92,246,0.85), rgba(236,72,153,0.85))',
          boxShadow: '0 2px 12px rgba(139,92,246,0.3)',
        }}
      >
        スワイプで探す
      </button>
    </div>
  );
}
