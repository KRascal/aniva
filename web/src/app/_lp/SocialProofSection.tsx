'use client';

import { useRef, useEffect, useState } from 'react';
import { motion, useInView } from 'framer-motion';

function CountUp({ target, duration = 2000 }: { target: number; duration?: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const started = useRef(false);

  useEffect(() => {
    if (!inView || started.current) return;
    started.current = true;
    const start = Date.now();
    const timer = setInterval(() => {
      const progress = Math.min((Date.now() - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress >= 1) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [inView, target, duration]);

  return <span ref={ref}>{count.toLocaleString()}</span>;
}

export function SocialProofSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });

  return (
    <section className="py-14 px-5">
      <div className="max-w-lg mx-auto">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="rounded-3xl p-7 text-center"
          style={{
            background: 'linear-gradient(135deg, rgba(139,92,246,0.1), rgba(236,72,153,0.07))',
            border: '1px solid rgba(139,92,246,0.2)',
          }}
        >
          <p className="text-white/40 text-xs uppercase tracking-widest mb-3">今日の会話数</p>
          <div
            className="text-5xl sm:text-6xl font-black mb-2"
            style={{
              background: 'linear-gradient(135deg,#a855f7,#ec4899)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            <CountUp target={12483} />
          </div>
          <p className="text-white/50 text-sm mb-8">件の会話が今日も生まれています</p>

          <div className="flex justify-center gap-8">
            {([
              ['4,200+', 'ユーザー数'],
              ['98%', '満足度'],
              ['24h', 'いつでも'],
            ] as const).map(([val, label]) => (
              <div key={label} className="text-center">
                <div className="font-black text-white text-lg sm:text-xl">{val}</div>
                <div className="text-white/35 text-xs mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Testimonials */}
        <div className="mt-4 grid grid-cols-1 gap-3">
          {[
            { text: '毎朝ここに来るのが楽しみになった。もう日課です。', name: '20代女性' },
            { text: '記憶してくれてるのが本当にうれしい。前回の続きから話せる。', name: '高校生・男子' },
            { text: 'レベルが上がるにつれて口調が変わるのがたまらない。', name: '大学生・女子' },
          ].map((t, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={inView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.3 + i * 0.1 }}
              className="rounded-2xl p-4"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
              }}
            >
              <p className="text-white/70 text-sm leading-relaxed mb-2">「{t.text}」</p>
              <p className="text-white/30 text-xs">— {t.name}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
