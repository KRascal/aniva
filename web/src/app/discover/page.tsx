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
  const [displayedPhrase, setDisplayedPhrase] = useState('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const typewriterRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartXRef = useRef<number | null>(null);

  const featured = characters.slice(0, 5);

  const goTo = useCallback((idx: number) => {
    if (transitioning) return;
    setTransitioning(true);
    setDisplayedPhrase('');
    setTimeout(() => {
      setCurrent(idx);
      setTransitioning(false);
    }, 300);
  }, [transitioning]);

  const goNext = useCallback(() => {
    goTo((current + 1) % featured.length);
  }, [current, featured.length, goTo]);

  const goPrev = useCallback(() => {
    goTo((current - 1 + featured.length) % featured.length);
  }, [current, featured.length, goTo]);

  useEffect(() => {
    if (featured.length === 0) return;
    intervalRef.current = setInterval(goNext, 5500);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [goNext, featured.length]);

  // Typewriter effect for catchphrase
  useEffect(() => {
    if (transitioning) return;
    const char = featured[current];
    if (!char?.catchphrases[0]) return;
    const phrase = char.catchphrases[0];
    let i = 0;
    setDisplayedPhrase('');
    const tick = () => {
      i++;
      setDisplayedPhrase(phrase.slice(0, i));
      if (i < phrase.length) {
        typewriterRef.current = setTimeout(tick, 35);
      }
    };
    typewriterRef.current = setTimeout(tick, 400);
    return () => { if (typewriterRef.current) clearTimeout(typewriterRef.current); };
  }, [current, transitioning, featured]);

  if (featured.length === 0) return null;

  const char = featured[current];
  const gradient = BANNER_GRADIENTS[current % BANNER_GRADIENTS.length];
  const accent = BANNER_ACCENT_COLORS[current % BANNER_ACCENT_COLORS.length];
  const rank = current + 1;

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartXRef.current;
    touchStartXRef.current = null;
    if (Math.abs(dx) < 40) return;
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (dx < 0) { goNext(); } else { goPrev(); }
    intervalRef.current = setInterval(goNext, 5500);
  };

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{ height: '62vh', minHeight: '380px', maxHeight: '520px' }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Background gradient */}
      <div
        className="absolute inset-0"
        style={{
          background: gradient,
          opacity: transitioning ? 0 : 1,
          transition: 'opacity 0.35s ease',
        }}
      />

      {/* Animated scan lines overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.04) 3px, rgba(0,0,0,0.04) 4px)',
          opacity: 0.4,
        }}
      />

      {/* Particles */}
      <MiniParticles color={accent.replace('rgba(', 'rgb(').replace(',0.6)', ')')} />

      {/* Glow spot */}
      <div
        className="absolute pointer-events-none"
        style={{
          right: '5%',
          top: '5%',
          width: '340px',
          height: '340px',
          borderRadius: '50%',
          background: `radial-gradient(ellipse, ${accent} 0%, transparent 70%)`,
          opacity: transitioning ? 0 : 0.55,
          transition: 'opacity 0.35s ease',
        }}
      />

      {/* Character avatar */}
      <div
        className="absolute"
        style={{
          right: 0,
          top: 0,
          bottom: 0,
          width: '58%',
          opacity: transitioning ? 0 : 1,
          transform: transitioning ? 'translateX(24px) scale(0.97)' : 'translateX(0) scale(1)',
          transition: 'opacity 0.45s ease, transform 0.45s ease',
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
          <div className="absolute inset-0 flex items-end justify-center pb-8">
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
        {/* Avatar bottom fade */}
        <div
          className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none"
          style={{ background: `linear-gradient(to top, ${gradient.split(',')[0].replace('linear-gradient(135deg, ', '')}, transparent)` }}
        />
      </div>

      {/* Left content */}
      <div
        className="absolute left-0 top-0 bottom-0 flex flex-col justify-center px-5 py-10"
        style={{
          width: '58%',
          zIndex: 2,
          opacity: transitioning ? 0 : 1,
          transform: transitioning ? 'translateX(-12px)' : 'translateX(0)',
          transition: 'opacity 0.45s ease 0.08s, transform 0.45s ease 0.08s',
        }}
      >
        {/* Top badges */}
        <div className="flex items-center gap-2 mb-3">
          {/* Rank badge */}
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{
              background: rank === 1 ? 'rgba(251,191,36,0.25)' : 'rgba(255,255,255,0.1)',
              border: `1px solid ${rank === 1 ? 'rgba(251,191,36,0.5)' : 'rgba(255,255,255,0.15)'}`,
              color: rank === 1 ? '#fbbf24' : 'rgba(255,255,255,0.5)',
            }}
          >
            {rank === 1 ? '👑 #1' : `#${rank}`}
          </span>
          {/* Franchise pill */}
          {char.franchise && (
            <span
              className="text-[9px] tracking-wider px-2 py-0.5 rounded-full truncate max-w-[80px]"
              style={{
                background: `${accent.replace(',0.6)', ',0.15)')}`,
                border: `1px solid ${accent.replace(',0.6)', ',0.35)')}`,
                color: 'rgba(255,255,255,0.6)',
              }}
            >
              {char.franchise}
            </span>
          )}
        </div>

        {/* Online status */}
        <div className="flex items-center gap-1.5 mb-2">
          <span
            className="inline-block w-1.5 h-1.5 rounded-full"
            style={{
              background: '#22c55e',
              boxShadow: '0 0 6px #22c55e',
              animation: 'pulse 2s infinite',
            }}
          />
          <span className="text-white/40 text-[10px] tracking-wider">オンライン</span>
        </div>

        {/* Name */}
        <h2
          className="text-white text-2xl font-light tracking-wide mb-3 leading-tight"
          style={{ textShadow: `0 0 24px ${accent}, 0 2px 8px rgba(0,0,0,0.5)` }}
        >
          {char.name}
        </h2>

        {/* Typewriter catchphrase */}
        <div
          className="mb-4 min-h-[40px]"
          style={{
            borderLeft: `2px solid ${accent.replace(',0.6)', ',0.5)')}`,
            paddingLeft: '10px',
          }}
        >
          <p className="text-white/65 text-xs leading-relaxed line-clamp-3">
            「{displayedPhrase}
            {displayedPhrase.length < (char.catchphrases[0]?.length ?? 0) && (
              <span
                className="inline-block w-0.5 h-3 ml-0.5 align-middle"
                style={{
                  background: 'rgba(255,255,255,0.7)',
                  animation: 'blink 0.8s step-end infinite',
                }}
              />
            )}
            {displayedPhrase.length >= (char.catchphrases[0]?.length ?? 0) && displayedPhrase.length > 0 && '」'}
          </p>
        </div>

        {/* Follower count */}
        <div className="flex items-center gap-2 mb-5">
          <div
            className="h-px"
            style={{ width: '40px', background: `linear-gradient(to right, ${accent}, transparent)` }}
          />
          <p className="text-white/35 text-[10px]">
            ♡ {char.followerCount.toLocaleString()} ファン
          </p>
        </div>

        {/* CTA button */}
        <button
          onClick={() => router.push(`/c/${char.slug}`)}
          className="self-start px-5 py-2.5 rounded-full text-sm text-white transition-all active:scale-95"
          style={{
            background: `linear-gradient(135deg, ${accent.replace(',0.6)', ',0.35)')}, ${accent.replace(',0.6)', ',0.15)')})`,
            border: `1px solid ${accent.replace(',0.6)', ',0.6)')}`,
            boxShadow: `0 0 20px ${accent.replace(',0.6)', ',0.4)')}, inset 0 1px 0 rgba(255,255,255,0.1)`,
            backdropFilter: 'blur(8px)',
          }}
        >
          話しかける →
        </button>
      </div>

      {/* Dots */}
      <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2" style={{ zIndex: 3 }}>
        {featured.map((_, i) => (
          <button
            key={i}
            onClick={() => {
              if (intervalRef.current) clearInterval(intervalRef.current);
              goTo(i);
              intervalRef.current = setInterval(goNext, 5500);
            }}
            className="rounded-full transition-all"
            style={{
              width: i === current ? '22px' : '6px',
              height: '6px',
              background: i === current ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.2)',
            }}
          />
        ))}
      </div>

      {/* Bottom fade */}
      <div
        className="absolute bottom-0 left-0 right-0 h-20 pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, transparent, #000)' }}
      />

      {/* Keyframes */}
      <style>{`
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.6;transform:scale(1.3)} }
      `}</style>
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
