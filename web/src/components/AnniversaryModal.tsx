'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface AnniversaryEvent {
  type: 'days' | 'messages' | 'first_meeting';
  milestone: number;
  characterName: string;
  daysSinceFirstMeeting: number;
  rewardCoins?: number;
}

interface AnniversaryModalProps {
  userId: string;
}

export default function AnniversaryModal({ userId }: AnniversaryModalProps) {
  const [event, setEvent] = useState<AnniversaryEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [claimed, setClaimed] = useState(false);

  useEffect(() => {
    if (!userId) return;
    // 今日の記念日チェック（1日1回）
    const lastCheck = localStorage.getItem('aniva_anniversary_check');
    const today = new Date().toDateString();
    if (lastCheck === today) return;

    fetch('/api/anniversary/check')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.event) {
          setEvent(data.event);
          setVisible(true);
          localStorage.setItem('aniva_anniversary_check', today);
        }
      })
      .catch(() => {});
  }, [userId]);

  const handleClaim = async () => {
    if (!event) return;
    setClaimed(true);
    try {
      await fetch('/api/anniversary/claim', { method: 'POST' });
    } catch { /* best effort */ }
    setTimeout(() => setVisible(false), 2000);
  };

  const getMilestoneLabel = (e: AnniversaryEvent): string => {
    if (e.type === 'days') return `${e.milestone}日記念`;
    if (e.type === 'messages') return `${e.milestone}通記念`;
    return '出会い記念日';
  };

  return (
    <AnimatePresence>
      {visible && event && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{ background: 'rgba(3,7,18,0.92)', backdropFilter: 'blur(16px)' }}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="w-full max-w-sm rounded-3xl overflow-hidden"
            style={{
              background: 'linear-gradient(145deg, rgba(139,92,246,0.15), rgba(236,72,153,0.1), rgba(3,7,18,0.95))',
              border: '1px solid rgba(139,92,246,0.3)',
              boxShadow: '0 8px 40px rgba(139,92,246,0.25)',
            }}
          >
            <div className="px-6 pt-8 pb-6 text-center">
              {/* Sparkle icon */}
              <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.3), rgba(236,72,153,0.3))', border: '1px solid rgba(139,92,246,0.4)' }}
              >
                <span className="text-3xl">🎉</span>
              </div>

              <h2 className="text-white font-bold text-lg mb-1">{getMilestoneLabel(event)}</h2>
              <p className="text-white/60 text-sm mb-4">
                {event.characterName}と出会って{event.daysSinceFirstMeeting}日
              </p>

              {event.rewardCoins && !claimed && (
                <div className="mb-4 py-2 px-4 rounded-xl inline-flex items-center gap-2"
                  style={{ background: 'rgba(250,204,21,0.1)', border: '1px solid rgba(250,204,21,0.2)' }}
                >
                  <span className="text-yellow-400 text-sm font-bold">+{event.rewardCoins} コイン</span>
                </div>
              )}

              {claimed ? (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="text-green-400 font-bold text-sm"
                >
                  受け取りました！
                </motion.div>
              ) : (
                <button
                  onClick={handleClaim}
                  className="w-full py-3 rounded-2xl font-bold text-sm text-white transition-all active:scale-[0.97]"
                  style={{
                    background: 'linear-gradient(135deg, rgba(139,92,246,0.7), rgba(236,72,153,0.7))',
                    border: '1px solid rgba(139,92,246,0.4)',
                    boxShadow: '0 4px 16px rgba(139,92,246,0.3)',
                  }}
                >
                  記念ボーナスを受け取る
                </button>
              )}
            </div>

            <button
              onClick={() => setVisible(false)}
              className="w-full py-3 text-white/40 text-xs font-medium border-t border-white/5"
            >
              閉じる
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
