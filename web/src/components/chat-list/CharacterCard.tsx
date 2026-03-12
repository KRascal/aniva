'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import type { RelationshipInfo } from './types';

/* ── gradient palette per index ── */
const CARD_GRADIENTS = [
  'from-purple-600/80 via-pink-600/60 to-rose-600/80',
  'from-blue-600/80 via-cyan-500/60 to-teal-600/80',
  'from-orange-500/80 via-amber-500/60 to-yellow-500/80',
  'from-green-600/80 via-emerald-500/60 to-cyan-600/80',
  'from-indigo-600/80 via-violet-500/60 to-purple-600/80',
  'from-rose-600/80 via-red-500/60 to-orange-600/80',
];

const GLOW_COLORS = [
  'hover:shadow-purple-500/40',
  'hover:shadow-blue-500/40',
  'hover:shadow-amber-500/40',
  'hover:shadow-emerald-500/40',
  'hover:shadow-violet-500/40',
  'hover:shadow-rose-500/40',
];

/* ── ripple hook ── */
function useRipple() {
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);

  const trigger = useCallback((e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = Date.now();
    setRipples((prev) => [...prev, { id, x, y }]);
    setTimeout(() => setRipples((prev) => prev.filter((r) => r.id !== id)), 600);
  }, []);

  return { ripples, trigger };
}

/* ── intersection observer fade-in ── */
function useFadeIn() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return { ref, visible };
}

/* ── relationship badge ── */
function RelationshipBadge({ rel }: { rel?: RelationshipInfo }) {
  if (!rel) return null;
  const filledStars = Math.min(rel.level, 5);

  const formatLastChat = (dateStr: string | null) => {
    if (!dateStr) return null;
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 60) return `${mins}分前`;
    if (hours < 24) return `${hours}時間前`;
    if (days < 30) return `${days}日前`;
    return new Date(dateStr).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
  };

  const lastChat = rel.lastMessageAt ? formatLastChat(rel.lastMessageAt) : null;

  return (
    <div className="flex items-center gap-2 mt-1">
      <span className="flex items-center gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <svg key={i} className={`w-2.5 h-2.5 ${i < filledStars ? 'text-yellow-400' : 'text-gray-600'}`} viewBox="0 0 24 24" fill="currentColor">
            <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
          </svg>
        ))}
      </span>
      <span className="text-[10px] text-white/50">Lv.{rel.level} {rel.levelName}</span>
      {lastChat && (
        <>
          <span className="text-[10px] text-white/30">·</span>
          <span className="text-[10px] text-white/40">{lastChat}</span>
        </>
      )}
    </div>
  );
}

/* ── character card ── */
interface CharacterForCard {
  name: string;
  avatarUrl: string | null;
  coverUrl: string | null;
  catchphrases: string[];
  franchise: string;
}

export function CharacterCard({
  character,
  index,
  onClick,
  relationship,
}: {
  character: CharacterForCard;
  index: number;
  onClick: () => void;
  relationship?: RelationshipInfo;
}) {
  const { ripples, trigger } = useRipple();
  const { ref, visible } = useFadeIn();
  const gradient = CARD_GRADIENTS[index % CARD_GRADIENTS.length];
  const glow = GLOW_COLORS[index % GLOW_COLORS.length];
  const catchphrase = character.catchphrases?.[0] ?? null;
  const hasCover = !!character.coverUrl;

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    trigger(e);
    setTimeout(onClick, 200);
  };

  return (
    <div
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(24px)',
        transition: `opacity 0.5s ease ${index * 0.08}s, transform 0.5s ease ${index * 0.08}s`,
      }}
    >
      <button
        onClick={handleClick}
        className={`
          relative w-full text-left overflow-hidden rounded-3xl
          border border-white/10
          shadow-lg ${glow}
          hover:shadow-2xl hover:scale-[1.01] hover:-translate-y-0.5
          active:scale-[0.99]
          transition-all duration-300 group bg-gray-900
        `}
      >
        {/* Ripples */}
        {ripples.map((r) => (
          <span
            key={r.id}
            className="absolute rounded-full bg-white/25 pointer-events-none animate-ping z-20"
            style={{
              width: 120,
              height: 120,
              left: r.x - 60,
              top: r.y - 60,
              animationDuration: '0.6s',
              animationIterationCount: 1,
            }}
          />
        ))}

        {/* ── Cover image (Instagram-style) ── */}
        {hasCover ? (
          <div className="relative h-28 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={character.coverUrl!}
              alt=""
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className={`absolute inset-0 bg-gradient-to-b from-transparent via-black/10 to-gray-900`} />
            <div className="absolute top-3 right-3">
              <span className="text-[10px] font-semibold text-white/80 bg-black/40 backdrop-blur-sm px-2 py-1 rounded-full border border-white/15 uppercase tracking-wide">
                {character.franchise}
              </span>
            </div>
          </div>
        ) : (
          <div className="absolute inset-0">
            {character.avatarUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={character.avatarUrl}
                alt=""
                className="w-full h-full object-cover scale-110"
                style={{ filter: 'blur(22px) brightness(0.3) saturate(1.5)' }}
              />
            )}
            <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-65`} />
          </div>
        )}

        {/* Shimmer on hover */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500
          bg-gradient-to-r from-transparent via-white/6 to-transparent
          -translate-x-full group-hover:translate-x-full
          transition-transform duration-700 ease-in-out pointer-events-none z-10" />

        {/* ── Content ── */}
        <div className={`relative z-10 flex items-end gap-4 px-5 pb-5 ${hasCover ? 'pt-0' : 'pt-5'}`}>
          <div className={`flex-shrink-0 relative ${hasCover ? '-mt-10' : ''}`}>
            <div className={`w-20 h-20 rounded-2xl overflow-hidden shadow-xl ${hasCover ? 'ring-3 ring-gray-900 ring-offset-0' : 'ring-2 ring-white/30'}`}>
              {character.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={character.avatarUrl}
                  alt={character.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center text-2xl font-bold text-white`}>
                  {character.name.charAt(0)}
                </div>
              )}
            </div>
            <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full ring-2 ring-gray-900 animate-pulse" />
          </div>

          <div className="flex-1 min-w-0 pb-0.5">
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className="font-bold text-white text-xl leading-tight drop-shadow">{character.name}</h3>
            </div>
            {!hasCover && (
              <p className="text-white/60 text-xs mb-2 font-medium tracking-wide uppercase">
                {character.franchise}
              </p>
            )}

            {catchphrase && (
              <div className="relative inline-block mt-1">
                <div className="bg-white/12 backdrop-blur-sm border border-white/18 rounded-2xl rounded-tl-sm px-3 py-1.5 max-w-[200px]">
                  <p className="text-white/85 text-xs leading-relaxed line-clamp-2">
                    &ldquo;{catchphrase}&rdquo;
                  </p>
                </div>
              </div>
            )}

            <RelationshipBadge rel={relationship} />
          </div>

          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center
            group-hover:bg-white/25 transition-colors duration-200 self-end mb-0.5">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </button>
    </div>
  );
}
