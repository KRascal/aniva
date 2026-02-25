'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import SummoningEffect from '@/components/onboarding/SummoningEffect';
import CharacterReveal, { CharacterData } from '@/components/onboarding/CharacterReveal';
import OnboardingChat from '@/components/onboarding/OnboardingChat';
import PromiseSeal from '@/components/onboarding/PromiseSeal';
import { getGuestSessionId, GuestMessage, OnboardingStep } from '@/lib/onboarding-session';

// Character color map by slug
const CHARACTER_COLORS: Record<string, string> = {
  luffy: '#f97316',
  zoro: '#22c55e',
  nami: '#f59e0b',
  chopper: '#ec4899',
  ace: '#ef4444',
};

function getCharacterColor(character: CharacterData): string {
  return CHARACTER_COLORS[character.slug] ?? '#a855f7';
}

function LoadingDark() {
  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center">
      <div
        className="w-2 h-2 rounded-full bg-purple-400/40 animate-pulse"
        style={{ boxShadow: '0 0 12px rgba(168,85,247,0.4)' }}
      />
    </div>
  );
}

function NotFound() {
  return (
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-center gap-4">
      <p className="text-white/30 text-sm tracking-widest">キャラクターが見つかりませんでした</p>
      <a href="/explore" className="text-white/20 text-xs hover:text-white/40 transition-colors">
        探しに戻る
      </a>
    </div>
  );
}

export default function EncounterPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? '';

  const [step, setStep] = useState<OnboardingStep>('summoning');
  const [character, setCharacter] = useState<CharacterData | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [guestHistory, setGuestHistory] = useState<GuestMessage[]>([]);
  const [meetDate] = useState<Date>(() => new Date());
  const [guestSessionId, setGuestSessionId] = useState<string>('');

  // Initialize guest session on client
  useEffect(() => {
    setGuestSessionId(getGuestSessionId());
  }, []);

  // Fetch character data
  useEffect(() => {
    if (!slug) return;

    fetch(`/api/characters/${encodeURIComponent(slug)}`)
      .then((r) => {
        if (!r.ok) throw new Error('not found');
        return r.json();
      })
      .then((d) => setCharacter(d.character))
      .catch(() => setNotFound(true));
  }, [slug]);

  const handleSummoningComplete = useCallback(() => {
    setStep('encounter');
  }, []);

  const handleEncounterComplete = useCallback(() => {
    setStep('chat');
  }, []);

  const handleChatComplete = useCallback((history: GuestMessage[]) => {
    setGuestHistory(history);
    setStep('promise');
  }, []);

  const handlePromiseComplete = useCallback(() => {
    if (character) {
      window.location.href = `/chat/${character.id}`;
    } else {
      window.location.href = '/explore';
    }
  }, [character]);

  if (notFound) return <NotFound />;
  if (!character || !guestSessionId) return <LoadingDark />;

  const characterColor = getCharacterColor(character);

  return (
    <div className="fixed inset-0 bg-black overflow-hidden">
      {step === 'summoning' && (
        <SummoningEffect
          characterColor={characterColor}
          onComplete={handleSummoningComplete}
        />
      )}

      {step === 'encounter' && (
        <CharacterReveal
          character={character}
          onComplete={handleEncounterComplete}
        />
      )}

      {step === 'chat' && (
        <OnboardingChat
          character={character}
          guestSessionId={guestSessionId}
          onComplete={handleChatComplete}
        />
      )}

      {step === 'promise' && (
        <PromiseSeal
          character={character}
          meetDate={meetDate}
          guestChatHistory={guestHistory}
          onComplete={handlePromiseComplete}
        />
      )}
    </div>
  );
}
