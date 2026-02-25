'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ParticleField from '@/components/onboarding/ParticleField';
import CharacterSearchInput from '@/components/onboarding/CharacterSearchInput';

export default function TheDoor() {
  const [textVisible, setTextVisible] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => setTextVisible(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="fixed inset-0 bg-black overflow-hidden">
      {/* パーティクル層 */}
      <ParticleField density={30} colors={['#a855f7', '#ec4899', '#7c3aed']} />

      {/* 中央コンテンツ */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center gap-10 px-6"
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
          会いたい人が、いるんでしょう？
        </h1>

        {/* 検索入力 */}
        <CharacterSearchInput
          onSelect={(slug) => router.push(`/c/${slug}`)}
          placeholder="名前を呼んでみて…"
        />

        {/* パターンC導線 */}
        <a
          href="/discover"
          className="text-white/30 text-sm hover:text-white/60 transition-colors"
          style={{ letterSpacing: '0.1em' }}
        >
          誰かに会いたい
        </a>
      </div>
    </div>
  );
}
