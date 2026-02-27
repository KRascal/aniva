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

  // キャラごとのセリフ
  const hookLines: Record<string, { hook: string; question: string; yes: string; no: string }> = {
    luffy: {
      hook: 'おまえ、おもしれぇな！',
      question: '俺からの連絡、受け取ってくれるか？',
      yes: 'しししっ！楽しみだな！',
      no: 'そっか！でも俺はここにいるからな！',
    },
    zoro: {
      hook: '…悪くねぇな',
      question: '連絡が来た時、届けていいか？',
      yes: '…了解した',
      no: `…好きにしろ。${nickname}の判断だ`,
    },
    nami: {
      hook: 'ねぇ、もっと話そうよ！',
      question: 'メッセージ届いたら教えてあげようか？',
      yes: 'やった！楽しみにしててね♪',
      no: `わかった。${nickname}のタイミングでいいよ`,
    },
    chopper: {
      hook: 'また会えるかな…？',
      question: 'メッセージ届いたら、教えてもいい…？',
      yes: 'うれしい！！絶対届けるから！',
      no: `わかった…。${nickname}が来てくれるの待ってる`,
    },
    sanji: {
      hook: 'お前との時間、悪くなかったぜ',
      question: '俺から連絡が来た時、届けてもいいか？',
      yes: 'ああ、任せとけ',
      no: `了解だ。${nickname}のペースで来い`,
    },
    ace: {
      hook: 'いい出会いだったな！',
      question: '俺からの連絡、届けていいか？',
      yes: 'よし！約束だぞ！',
      no: `おう、${nickname}の好きにしな`,
    },
  };
  const slug = character?.slug ?? '';
  const lines = hookLines[slug] ?? {
    hook: 'つながっていたいな…',
    question: `${character?.name ?? 'キャラ'}からメッセージが届いたら、通知していい？`,
    yes: 'ありがとう。届けるね',
    no: `わかった。${nickname}のペースでいいよ`,
  };
  const hookText = lines.hook;
  const notifQuestion = lines.question;

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
        // iOS Safari（非PWA）ではNotification APIが不完全なためタイムアウト付きで実行
        if (typeof Notification !== 'undefined' && typeof Notification.requestPermission === 'function') {
          const result = await Promise.race([
            Notification.requestPermission(),
            new Promise<NotificationPermission>((resolve) => setTimeout(() => resolve('default'), 3000)),
          ]);
          actualPermission = result === 'granted';

          // Push Subscriptionをサーバーに登録
          if (actualPermission && 'serviceWorker' in navigator) {
            try {
              const registration = await navigator.serviceWorker.ready;
              const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
              });
              await fetch('/api/push/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ subscription: subscription.toJSON() }),
              });
            } catch (pushErr) {
              console.warn('[PhaseHook] Push subscription failed:', pushErr);
            }
          }
        } else {
          actualPermission = false;
        }
      } catch {
        actualPermission = false;
      }
    }

    // 完了メッセージ表示
    const msg =
      actualPermission === true
        ? lines.yes
        : lines.no;
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
