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
  // SummoningEffectで卵演出済み → ここはキャラ出現のみ
  // Phase: 'reveal' → 'phrase'
  const [phase, setPhase] = useState<'reveal' | 'phrase'>('reveal');
  const [brightness, setBrightness] = useState(0);
  const [phraseVisible, setPhraseVisible] = useState(false);

  const openingLine = getOpeningLine(character);

  useEffect(() => {
    // キャラ出現（即開始）
    const startTime = Date.now();
    const duration = 1200;
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
      setBrightness(eased);
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);

    // セリフ表示
    const t1 = setTimeout(() => {
      setPhase('phrase');
      setPhraseVisible(true);
    }, 1500);

    return () => {
      clearTimeout(t1);
    };
  }, []);

  // Auto-advance after 6 seconds total
  useEffect(() => {
    const timer = setTimeout(() => onComplete(), 6000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  const handleTap = () => {
    onComplete();
  };

  const imageFilter = `brightness(${brightness}) saturate(${brightness})`;
  const imageOpacity = 1;

  return (
    <div
      className="fixed inset-0 bg-black flex flex-col items-center justify-end cursor-pointer"
      onClick={handleTap}
    >
      {/* Background particles */}
      <ParticleField
        density={22}
        colors={['#a855f7', '#ec4899', '#6366f1', '#f472b6']}
        gathering={false}
        gatherTarget={{ x: 50, y: 70 }}
      />

      {/* Background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 60% 80% at 50% 100%, rgba(168,85,247,0.25) 0%, transparent 70%)',
          opacity: 1,
          transition: 'opacity 2s ease',
        }}
      />

      {/* Character image — reveal */}
      <div
        className="absolute inset-0 flex items-end justify-center"
        style={{
          opacity: imageOpacity,
          filter: imageFilter,
          transition: 'filter 1.8s ease, opacity 0.5s ease',
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
          /* Avatar未設定時: キャラの頭文字をグロウ表示 */
          <div
            className="relative mb-16 flex items-center justify-center"
            style={{ width: '160px', height: '160px' }}
          >
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(168,85,247,0.6) 0%, rgba(168,85,247,0.1) 70%)',
                boxShadow: '0 0 60px rgba(168,85,247,0.5), 0 0 120px rgba(236,72,153,0.3)',
              }}
            />
            <span className="relative z-10 font-bold text-white/90" style={{ fontSize: '64px', textShadow: '0 0 40px rgba(168,85,247,0.8)' }}>
              {character.name[0]}
            </span>
          </div>
        )}
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
          opacity: 1,
          transform: 'translateY(0)',
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

      <style jsx>{``}</style>
    </div>
  );
}
