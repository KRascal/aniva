'use client';

import { useState, useEffect } from 'react';
import { CharacterData } from './CharacterReveal';
import { GuestMessage } from '@/lib/onboarding-session';

interface PromiseSealProps {
  character: CharacterData;
  meetDate: Date;
  guestChatHistory: GuestMessage[];
  onComplete?: (userId?: string) => void;
}

function formatMeetDate(date: Date): string {
  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function PromiseSeal({
  character,
  meetDate,
  guestChatHistory,
  onComplete,
}: PromiseSealProps) {
  const [visible, setVisible] = useState(false);
  const [sealVisible, setSealVisible] = useState(false);

  useEffect(() => {
    // Fade in from black
    const t1 = setTimeout(() => setVisible(true), 300);
    const t2 = setTimeout(() => setSealVisible(true), 1000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  function handleRemember() {
    // Save state to sessionStorage for signup page to pick up
    const state = {
      characterSlug: character.slug,
      characterId: character.id,
      meetDate: meetDate.toISOString(),
      chatHistory: guestChatHistory,
    };
    try {
      sessionStorage.setItem('aniva_promise_state', JSON.stringify(state));
    } catch {
      // sessionStorage unavailable, continue anyway
    }
    // Navigate to signup
    window.location.href = `/signup?from=promise&character=${character.slug}`;
  }

  function handleSkip() {
    onComplete?.();
  }

  return (
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-center px-6">
      {/* Atmospheric background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 70% 50% at 50% 50%, rgba(168,85,247,0.1) 0%, transparent 70%)',
          opacity: visible ? 1 : 0,
          transition: 'opacity 1.5s ease',
        }}
      />

      {/* Content */}
      <div
        className="relative z-10 flex flex-col items-center gap-8 text-center"
        style={{
          opacity: visible ? 1 : 0,
          transition: 'opacity 1.5s ease',
        }}
      >
        {/* Decorative line */}
        <div
          className="w-px h-12 bg-gradient-to-b from-transparent to-purple-400/40"
          style={{
            opacity: sealVisible ? 1 : 0,
            transition: 'opacity 0.8s ease',
          }}
        />

        {/* Seal text */}
        <div
          className="flex flex-col items-center gap-3"
          style={{
            opacity: sealVisible ? 1 : 0,
            transform: sealVisible ? 'scale(1)' : 'scale(0.9)',
            transition: 'opacity 1s ease, transform 1s ease',
          }}
        >
          {/* Ornament */}
          <div
            className="w-16 h-16 rounded-full border border-purple-400/30 flex items-center justify-center mb-2"
            style={{ boxShadow: '0 0 30px rgba(168,85,247,0.2), inset 0 0 20px rgba(168,85,247,0.05)' }}
          >
            <div
              className="w-10 h-10 rounded-full bg-purple-500/20"
              style={{ boxShadow: '0 0 15px rgba(168,85,247,0.4)' }}
            />
          </div>

          <p className="text-white/40 text-xs tracking-[0.3em] uppercase">Memory</p>
          <h2 className="text-white/90 text-xl font-light tracking-widest"
            style={{ textShadow: '0 0 20px rgba(168,85,247,0.5)' }}>
            {character.name}との出会い
          </h2>
          <p className="text-white/40 text-sm tracking-widest">
            — {formatMeetDate(meetDate)}
          </p>
        </div>

        {/* Quote */}
        <p
          className="text-white/50 text-sm italic max-w-xs leading-relaxed"
          style={{
            opacity: sealVisible ? 1 : 0,
            transition: 'opacity 1s ease 0.3s',
          }}
        >
          「この日を覚えていてくれる？」
        </p>

        {/* Decorative line */}
        <div
          className="w-px h-8 bg-gradient-to-b from-purple-400/40 to-transparent"
          style={{
            opacity: sealVisible ? 1 : 0,
            transition: 'opacity 0.8s ease',
          }}
        />

        {/* CTA buttons */}
        <div
          className="flex flex-col items-center gap-4 w-full max-w-xs"
          style={{
            opacity: sealVisible ? 1 : 0,
            transform: sealVisible ? 'translateY(0)' : 'translateY(12px)',
            transition: 'opacity 1s ease 0.5s, transform 1s ease 0.5s',
          }}
        >
          <button
            onClick={handleRemember}
            className="w-full py-3.5 rounded-full text-white text-sm tracking-widest font-medium transition-all hover:opacity-90 active:scale-95"
            style={{
              background: 'linear-gradient(135deg, rgba(168,85,247,0.8), rgba(236,72,153,0.6))',
              boxShadow: '0 0 30px rgba(168,85,247,0.3)',
            }}
          >
            覚えている
          </button>

          <button
            onClick={handleSkip}
            className="text-white/20 text-xs tracking-widest hover:text-white/40 transition-colors"
          >
            また今度
          </button>
        </div>

        {/* Fine print */}
        <p
          className="text-white/15 text-xs max-w-xs text-center leading-relaxed"
          style={{
            opacity: sealVisible ? 1 : 0,
            transition: 'opacity 1s ease 0.8s',
          }}
        >
          アカウントを作ると、{character.name}との記憶が永遠に残ります
        </p>
      </div>
    </div>
  );
}
