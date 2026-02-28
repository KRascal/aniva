'use client';

import { useRouter } from 'next/navigation';

interface CharacterItem {
  id: string;
  name: string;
  slug: string;
  franchise: string;
  avatarUrl: string | null;
  catchphrases: string[];
}

const GRADIENTS = [
  ['#7c3aed', '#ec4899'],
  ['#6366f1', '#8b5cf6'],
  ['#ec4899', '#f97316'],
  ['#06b6d4', '#8b5cf6'],
  ['#f97316', '#ef4444'],
  ['#10b981', '#06b6d4'],
  ['#a855f7', '#6366f1'],
  ['#f43f5e', '#ec4899'],
  ['#0ea5e9', '#6366f1'],
  ['#84cc16', '#06b6d4'],
];

export function CharacterCarouselSection({ characters }: { characters: CharacterItem[] }) {
  const router = useRouter();
  const items = [...characters, ...characters];
  const speed = Math.max(characters.length * 5, 30);

  return (
    <div className="w-full overflow-hidden"
      style={{ maskImage: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)' }}>
      <div className="flex gap-4 lp-marquee" style={{ width: 'max-content' }}>
        {items.map((char, i) => {
          const [c1, c2] = GRADIENTS[i % GRADIENTS.length];
          const phrase = char.catchphrases?.[0] ?? char.franchise;
          return (
            <button
              key={`${char.id}-${i}`}
              onClick={() => router.push(`/c/${char.slug}`)}
              className="flex-shrink-0 rounded-2xl overflow-hidden text-left transition-all duration-200 hover:scale-[1.06] active:scale-[0.95]"
              style={{ width: '140px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(139,92,246,0.15)' }}>
              {/* Avatar area */}
              <div className="relative w-full flex items-end justify-center overflow-hidden"
                style={{
                  height: '170px',
                  background: char.avatarUrl
                    ? `url(${char.avatarUrl}) center/cover`
                    : `linear-gradient(135deg, ${c1}44, ${c2}22)`,
                }}>
                {!char.avatarUrl && (
                  <span className="absolute inset-0 flex items-center justify-center text-5xl font-black"
                    style={{ color: c1, opacity: 0.6 }}>
                    {char.name.charAt(0)}
                  </span>
                )}
                <div className="absolute inset-x-0 bottom-0 h-16"
                  style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85), transparent)' }} />
                <div className="relative z-10 p-2.5 w-full">
                  <div className="text-white font-bold text-sm drop-shadow">{char.name}</div>
                  <div className="text-white/40 text-[10px]">{char.franchise}</div>
                </div>
              </div>
              {/* Phrase */}
              <div className="px-3 py-2">
                <p className="text-[11px] leading-relaxed text-white/40 line-clamp-2">「{phrase}」</p>
              </div>
            </button>
          );
        })}
      </div>

      <style>{`
        @keyframes marquee {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .lp-marquee {
          animation: marquee ${speed}s linear infinite;
        }
        @media (hover: hover) {
          .lp-marquee:hover { animation-play-state: paused; }
        }
      `}</style>
    </div>
  );
}
