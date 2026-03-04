'use client';

import { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import ParticleField from './ParticleField';

export interface CharacterData {
  id: string;
  name: string;
  nameEn?: string;
  slug: string;
  franchise: string;
  avatarUrl: string | null;
  catchphrases: string[];
  personalityTraits: string[];
}

interface CharacterRevealProps {
  character: CharacterData;
  onComplete: () => void;
}

function getOpeningLine(character: CharacterData): string {
  if (character.catchphrases.length > 0) return character.catchphrases[0];
  const traits = character.personalityTraits ?? [];
  if (traits.includes('cool') || traits.includes('stoic')) return '…呼んだ？';
  if (traits.includes('cheerful') || traits.includes('bright') || traits.includes('free-spirited')) {
    return 'やっと会えた！待ってたんだよ！';
  }
  if (traits.includes('mysterious')) return 'あなたの声、聞こえてたよ…';
  return '…来てくれたんだね';
}

// Typewriter hook
function useTypewriter(text: string, active: boolean, speed = 60) {
  const [displayed, setDisplayed] = useState('');
  const indexRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!active) return;
    indexRef.current = 0;
    setDisplayed('');
    intervalRef.current = setInterval(() => {
      indexRef.current += 1;
      setDisplayed(text.slice(0, indexRef.current));
      if (indexRef.current >= text.length && intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }, speed);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [text, active, speed]);

  return displayed;
}

export default function CharacterReveal({ character, onComplete }: CharacterRevealProps) {
  // Phase: 'summoning' → 'silhouette' → 'reveal' → 'phrase'
  const [phase, setPhase] = useState<'summoning' | 'silhouette' | 'reveal' | 'phrase'>('summoning');
  const [brightness, setBrightness] = useState(0);
  const [phraseVisible, setPhraseVisible] = useState(false);
  const [gatherParticles, setGatherParticles] = useState(false);

  const summoningText = '召喚中...';
  const summoningDisplayed = useTypewriter(summoningText, phase === 'summoning', 80);

  const openingLine = getOpeningLine(character);

  useEffect(() => {
    // Phase 1: summoning text for 1.5s
    const t1 = setTimeout(() => {
      setGatherParticles(true);
    }, 500);

    const t2 = setTimeout(() => {
      // Silhouette phase
      setPhase('silhouette');
    }, 1500);

    // Phase 2: hold silhouette for 1s, then start reveal
    const t3 = setTimeout(() => {
      setPhase('reveal');
      // Animate brightness from 0 to 1
      const startTime = Date.now();
      const duration = 1800;
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Ease-in-out
        const eased = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
        setBrightness(eased);
        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };
      requestAnimationFrame(animate);
    }, 2500);

    // Phase 3: show phrase after reveal
    const t4 = setTimeout(() => {
      setPhase('phrase');
      setPhraseVisible(true);
      setGatherParticles(false);
    }, 4500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, []);

  // Auto-advance after 8 seconds total
  useEffect(() => {
    const timer = setTimeout(() => onComplete(), 8000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  const handleTap = () => {
    if (phase === 'phrase' || phase === 'reveal') {
      onComplete();
    }
  };

  const isSilhouetteOrReveal = phase === 'silhouette' || phase === 'reveal';
  const imageFilter = isSilhouetteOrReveal
    ? `brightness(${brightness}) saturate(${brightness})`
    : phase === 'phrase'
    ? 'brightness(1) saturate(1)'
    : 'brightness(0) saturate(0)';

  const imageOpacity = phase === 'summoning' ? 0 : 1;

  return (
    <div
      className="fixed inset-0 bg-black flex flex-col items-center justify-end cursor-pointer"
      onClick={handleTap}
    >
      {/* Background particles */}
      <ParticleField
        density={22}
        colors={['#a855f7', '#ec4899', '#6366f1', '#f472b6']}
        gathering={gatherParticles}
        gatherTarget={{ x: 50, y: 70 }}
      />

      {/* Background glow — intensifies during reveal */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 60% 80% at 50% 100%, rgba(168,85,247,0.25) 0%, transparent 70%)',
          opacity: isSilhouetteOrReveal || phase === 'phrase' ? 1 : 0.2,
          transition: 'opacity 2s ease',
        }}
      />

      {/* Summoning ring effect */}
      {(phase === 'summoning' || phase === 'silhouette') && (
        <div
          className="absolute pointer-events-none"
          style={{
            bottom: '20%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '200px',
            height: '200px',
          }}
        >
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="absolute inset-0 rounded-full border border-purple-500/30"
              style={{
                animation: `summonRing 2s ease-out ${i * 0.6}s infinite`,
              }}
            />
          ))}
        </div>
      )}

      {/* Character image — silhouette → reveal */}
      <div
        className="absolute inset-0 flex items-end justify-center"
        style={{
          opacity: imageOpacity,
          filter: imageFilter,
          transition: phase === 'summoning' ? 'opacity 0.5s ease' : 'filter 1.8s ease, opacity 0.5s ease',
          transform: phase === 'summoning' ? 'translateY(20px)' : 'translateY(0)',
        }}
      >
        {character.avatarUrl ? (
          <div className="relative w-full max-w-sm h-[70vh]">
            <Image
              src={character.avatarUrl}
              alt={character.name}
              fill
              className="object-contain object-bottom"
              priority
            />
          </div>
        ) : (
          /* Silhouette fallback: initial in dark style */
          <div
            className="relative mb-16 flex items-center justify-center"
            style={{
              width: '180px',
              height: '260px',
            }}
          >
            {/* Body silhouette shape */}
            <div
              className="absolute"
              style={{
                width: '180px',
                height: '260px',
                background: phase === 'phrase'
                  ? 'radial-gradient(ellipse at center, rgba(168,85,247,0.8) 0%, rgba(168,85,247,0.2) 70%)'
                  : 'radial-gradient(ellipse at center, rgba(30,10,60,0.95) 0%, rgba(60,20,100,0.7) 60%, transparent 90%)',
                borderRadius: '50% 50% 40% 40%',
                boxShadow: phase === 'phrase'
                  ? '0 0 60px rgba(168,85,247,0.6), 0 0 120px rgba(168,85,247,0.3)'
                  : '0 0 40px rgba(168,85,247,0.2)',
                filter: `blur(${phase === 'phrase' ? 0 : 2}px)`,
                transition: 'all 1.8s ease',
              }}
            />
            {/* Initial letter */}
            <span
              className="relative z-10 font-bold"
              style={{
                fontSize: '72px',
                color: phase === 'phrase' ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.1)',
                textShadow: phase === 'phrase' ? '0 0 30px rgba(168,85,247,0.8)' : 'none',
                transition: 'all 1.8s ease',
              }}
            >
              {character.name[0]}
            </span>
          </div>
        )}
      </div>

      {/* Summoning text — typewriter effect */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: '35%',
          left: 0,
          right: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
          opacity: phase === 'summoning' ? 1 : 0,
          transition: 'opacity 0.5s ease',
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-5 h-px"
            style={{ background: 'linear-gradient(to right, transparent, rgba(168,85,247,0.6))' }}
          />
          <p
            className="text-purple-300/80 text-sm tracking-[0.3em] font-light"
            style={{ minWidth: '80px', textAlign: 'center' }}
          >
            {summoningDisplayed}
          </p>
          <div
            className="w-5 h-px"
            style={{ background: 'linear-gradient(to left, transparent, rgba(168,85,247,0.6))' }}
          />
        </div>
        <div className="flex gap-2">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="w-1 h-1 rounded-full bg-purple-400/50"
              style={{ animation: `pulse 1s ease-in-out ${i * 0.2}s infinite` }}
            />
          ))}
        </div>
      </div>

      {/* Character name — appears during reveal */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: '15%',
          left: 0,
          right: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px',
          opacity: phase === 'reveal' || phase === 'phrase' ? 1 : 0,
          transform: phase === 'reveal' || phase === 'phrase' ? 'translateY(0)' : 'translateY(-10px)',
          transition: 'opacity 0.8s ease 0.3s, transform 0.8s ease 0.3s',
        }}
      >
        <p className="text-white/40 text-xs tracking-[0.3em]">{character.franchise}</p>
        <h2
          className="text-white text-2xl font-light tracking-widest"
          style={{ textShadow: '0 0 30px rgba(168,85,247,0.8)' }}
        >
          {character.name}
        </h2>
        {/* Decorative line */}
        <div
          className="h-px w-16"
          style={{ background: 'linear-gradient(to right, transparent, rgba(168,85,247,0.6), transparent)' }}
        />
      </div>

      {/* Speech bubble / catchphrase */}
      <div
        className="absolute pointer-events-none"
        style={{
          bottom: '100px',
          left: '16px',
          right: '16px',
          display: 'flex',
          justifyContent: 'center',
          opacity: phraseVisible ? 1 : 0,
          transform: phraseVisible ? 'translateY(0) scale(1)' : 'translateY(10px) scale(0.95)',
          transition: 'opacity 0.6s ease, transform 0.6s ease',
        }}
      >
        <div
          className="relative bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl px-6 py-4 max-w-xs"
          style={{ boxShadow: '0 0 20px rgba(168,85,247,0.2)' }}
        >
          <div
            className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-2 bg-white/10"
            style={{ clipPath: 'polygon(0 0, 100% 0, 50% 100%)' }}
          />
          <p className="text-white/90 text-center text-base leading-relaxed">
            「{openingLine}」
          </p>
        </div>
      </div>

      {/* Tap hint */}
      <div
        className="absolute bottom-8 left-0 right-0 flex justify-center pointer-events-none"
        style={{
          opacity: phraseVisible ? 0.5 : 0,
          transition: 'opacity 0.5s ease 1s',
        }}
      >
        <p className="text-white/40 text-xs tracking-widest animate-pulse">
          タップして続ける
        </p>
      </div>

      <style jsx>{`
        @keyframes summonRing {
          0% { transform: scale(0.3); opacity: 0.8; }
          100% { transform: scale(2.5); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
