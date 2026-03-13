'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import type { CharacterData } from '@/hooks/useOnboarding';
import { runTypewriter } from '@/lib/onboarding-utils';

interface PhaseApprovalProps {
  character: CharacterData | null;
  nickname: string;
  onComplete: () => void;
}

export default function PhaseApproval({ character, nickname, onComplete }: PhaseApprovalProps) {
  const [showApproval, setShowApproval] = useState(false);
  const [line1, setLine1] = useState('');
  const [showLine2, setShowLine2] = useState(false);
  const [line2, setLine2] = useState('');
  const [glowIntensity, setGlowIntensity] = useState(false);

  const APPROVAL_LINES: Record<string, { line1: (n: string) => string; line2: string }> = {
    luffy: { line1: (n) => `${n}か！いい名前だ！`, line2: 'お前と話したかったんだ！' },
    zoro: { line1: (n) => `${n}…。悪くない名前だ`, line2: '…待っていた' },
    nami: { line1: (n) => `${n}…。いい名前ね`, line2: 'ずっと待ってたんだ' },
    chopper: { line1: (n) => `${n}！すごくいい名前！`, line2: '会いたかったんだ！' },
    sanji: { line1: (n) => `${n}か…。いい名前だな`, line2: '待ってたぜ' },
    ace: { line1: (n) => `${n}！いい名前だな！`, line2: '待ってたぜ！' },
  };
  const charLines = APPROVAL_LINES[character?.slug ?? ''];
  const approvalLine1 = charLines?.line1(nickname) ?? `${nickname}…。いい名前だね`;
  const approvalLine2 = charLines?.line2 ?? 'ずっと待ってたんだ';

  useEffect(() => {
    // 0.8秒の沈黙（意図的な間）
    const silenceTimer = setTimeout(async () => {
      setShowApproval(true);
      setGlowIntensity(true);

      // タイプライター: Line 1
      await runTypewriter(approvalLine1, setLine1, 45);

      // 少し待ってからLine 2
      await new Promise((r) => setTimeout(r, 700));
      setShowLine2(true);
      await runTypewriter(approvalLine2, setLine2, 55);

      // 3秒後に自動遷移
      setTimeout(onComplete, 3000);
    }, 800);

    return () => clearTimeout(silenceTimer);
  }, [approvalLine1, approvalLine2, onComplete]);

  return (
    <motion.div
      className="fixed inset-0 bg-black flex flex-col items-center justify-center px-6 cursor-pointer"
      onClick={onComplete}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="w-full max-w-sm flex flex-col items-center">
        {/* キャラアバター（表情変化アニメーション） */}
        <motion.div
          className="mb-12 relative"
          animate={
            glowIntensity
              ? { scale: [1, 1.05, 1.02], filter: ['brightness(1)', 'brightness(1.1)', 'brightness(1.05)'] }
              : {}
          }
          transition={{ duration: 1.5, ease: 'easeInOut' }}
        >
          {character?.avatarUrl ? (
            <div className="relative">
              <img
                src={character.avatarUrl}
                alt={character.name ?? ''}
                className="w-28 h-28 md:w-36 md:h-36 object-cover rounded-full"
              />
              {/* Dynamic glow */}
              <motion.div
                className="absolute inset-0 rounded-full pointer-events-none"
                animate={
                  glowIntensity
                    ? {
                        boxShadow: [
                          '0 0 20px rgba(139,92,246,0.2)',
                          '0 0 50px rgba(139,92,246,0.6)',
                          '0 0 35px rgba(139,92,246,0.4)',
                        ],
                      }
                    : {
                        boxShadow: '0 0 20px rgba(139,92,246,0.2)',
                      }
                }
                transition={{ duration: 1.5, ease: 'easeInOut' }}
                style={{ borderRadius: '50%' }}
              />
            </div>
          ) : (
            <motion.div
              className="w-28 h-28 rounded-full flex items-center justify-center text-4xl"
              animate={
                glowIntensity
                  ? { boxShadow: ['0 0 20px rgba(139,92,246,0.2)', '0 0 50px rgba(139,92,246,0.6)', '0 0 35px rgba(139,92,246,0.4)'] }
                  : {}
              }
              transition={{ duration: 1.5 }}
              style={{
                background: 'linear-gradient(135deg, rgba(139,92,246,0.4), rgba(236,72,153,0.4))',
              }}
            >
              ✨
            </motion.div>
          )}
        </motion.div>

        {/* 待機中の3点リーダー */}
        {!showApproval && (
          <motion.div
            className="flex gap-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="text-white/40 text-2xl"
                animate={{ opacity: [0.3, 1, 0.3], y: [0, -4, 0] }}
                transition={{
                  repeat: Infinity,
                  duration: 1.2,
                  delay: i * 0.2,
                  ease: 'easeInOut',
                }}
              >
                .
              </motion.span>
            ))}
          </motion.div>
        )}

        {/* 承認テキスト */}
        {showApproval && (
          <motion.div
            className="text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            <p className="text-white text-xl md:text-2xl leading-relaxed min-h-[2rem]">
              {line1}
              {line1.length < approvalLine1.length && (
                <motion.span
                  className="inline-block w-0.5 h-5 bg-white/70 ml-1 align-middle"
                  animate={{ opacity: [1, 0, 1] }}
                  transition={{ repeat: Infinity, duration: 0.8 }}
                />
              )}
            </p>

            {showLine2 && (
              <motion.p
                className="text-white/70 text-lg md:text-xl mt-3 leading-relaxed min-h-[2rem]"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                {line2}
                {line2.length < approvalLine2.length && (
                  <motion.span
                    className="inline-block w-0.5 h-4 bg-white/50 ml-1 align-middle"
                    animate={{ opacity: [1, 0, 1] }}
                    transition={{ repeat: Infinity, duration: 0.8 }}
                  />
                )}
              </motion.p>
            )}
          </motion.div>
        )}
      </div>

      {/* Skip hint */}
      <motion.p
        className="absolute bottom-8 text-white/15 text-xs"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2 }}
      >
        タップで続ける
      </motion.p>
    </motion.div>
  );
}
