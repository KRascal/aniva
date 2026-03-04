'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

interface DiscoverCharacter {
  id: string;
  slug: string;
  name: string;
  nameEn?: string | null;
  franchise?: string | null;
  description?: string | null;
  avatarUrl?: string | null;
  coverUrl?: string | null;
  catchphrases: string[];
  followerCount: number;
}

// Gradient themes per index for carousel banners
const BANNER_GRADIENTS = [
  'linear-gradient(135deg, #1a0533 0%, #2d0a6b 40%, #6b21a8 100%)',
  'linear-gradient(135deg, #0f172a 0%, #1e1b4b 40%, #4c1d95 100%)',
  'linear-gradient(135deg, #1a0526 0%, #6b1a4f 40%, #be185d 100%)',
  'linear-gradient(135deg, #0c1a2e 0%, #1e3a5f 40%, #1d4ed8 100%)',
  'linear-gradient(135deg, #0f1a0f 0%, #14532d 40%, #15803d 100%)',
];

const BANNER_ACCENT_COLORS = [
  'rgba(168,85,247,0.6)',
  'rgba(99,102,241,0.6)',
  'rgba(236,72,153,0.6)',
  'rgba(59,130,246,0.6)',
  'rgba(16,185,129,0.6)',
];

// Particle background
function MiniParticles({ color }: { color: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const particles = Array.from({ length: 20 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.3,
      vy: -(Math.random() * 0.4 + 0.1),
      size: Math.random() * 2 + 0.5,
      opacity: 0,
      life: Math.random() * 100,
      maxLife: Math.random() * 120 + 80,
    }));

    let animId: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p, i) => {
        p.life += 1;
        if (p.life > p.maxLife) {
          particles[i] = {
            x: Math.random() * canvas.width,
            y: canvas.height,
            vx: (Math.random() - 0.5) * 0.3,
            vy: -(Math.random() * 0.4 + 0.1),
            size: Math.random() * 2 + 0.5,
            opacity: 0,
            life: 0,
            maxLife: Math.random() * 120 + 80,
          };
          return;
        }
        p.x += p.vx;
        p.y += p.vy;
        const ratio = p.life / p.maxLife;
        p.opacity = ratio < 0.2 ? ratio / 0.2 : ratio > 0.8 ? (1 - ratio) / 0.2 : 1;

        // Parse color RGB
        const match = color.match(/\d+/g);
        if (!match) return;
        const [r, g, b] = match.map(Number);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r},${g},${b},${p.opacity * 0.5})`;
        ctx.shadowBlur = 6;
        ctx.shadowColor = color;
        ctx.fill();
        ctx.shadowBlur = 0;
      });
      animId = requestAnimationFrame(animate);
    };
    animate();
    return () => cancelAnimationFrame(animId);
  }, [color]);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />;
}

// Hero carousel banner
function HeroCarousel({ characters }: { characters: DiscoverCharacter[] }) {
  const router = useRouter();
  const [current, setCurrent] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const featured = characters.slice(0, 5);

  const goTo = useCallback((idx: number) => {
    if (transitioning) return;
    setTransitioning(true);
    setTimeout(() => {
      setCurrent(idx);
      setTransitioning(false);
    }, 300);
  }, [transitioning]);

  const goNext = useCallback(() => {
    goTo((current + 1) % featured.length);
  }, [current, featured.length, goTo]);

  useEffect(() => {
    if (featured.length === 0) return;
    intervalRef.current = setInterval(goNext, 5000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [goNext, featured.length]);

  if (featured.length === 0) return null;

  const char = featured[current];
  const gradient = BANNER_GRADIENTS[current % BANNER_GRADIENTS.length];
  const accent = BANNER_ACCENT_COLORS[current % BANNER_ACCENT_COLORS.length];

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{ height: '60vh', minHeight: '360px', maxHeight: '500px' }}
    >
      {/* Background gradient */}
      <div
        className="absolute inset-0"
        style={{
          background: gradient,
          opacity: transitioning ? 0 : 1,
          transition: 'opacity 0.3s ease',
        }}
      />

      {/* Particles */}
      <MiniParticles color={accent.replace('rgba(', 'rgb(').replace(',0.6)', ')')} />

      {/* Glow spot */}
      <div
        className="absolute pointer-events-none"
        style={{
          right: '10%',
          top: '10%',
          width: '300px',
          height: '300px',
          borderRadius: '50%',
          background: `radial-gradient(ellipse, ${accent} 0%, transparent 70%)`,
          opacity: transitioning ? 0 : 0.6,
          transition: 'opacity 0.3s ease',
        }}
      />

      {/* Character avatar */}
      <div
        className="absolute"
        style={{
          right: 0,
          top: 0,
          bottom: 0,
          width: '55%',
          opacity: transitioning ? 0 : 1,
          transform: transitioning ? 'translateX(20px)' : 'translateX(0)',
          transition: 'opacity 0.4s ease, transform 0.4s ease',
        }}
      >
        {char.avatarUrl ? (
          <Image
            src={char.avatarUrl}
            alt={char.name}
            fill
            className="object-contain object-right-bottom"
            priority
          />
        ) : (
          <div
            className="absolute inset-0 flex items-end justify-center pb-8"
            style={{}}
          >
            <div
              className="w-32 h-48 rounded-t-full flex items-center justify-center"
              style={{
                background: `radial-gradient(ellipse, ${accent} 0%, transparent 80%)`,
                fontSize: '64px',
                color: 'rgba(255,255,255,0.3)',
              }}
            >
              {char.name[0]}
            </div>
          </div>
        )}
      </div>

      {/* Left content */}
      <div
        className="absolute left-0 top-0 bottom-0 flex flex-col justify-center px-6 py-8"
        style={{
          width: '55%',
          opacity: transitioning ? 0 : 1,
          transform: transitioning ? 'translateX(-10px)' : 'translateX(0)',
          transition: 'opacity 0.4s ease 0.1s, transform 0.4s ease 0.1s',
        }}
      >
        <p className="text-white/40 text-xs tracking-[0.2em] mb-1">{char.franchise}</p>
        <h2
          className="text-white text-2xl font-light tracking-wide mb-3"
          style={{ textShadow: `0 0 20px ${accent}` }}
        >
          {char.name}
        </h2>
        {char.catchphrases[0] && (
          <p className="text-white/60 text-sm leading-relaxed mb-4 line-clamp-2">
            「{char.catchphrases[0]}」
          </p>
        )}
        <div className="flex items-center gap-2 mb-5">
          <div
            className="h-px flex-1"
            style={{ background: `linear-gradient(to right, ${accent}, transparent)`, maxWidth: '60px' }}
          />
          <p className="text-white/30 text-xs">{char.followerCount.toLocaleString()} フォロワー</p>
        </div>
        <button
          onClick={() => router.push(`/c/${char.slug}`)}
          className="self-start px-5 py-2 rounded-full text-sm font-light text-white border border-white/20 backdrop-blur-sm hover:bg-white/10 transition-colors"
          style={{ boxShadow: `0 0 20px ${accent}` }}
        >
          話しかける →
        </button>
      </div>

      {/* Dots */}
      <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
        {featured.map((_, i) => (
          <button
            key={i}
            onClick={() => {
              if (intervalRef.current) clearInterval(intervalRef.current);
              goTo(i);
              intervalRef.current = setInterval(goNext, 5000);
            }}
            className="rounded-full transition-all"
            style={{
              width: i === current ? '20px' : '6px',
              height: '6px',
              background: i === current ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.2)',
            }}
          />
        ))}
      </div>

      {/* Bottom fade */}
      <div
        className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, transparent, #000)' }}
      />
    </div>
  );
}

// Character card
function CharacterCard({ character }: { character: DiscoverCharacter }) {
  const router = useRouter();
  return (
    <button
      onClick={() => router.push(`/c/${character.slug}`)}
      className="flex-shrink-0 w-36 rounded-2xl overflow-hidden text-left transition-transform active:scale-95"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(8px)',
      }}
    >
      {/* Avatar */}
      <div className="relative w-full aspect-square bg-purple-900/20">
        {character.avatarUrl ? (
          <Image
            src={character.avatarUrl}
            alt={character.name}
            fill
            className="object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-3xl text-white/20">{character.name[0]}</span>
          </div>
        )}
        {/* Gradient overlay */}
        <div
          className="absolute bottom-0 left-0 right-0 h-12"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)' }}
        />
      </div>
      {/* Info */}
      <div className="px-3 py-2">
        <p className="text-white/80 text-xs font-medium truncate">{character.name}</p>
        <p className="text-white/30 text-xs truncate">{character.franchise}</p>
        <p className="text-white/20 text-xs mt-1">
          ♡ {character.followerCount.toLocaleString()}
        </p>
      </div>
      {/* Catchphrase snippet */}
      {character.catchphrases[0] && (
        <div
          className="mx-2 mb-2 px-2 py-1.5 rounded-lg"
          style={{ background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.15)' }}
        >
          <p className="text-white/50 text-xs line-clamp-2 leading-tight">
            {character.catchphrases[0]}
          </p>
        </div>
      )}
    </button>
  );
}

// Section with horizontal scroll
function CharacterSection({ title, characters, icon }: { title: string; characters: DiscoverCharacter[]; icon: string }) {
  if (characters.length === 0) return null;
  return (
    <section className="mb-8">
      <div className="flex items-center gap-2 px-4 mb-3">
        <span className="text-lg">{icon}</span>
        <h3 className="text-white/70 text-sm font-medium tracking-wide">{title}</h3>
        <div
          className="flex-1 h-px ml-2"
          style={{ background: 'linear-gradient(to right, rgba(168,85,247,0.3), transparent)' }}
        />
      </div>
      <div className="flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
        {characters.map((char) => (
          <CharacterCard key={char.id} character={char} />
        ))}
      </div>
    </section>
  );
}

// Today's event section (static placeholder — can be connected to daily-event-system later)
function TodayEventSection() {
  const events = [
    { emoji: '🌸', title: '桜の季節イベント', desc: '限定セリフが解放中', color: 'rgba(236,72,153,0.15)', border: 'rgba(236,72,153,0.3)' },
    { emoji: '⚡', title: 'バトル週間', desc: 'バトル系キャラが熱い', color: 'rgba(234,179,8,0.12)', border: 'rgba(234,179,8,0.3)' },
    { emoji: '🌙', title: '深夜のひととき', desc: '夜限定の本音トーク', color: 'rgba(99,102,241,0.12)', border: 'rgba(99,102,241,0.3)' },
  ];

  return (
    <section className="mb-8">
      <div className="flex items-center gap-2 px-4 mb-3">
        <span className="text-lg">📅</span>
        <h3 className="text-white/70 text-sm font-medium tracking-wide">今日のイベント</h3>
        <div
          className="flex-1 h-px ml-2"
          style={{ background: 'linear-gradient(to right, rgba(168,85,247,0.3), transparent)' }}
        />
      </div>
      <div className="flex gap-3 overflow-x-auto px-4 pb-2" style={{ scrollbarWidth: 'none' }}>
        {events.map((ev) => (
          <div
            key={ev.title}
            className="flex-shrink-0 rounded-2xl px-4 py-3 flex items-center gap-3"
            style={{
              background: ev.color,
              border: `1px solid ${ev.border}`,
              backdropFilter: 'blur(8px)',
              minWidth: '200px',
            }}
          >
            <span className="text-2xl">{ev.emoji}</span>
            <div>
              <p className="text-white/80 text-sm font-medium">{ev.title}</p>
              <p className="text-white/40 text-xs">{ev.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function DiscoverPage() {
  const router = useRouter();
  const [characters, setCharacters] = useState<DiscoverCharacter[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/characters');
        if (!res.ok) throw new Error('fetch failed');
        const data: { characters: DiscoverCharacter[] } = await res.json();
        setCharacters(data.characters);
      } catch (err) {
        console.error('[DiscoverPage] Failed to load characters', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Popular = sorted by followerCount desc (API already does this)
  const popular = characters.slice(0, 10);
  // New = reverse order (assume last in list = newest, or just shuffle for demo)
  const newest = [...characters].reverse().slice(0, 10);

  return (
    <div className="min-h-screen bg-black" style={{ paddingBottom: 'env(safe-area-inset-bottom, 16px)' }}>
      {/* Header */}
      <div
        className="sticky top-0 z-20 px-4 py-3 flex items-center justify-between"
        style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
      >
        <button
          onClick={() => router.push('/')}
          className="text-white/30 text-xs tracking-wider hover:text-white/60 transition-colors"
        >
          ← 戻る
        </button>
        <h1
          className="text-white/60 text-xs tracking-[0.3em]"
          style={{ letterSpacing: '0.25em' }}
        >
          DISCOVER
        </h1>
        <div className="w-12" />
      </div>

      {/* Hero carousel */}
      {loading ? (
        <div
          className="w-full flex items-center justify-center"
          style={{ height: '60vh', minHeight: '360px', maxHeight: '500px', background: 'rgba(168,85,247,0.05)' }}
        >
          <div className="flex gap-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-purple-400/40 animate-bounce"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </div>
        </div>
      ) : (
        <HeroCarousel characters={popular} />
      )}

      {/* Sections */}
      <div className="pt-6">
        <TodayEventSection />

        {!loading && (
          <>
            <CharacterSection title="人気キャラ" characters={popular} icon="🔥" />
            <CharacterSection title="新着キャラ" characters={newest} icon="✨" />
          </>
        )}
      </div>

      {/* Bottom ambient glow */}
      <div
        className="fixed bottom-0 left-0 right-0 h-32 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 80% 100% at 50% 100%, rgba(168,85,247,0.08) 0%, transparent 70%)',
        }}
      />
    </div>
  );
}
