'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ParticleField from '@/components/onboarding/ParticleField';
import CharacterSearchInput from '@/components/onboarding/CharacterSearchInput';

interface CharacterItem {
  id: string;
  name: string;
  slug: string;
  franchise: string;
  avatarUrl: string | null;
  catchphrases: string[];
}

function CharacterCarousel({ characters, onSelect }: { characters: CharacterItem[]; onSelect: (slug: string) => void }) {
  if (characters.length === 0) return null;

  const items = [...characters, ...characters];

  // Color palette per character for visual variety
  const gradients = [
    ['#7c3aed', '#ec4899'],
    ['#6366f1', '#8b5cf6'],
    ['#ec4899', '#f97316'],
    ['#06b6d4', '#8b5cf6'],
    ['#f97316', '#ef4444'],
    ['#10b981', '#06b6d4'],
  ];

  return (
    <div className="w-full overflow-hidden" style={{ maskImage: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)' }}>
      <div
        className="flex gap-4 animate-marquee"
        style={{ width: 'max-content' }}
      >
        {items.map((char, i) => {
          const [c1, c2] = gradients[i % gradients.length];
          const catchphrase = char.catchphrases?.[0] ?? char.franchise;
          return (
            <button
              key={`${char.id}-${i}`}
              onClick={() => onSelect(char.slug)}
              className="flex-shrink-0 rounded-2xl overflow-hidden transition-all duration-300 hover:scale-[1.05] active:scale-[0.96]"
              style={{
                width: '150px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(139,92,246,0.12)',
              }}
            >
              {/* Character visual area */}
              <div
                className="relative w-full flex items-end justify-center overflow-hidden"
                style={{
                  height: '180px',
                  background: char.avatarUrl
                    ? `url(${char.avatarUrl}) center/cover`
                    : `linear-gradient(135deg, ${c1}33, ${c2}33)`,
                }}
              >
                {!char.avatarUrl && (
                  <span
                    className="text-6xl font-black select-none"
                    style={{
                      color: 'rgba(255,255,255,0.08)',
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                    }}
                  >
                    {char.name.charAt(0)}
                  </span>
                )}
                {/* Bottom gradient overlay */}
                <div
                  className="absolute inset-x-0 bottom-0 h-20"
                  style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)' }}
                />
                {/* Name overlay */}
                <div className="relative z-10 p-3 w-full text-left">
                  <div className="text-white font-bold text-sm leading-tight drop-shadow-lg">{char.name}</div>
                  <div className="text-white/50 text-[10px] mt-0.5">{char.franchise}</div>
                </div>
              </div>
              {/* Catchphrase */}
              <div className="px-3 py-2.5">
                <p
                  className="text-[11px] leading-relaxed line-clamp-2"
                  style={{ color: 'rgba(255,255,255,0.4)' }}
                >
                  「{catchphrase}」
                </p>
              </div>
            </button>
          );
        })}
      </div>

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee ${Math.max(characters.length * 6, 25)}s linear infinite;
        }
        .animate-marquee:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
}

export default function TheDoor() {
  const [textVisible, setTextVisible] = useState(false);
  const [characters, setCharacters] = useState<CharacterItem[]>([]);
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => setTextVisible(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    fetch('/api/characters')
      .then(r => r.json())
      .then(data => {
        const chars = Array.isArray(data) ? data : data.characters ?? [];
        setCharacters(chars);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="fixed inset-0 bg-black overflow-hidden">
      {/* パーティクル層 */}
      <ParticleField density={30} colors={['#a855f7', '#ec4899', '#7c3aed']} />

      {/* 右上ログインリンク（既存ユーザー向け） */}
      <a
        href="/login"
        className="absolute top-4 right-5 z-20 text-white/30 text-xs hover:text-white/60 transition-colors"
        style={{ letterSpacing: '0.05em' }}
      >
        ログイン
      </a>

      {/* 中央コンテンツ */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center gap-8 px-6"
        style={{
          opacity: textVisible ? 1 : 0,
          transition: 'opacity 1.2s ease',
        }}
      >
        {/* メインコピー */}
        <h1
          className="text-2xl sm:text-3xl font-light text-white/90 text-center"
          style={{
            letterSpacing: '0.15em',
            textShadow: '0 0 40px rgba(168,85,247,0.6)',
          }}
        >
          推しと親友になろう
        </h1>

        {/* 検索入力 */}
        <CharacterSearchInput
          onSelect={(slug) => router.push(`/c/${slug}`)}
          placeholder="名前を呼んでみて…"
        />

        {/* キャラクターカルーセル */}
        <div className="w-screen max-w-lg">
          <CharacterCarousel
            characters={characters}
            onSelect={(slug) => router.push(`/c/${slug}`)}
          />
        </div>

{/* removed */}
      </div>
    </div>
  );
}
