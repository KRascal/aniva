'use client';

import Link from 'next/link';
import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

export function FinalCTASection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });

  return (
    <section className="py-28 px-5 text-center relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
          width: '700px', height: '500px',
          background: 'radial-gradient(ellipse, rgba(139,92,246,0.22) 0%, transparent 70%)',
        }} />
      </div>

      <div className="relative z-10 max-w-lg mx-auto" ref={ref}>
        <motion.p
          className="text-purple-400 text-sm font-semibold tracking-wider uppercase mb-4"
          initial={{ opacity: 0, y: 10 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
        >
          あなたの物語が、始まる
        </motion.p>

        <motion.h2
          className="text-3xl sm:text-4xl font-black mb-4"
          style={{ lineHeight: 1.25, letterSpacing: '-0.02em' }}
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          今すぐ、
          <span style={{
            background: 'linear-gradient(135deg,#a855f7,#ec4899)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            あなたの物語
          </span>
          を<br />始める
        </motion.h2>

        <motion.p
          className="text-white/40 text-sm mb-10 leading-relaxed"
          initial={{ opacity: 0, y: 15 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          話すほど近くなる——<br />
          毎日が少しだけ、特別になる。
        </motion.p>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={inView ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.35, type: 'spring', stiffness: 200 }}
        >
          <Link
            href="/signup"
            className="inline-flex items-center gap-3 px-10 py-5 rounded-2xl text-white font-black text-lg transition-transform duration-200 hover:scale-[1.05] active:scale-[0.96]"
            style={{
              background: 'linear-gradient(135deg,#7c3aed,#ec4899)',
              boxShadow: '0 0 70px rgba(139,92,246,0.55)',
            }}
          >
            無料で始める
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M4 10h12M12 5l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
        </motion.div>

        <motion.p
          className="mt-5 text-white/25 text-xs"
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ delay: 0.6 }}
        >
          無料で始められます · クレジットカード不要
        </motion.p>
      </div>
    </section>
  );
}
