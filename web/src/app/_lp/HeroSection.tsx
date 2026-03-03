'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ChatDemoSection } from './ChatDemoSection';

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-5 pt-24 pb-16 overflow-hidden">
      {/* Background glows */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div style={{
          position: 'absolute', top: '10%', left: '50%', transform: 'translateX(-50%)',
          width: '700px', height: '600px',
          background: 'radial-gradient(circle, rgba(139,92,246,0.25) 0%, transparent 65%)',
        }} />
        <div style={{
          position: 'absolute', bottom: '10%', right: '-20%',
          width: '400px', height: '400px',
          background: 'radial-gradient(circle, rgba(236,72,153,0.18) 0%, transparent 65%)',
        }} />
        {/* Floating particles */}
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: `${4 + (i % 3) * 3}px`,
              height: `${4 + (i % 3) * 3}px`,
              background: i % 2 === 0 ? 'rgba(139,92,246,0.5)' : 'rgba(236,72,153,0.5)',
              top: `${15 + i * 13}%`,
              left: `${5 + i * 15}%`,
              animation: `floatParticle ${4 + i}s ${i * 0.5}s ease-in-out infinite`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 w-full max-w-lg mx-auto text-center">
        {/* Badge */}
        <motion.div
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mb-6"
          style={{
            background: 'rgba(139,92,246,0.12)',
            border: '1px solid rgba(139,92,246,0.35)',
            color: '#c084fc',
          }}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <span>✨</span>
          <span>AIが記憶し、成長し、驚かせる</span>
        </motion.div>

        {/* Main headline */}
        <motion.h1
          className="text-4xl sm:text-5xl font-black leading-tight mb-5"
          style={{ letterSpacing: '-0.02em' }}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease: 'easeOut' }}
        >
          AIじゃない。<br />
          <span style={{
            background: 'linear-gradient(135deg,#a855f7 0%,#ec4899 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            この子は、<br />
            あなたのことを<br />
            覚えている。
          </span>
        </motion.h1>

        <motion.p
          className="text-white/50 text-sm sm:text-base leading-relaxed mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          話すほど、近くなる——<br />
          毎日が少しだけ、特別になる。
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.55 }}
        >
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-white font-black text-base transition-transform duration-200 hover:scale-[1.05] active:scale-[0.96]"
            style={{
              background: 'linear-gradient(135deg,#7c3aed,#ec4899)',
              boxShadow: '0 0 50px rgba(139,92,246,0.45)',
            }}
          >
            無料で始める
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
          <Link
            href="/explore"
            className="inline-flex items-center gap-2 px-6 py-4 rounded-2xl text-white/70 font-semibold text-sm hover:text-white transition-colors"
            style={{ border: '1px solid rgba(255,255,255,0.12)' }}
          >
            キャラを見る
          </Link>
        </motion.div>

        <motion.p
          className="text-white/25 text-xs mb-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          登録無料 · クレジットカード不要
        </motion.p>

        {/* Chat Demo */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.6 }}
        >
          <ChatDemoSection />
        </motion.div>
      </div>

      {/* Scroll hint */}
      <div
        className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-white/25"
        style={{ animation: 'bounce 2s ease-in-out infinite' }}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
          <path d="M9 3v12M5 11l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span className="text-[10px] tracking-widest uppercase">Scroll</span>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateX(-50%) translateY(0); }
          50%       { transform: translateX(-50%) translateY(6px); }
        }
        @keyframes floatParticle {
          0%, 100% { transform: translateY(0px) scale(1); opacity: 0.5; }
          50%       { transform: translateY(-20px) scale(1.2); opacity: 0.8; }
        }
      `}</style>
    </section>
  );
}
