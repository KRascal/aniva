'use client';

import { useRouter } from 'next/navigation';
import { FadeSection } from './FadeSection';
import type { Character } from '@/app/explore/explore-data';

export interface HeroBannerProps {
  characters: Character[];
}

export function HeroBanner({ characters }: HeroBannerProps) {
  const router = useRouter();

  // Pick up to 4 characters with avatarUrl for the banner
  const heroChars = characters
    .filter(c => c.avatarUrl)
    .slice(0, 4);
  // Background blur source: first char with coverUrl or avatarUrl
  const bgSrc = characters.find(c => c.coverUrl)?.coverUrl
    ?? heroChars[0]?.avatarUrl ?? null;

  return (
    <FadeSection>
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
    </FadeSection>
  );
}
