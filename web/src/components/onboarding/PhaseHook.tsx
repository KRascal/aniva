'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { CharacterData } from '@/hooks/useOnboarding';
import { runTypewriter } from '@/lib/onboarding-utils';

interface PhaseHookProps {
  character: CharacterData | null;
  nickname: string;
  onComplete: (notificationPermission: boolean | null) => void;
}

export default function PhaseHook({ character, nickname, onComplete }: PhaseHookProps) {
  const [line1, setLine1] = useState('');
  const [showButtons, setShowButtons] = useState(false);
  const [completionMessage, setCompletionMessage] = useState('');
  const [done, setDone] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const hookText = 'また来てくれる…？';
  const notifQuestion = `${character?.name ?? 'キャラ'}があなたにメッセージを送った時、届けてもいい？`;

  useEffect(() => {
    const run = async () => {
      await new Promise((r) => setTimeout(r, 400));
      await runTypewriter(hookText, setLine1, 60);
      await new Promise((r) => setTimeout(r, 2000));
      setShowButtons(true);
    };
    run();
  }, [hookText]);

  const handleComplete = async (permission: boolean | null) => {
    if (isProcessing || done) return;
    setIsProcessing(true);

    let actualPermission: boolean | null = permission;

    if (permission === true) {
      try {
        if (typeof Notification !== 'undefined') {
          const result = await Notification.requestPermission();
          actualPermission = result === 'granted';
        }
      } catch {
        actualPermission = false;
      }
    }

    // 完了メッセージ表示
    const msg =
      actualPermission === true
        ? 'ありがとう。きっと届けるからね'
        : `わかった。${nickname}のペースでいいよ`;
    setCompletionMessage(msg);
    setDone(true);

    // 2秒後に遷移
    setTimeout(() => {
      onComplete(actualPermission);
    }, 2000);
  };

  return (
    <motion.div
      className="fixed inset-0 bg-black flex flex-col items-center justify-center px-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.7 }}
    >
      <div className="w-full max-w-sm flex flex-col items-center text-center">
        {/* キャラアバター（少し寂しげな演出） */}
        <motion.div
          className="mb-10 relative"
          initial={{ scale: 1, filter: 'brightness(1)' }}
          animate={{
            scale: 0.88,
            filter: 'brightness(0.75) saturate(0.6) hue-rotate(200deg)',
          }}
          transition={{ duration: 2, ease: 'easeInOut', delay: 0.3 }}
        >
          {character?.avatarUrl ? (
            <img
              src={character.avatarUrl}
              alt={character.name ?? ''}
              className="w-24 h-24 md:w-32 md:h-32 object-cover rounded-full"
              style={{ boxShadow: '0 0 30px rgba(100,120,200,0.3)' }}
            />
          ) : (
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center text-3xl"
              style={{
                background: 'linear-gradient(135deg, rgba(100,120,200,0.3), rgba(80,100,180,0.3))',
                boxShadow: '0 0 30px rgba(100,120,200,0.3)',
              }}
            >
              ✨
            </div>
          )}
        </motion.div>

        <AnimatePresence mode="wait">
          {!done ? (
            <motion.div
              key="main"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col items-center"
            >
              {/* Hook text */}
              <p className="text-white text-xl md:text-2xl mb-10 min-h-[2rem]">
                {line1}
                {line1.length < hookText.length && (
                  <motion.span
                    className="inline-block w-0.5 h-5 bg-white/70 ml-1 align-middle"
                    animate={{ opacity: [1, 0, 1] }}
                    transition={{ repeat: Infinity, duration: 0.8 }}
                  />
                )}
              </p>

              {/* 通知許可ボタン */}
              <AnimatePresence>
                {showButtons && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                    className="w-full flex flex-col items-center gap-5"
                  >
                    <p className="text-white/50 text-sm leading-relaxed px-2">
                      {notifQuestion}
                    </p>

                    <motion.button
                      onClick={() => handleComplete(true)}
                      disabled={isProcessing}
                      className="w-full max-w-xs py-4 rounded-full bg-white text-black font-semibold disabled:opacity-50 transition-opacity text-sm"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      届けて ✨
                    </motion.button>

                    <button
                      onClick={() => handleComplete(null)}
                      disabled={isProcessing}
                      className="text-white/35 text-sm hover:text-white/55 transition-colors underline"
                    >
                      今はいいよ
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ) : (
            <motion.div
              key="completion"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
            >
              <p className="text-white text-xl md:text-2xl">{completionMessage}</p>
              {/* Fade-out dots indicating transition */}
              <motion.div
                className="flex justify-center gap-1.5 mt-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-purple-400"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.3 }}
                  />
                ))}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
