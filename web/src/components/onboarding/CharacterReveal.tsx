'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

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

export default function CharacterReveal({ character, onComplete }: CharacterRevealProps) {
  const [imageVisible, setImageVisible] = useState(false);
  const [phraseVisible, setPhraseVisible] = useState(false);
  const [blurAmount, setBlurAmount] = useState(20);

  const openingLine = getOpeningLine(character);

  useEffect(() => {
    // Start revealing the character image
    const t1 = setTimeout(() => setImageVisible(true), 200);
    // Reduce blur over 1.5s
    const t2 = setTimeout(() => setBlurAmount(0), 300);
    // Show catchphrase after image is partially visible
    const t3 = setTimeout(() => setPhraseVisible(true), 1200);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  const handleTap = () => {
    onComplete();
  };

  // Auto-advance after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => onComplete(), 5000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div
      className="fixed inset-0 bg-black flex flex-col items-center justify-end cursor-pointer"
      onClick={handleTap}
    >
      {/* Background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 60% 80% at 50% 100%, rgba(168,85,247,0.2) 0%, transparent 70%)',
          opacity: imageVisible ? 1 : 0,
          transition: 'opacity 2s ease',
        }}
      />

      {/* Character image */}
      <div
        className="absolute inset-0 flex items-end justify-center"
        style={{
          opacity: imageVisible ? 1 : 0,
          filter: `blur(${blurAmount}px)`,
          transition: 'opacity 1.5s ease, filter 1.5s ease',
          transform: imageVisible ? 'translateY(0)' : 'translateY(20px)',
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
          /* Placeholder silhouette if no avatar */
          <div
            className="w-48 h-80 rounded-full opacity-60 mb-16"
            style={{
              background: 'radial-gradient(ellipse at center, rgba(168,85,247,0.6) 0%, rgba(168,85,247,0.1) 70%)',
              boxShadow: '0 0 60px rgba(168,85,247,0.4)',
            }}
          />
        )}
      </div>

      {/* Character name */}
      <div
        className="absolute top-1/4 left-0 right-0 flex flex-col items-center gap-2"
        style={{
          opacity: phraseVisible ? 1 : 0,
          transition: 'opacity 0.8s ease',
        }}
      >
        <p className="text-white/50 text-sm tracking-[0.2em]">{character.franchise}</p>
        <h2 className="text-white text-2xl font-light tracking-widest"
          style={{ textShadow: '0 0 30px rgba(168,85,247,0.8)' }}>
          {character.name}
        </h2>
      </div>

      {/* Speech bubble / catchphrase */}
      <div
        className="absolute bottom-28 left-4 right-4 flex justify-center"
        style={{
          opacity: phraseVisible ? 1 : 0,
          transform: phraseVisible ? 'translateY(0) scale(1)' : 'translateY(10px) scale(0.95)',
          transition: 'opacity 0.6s ease 0.3s, transform 0.6s ease 0.3s',
        }}
      >
        <div
          className="relative bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl px-6 py-4 max-w-xs"
          style={{ boxShadow: '0 0 20px rgba(168,85,247,0.2)' }}
        >
          {/* Tail */}
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
        className="absolute bottom-8 left-0 right-0 flex justify-center"
        style={{
          opacity: phraseVisible ? 0.5 : 0,
          transition: 'opacity 0.5s ease 1s',
        }}
      >
        <p className="text-white/40 text-xs tracking-widest animate-pulse">
          タップして続ける
        </p>
      </div>
    </div>
  );
}
