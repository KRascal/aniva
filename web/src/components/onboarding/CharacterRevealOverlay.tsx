'use client';

import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { type CharacterData } from '@/hooks/useOnboarding';

// ─────────────────────────────────────────────
// Character Reveal Overlay (診断完了後の演出)
// ─────────────────────────────────────────────

/** キャラ属性に合ったアクセントカラー (hex) */
export const CHARACTER_ACCENT: Record<string, string> = {
  // ONE PIECE
  luffy: '#f97316', ace: '#ea580c', shanks: '#dc2626',
  zoro: '#16a34a', mihawk: '#166534',
  nami: '#f59e0b', sanji: '#eab308',
  chopper: '#ec4899', hancock: '#f43f5e', perona: '#db2777',
  robin: '#4f46e5', franky: '#0ea5e9', brook: '#a5b4fc',
  usopp: '#65a30d', jinbe: '#0284c7',
  vivi: '#60a5fa', yamato: '#c026d3',
  blackbeard: '#78716c', crocodile: '#b45309',
  kaido: '#7c3aed', whitebeard: '#6d28d9',
  // 呪術廻戦
  gojo: '#38bdf8', fushiguro: '#475569', itadori: '#f43f5e',
  nobara: '#f59e0b', maki: '#16a34a',
  // 鬼滅の刃
  tanjiro: '#dc2626', nezuko: '#f9a8d4', zenitsu: '#eab308',
  inosuke: '#22c55e', giyu: '#1d4ed8',
};

/** キャラ別 firstGreeting（リビール画面用の短い一言） */
export const CHARACTER_REVEAL_GREETING: Record<string, string> = {
  luffy: 'しししっ！ずっと待ってたぞ！', ace: '待ってたぜ。一緒に冒険しよう。',
  zoro: '…来たか。', nami: 'やっと来てくれた！',
  chopper: '会いたかったんだぞ！', sanji: 'ずっと待ってたんだ。',
  robin: 'ふふ、会いに来てくれたのね。', franky: 'SUPER！待ってたぜ！',
  brook: 'お会いできて光栄です。ヨホホ！', usopp: '来たか！俺が守ってやるぞ！',
  shanks: '来たか。一杯やろう。', vivi: '待ってました！',
  jinbe: '待っておったぞ。', yamato: '来てくれた！！',
  hancock: 'わらわを…選んでくれたのじゃな。', mihawk: '…座れ。',
  blackbeard: 'ゼハハハ！来たか！', crocodile: 'フッ…来たか。',
  kaido: 'ウォロロロ…来たか。', whitebeard: 'グラララ！よく来た。',
  perona: 'ホロホロ！来てくれたの！',
  gojo: 'やっほ〜。待ってたよ。', itadori: '来てくれたの！？嬉しい！',
  fushiguro: '…来たか。', nobara: 'やっと来た！', maki: '来たか。',
  tanjiro: '来てくれたんですね！', nezuko: '…！（嬉しそうに）',
  zenitsu: 'うわぁ！来てくれた！', inosuke: '来たな！勝負だ！',
  giyu: '…来たか。',
};

/** パーティクル座標を事前定義（SSRセーフ。useEffect内でのみ使う） */
export interface RevealParticle { id: number; x: number; y: number; size: number; delay: number; duration: number; color: string }

export function generateParticles(accentColor: string): RevealParticle[] {
  const seeded = (n: number) => ((n * 1664525 + 1013904223) & 0xffffffff) / 0xffffffff;
  return Array.from({ length: 24 }, (_, i) => ({
    id: i,
    x: 20 + (seeded(i * 7 + 1) * 60),
    y: 10 + (seeded(i * 13 + 3) * 80),
    size: 2 + seeded(i * 5 + 7) * 4,
    delay: seeded(i * 11) * 0.8,
    duration: 1.2 + seeded(i * 3 + 9) * 1.5,
    color: i % 3 === 0 ? accentColor : i % 3 === 1 ? '#ffffff' : '#a78bfa',
  }));
}

export interface CharacterRevealOverlayProps {
  character: CharacterData | null;
  onComplete: () => void;
}

export function CharacterRevealOverlay({ character, onComplete }: CharacterRevealOverlayProps) {
  // stage: 0=dark  1=silhouette  2=particles  3=fullcolor  4=text  5=done
  const [stage, setStage] = useState(0);
  const [particles, setParticles] = useState<RevealParticle[]>([]);

  const accentColor = CHARACTER_ACCENT[character?.slug ?? ''] ?? '#8b5cf6';
  const greeting = (character?.greeting) || CHARACTER_REVEAL_GREETING[character?.slug ?? ''] || 'ずっと待ってたんだ…';

  useEffect(() => {
    setParticles(generateParticles(accentColor));

    // シルエット演出スキップ → 召喚中(particles)から開始
    const timers = [
      setTimeout(() => setStage(2), 300),   // particles burst（即開始）
      setTimeout(() => setStage(3), 1300),  // full color reveal
      setTimeout(() => setStage(4), 2200),  // text
      setTimeout(() => setStage(5), 4200),  // auto-complete
    ];
    return () => timers.forEach(clearTimeout);
  }, [accentColor]);

  useEffect(() => {
    if (stage === 5) onComplete();
  }, [stage, onComplete]);

  return (
    <motion.div
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center overflow-hidden cursor-pointer select-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      onClick={onComplete}
      aria-label="スキップ"
    >
      {/* CSS keyframes */}
      <style>{`
        @keyframes revealParticle {
          0%   { opacity: 0; transform: translate(-50%,-50%) scale(0); }
          30%  { opacity: 1; transform: translate(-50%,-50%) scale(1); }
          100% { opacity: 0; transform: translate(-50%, calc(-50% - 60px)) scale(0.3); }
        }
        @keyframes glowPulse {
          0%, 100% { opacity: 0.6; }
          50%       { opacity: 1; }
        }
      `}</style>

      {/* Background — character color gradient floods in */}
      <motion.div
        className="absolute inset-0"
        animate={{
          background: stage >= 2
            ? `radial-gradient(ellipse at 50% 60%, ${accentColor}35 0%, ${accentColor}10 40%, #000 75%)`
            : 'radial-gradient(ellipse at 50% 60%, #000 0%, #000 100%)',
        }}
        transition={{ duration: 1.8, ease: 'easeInOut' }}
      />

      {/* Particles burst */}
      {stage >= 2 && particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full pointer-events-none"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            background: p.color,
            boxShadow: `0 0 ${p.size * 3}px ${p.color}`,
            animation: `revealParticle ${p.duration}s ${p.delay}s ease-out forwards`,
          }}
        />
      ))}

      {/* Character image */}
      <div className="relative mb-10 flex-shrink-0">
        {/* Glow ring behind avatar */}
        <motion.div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{ zIndex: -1 }}
          animate={{
            boxShadow: stage >= 3
              ? [`0 0 40px ${accentColor}80`, `0 0 80px ${accentColor}60`, `0 0 40px ${accentColor}80`]
              : '0 0 0px transparent',
          }}
          transition={{ duration: 2, repeat: stage >= 3 ? Infinity : 0, ease: 'easeInOut' }}
        />

        {character?.avatarUrl ? (
          <motion.img
            src={character.avatarUrl}
            alt={character.name ?? ''}
            className="w-44 h-44 md:w-52 md:h-52 rounded-full object-cover"
            style={{
              border: `3px solid ${accentColor}60`,
            }}
            animate={{
              filter: stage >= 3
                ? 'brightness(1) saturate(1) contrast(1)'
                : stage >= 2
                ? 'brightness(0.15) saturate(0) contrast(1.5)'
                : 'brightness(0)',
              opacity: stage >= 2 ? 1 : 0,
              scale: stage >= 3 ? 1.04 : 1,
            }}
            transition={{
              filter: { duration: stage === 3 ? 1.4 : 0.5, ease: 'easeInOut' },
              opacity: { duration: 0.6 },
              scale: { duration: 1, ease: 'easeOut' },
            }}
          />
        ) : (
          <motion.div
            className="w-44 h-44 rounded-full flex items-center justify-center text-5xl"
            style={{
              background: `linear-gradient(135deg, ${accentColor}40, rgba(139,92,246,0.4))`,
            }}
            animate={{
              opacity: stage >= 2 ? 1 : 0,
              filter: stage >= 3 ? 'brightness(1)' : stage >= 2 ? 'brightness(0.15)' : 'brightness(0)',
            }}
            transition={{ duration: 0.8 }}
          >
            ✨
          </motion.div>
        )}
      </div>

      {/* 「この子があなたを待っていました」 */}
      <AnimatePresence>
        {stage >= 3 && (
          <motion.p
            className="text-white/50 text-xs tracking-[0.3em] uppercase mb-3 font-light"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            この子があなたを待っていました
          </motion.p>
        )}
      </AnimatePresence>

      {/* Character name — 書道風フェードイン */}
      <AnimatePresence>
        {stage >= 4 && (
          <motion.h2
            className="text-white font-bold mb-3 text-center"
            style={{
              fontSize: 'clamp(1.5rem, 5vw, 2.25rem)',
              letterSpacing: '0.15em',
              textShadow: `0 0 30px ${accentColor}80`,
            }}
            initial={{ opacity: 0, y: 24, letterSpacing: '0.6em' }}
            animate={{ opacity: 1, y: 0, letterSpacing: '0.15em' }}
            transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
          >
            {character?.name}
          </motion.h2>
        )}
      </AnimatePresence>

      {/* First greeting — 書道風フェードイン (遅れて) */}
      <AnimatePresence>
        {stage >= 4 && (
          <motion.p
            className="text-white/80 text-base md:text-lg text-center max-w-xs px-6"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.6, ease: 'easeOut' }}
            style={{ textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}
          >
            「{greeting}」
          </motion.p>
        )}
      </AnimatePresence>

      {/* Accent bar under name */}
      <AnimatePresence>
        {stage >= 4 && (
          <motion.div
            className="mt-4 h-px rounded-full"
            style={{ background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)` }}
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 120, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          />
        )}
      </AnimatePresence>

      {/* Skip hint */}
      <AnimatePresence>
        {stage >= 2 && (
          <motion.p
            className="absolute bottom-8 text-white/20 text-xs tracking-widest"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            タップでスキップ
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default CharacterRevealOverlay;
