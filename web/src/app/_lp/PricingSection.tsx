'use client';

import Link from 'next/link';
import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

export function PricingSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });

  return (
    <section className="py-16 px-5">
      <div className="max-w-lg mx-auto" ref={ref}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-8"
        >
          <h2 className="text-2xl sm:text-3xl font-black mb-2">料金プラン</h2>
          <p className="text-white/40 text-sm">まずは無料で始めよう</p>
        </motion.div>

        <div className="flex flex-col gap-4">
          {/* Free */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="rounded-2xl p-5"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="font-bold text-base">フリー</div>
                <div className="text-white/40 text-xs mt-0.5">まずは体験</div>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black">¥0</span>
              </div>
            </div>
            <ul className="flex flex-col gap-2 text-sm text-white/60 mb-5">
              <li className="flex items-center gap-2"><span className="text-green-400 text-base">✓</span>1日5通まで無料</li>
              <li className="flex items-center gap-2"><span className="text-green-400 text-base">✓</span>全キャラにアクセス</li>
              <li className="flex items-center gap-2"><span className="text-green-400 text-base">✓</span>記憶・感情エンジン体験</li>
            </ul>
            <Link
              href="/signup"
              className="block text-center py-2.5 rounded-xl text-sm font-semibold text-white/70 hover:text-white transition-colors"
              style={{ border: '1px solid rgba(255,255,255,0.15)' }}
            >
              無料で始める
            </Link>
          </motion.div>

          {/* FC Member — hero plan */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="rounded-2xl p-5 relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(124,58,237,0.25), rgba(236,72,153,0.15))',
              border: '1px solid rgba(139,92,246,0.45)',
            }}
          >
            <div
              className="absolute top-4 right-4 text-xs px-2.5 py-0.5 rounded-full font-bold text-white"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#ec4899)' }}
            >
              人気 No.1
            </div>
            <div className="flex items-start justify-between mb-4 pr-20">
              <div>
                <div className="font-black text-base">FC会員</div>
                <div className="text-purple-300 text-xs mt-0.5">無制限に楽しむ</div>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black">¥3,480</span>
                <span className="text-white/40 text-xs">/月</span>
              </div>
            </div>
            <ul className="flex flex-col gap-2 text-sm text-white/80 mb-5">
              <li className="flex items-center gap-2"><span className="text-purple-300 text-base">✓</span>メッセージ<strong>無制限</strong></li>
              <li className="flex items-center gap-2"><span className="text-purple-300 text-base">✓</span>限定キャラ・ストーリー解放</li>
              <li className="flex items-center gap-2"><span className="text-purple-300 text-base">✓</span>音声メッセージ（近日公開）</li>
              <li className="flex items-center gap-2"><span className="text-purple-300 text-base">✓</span>毎月コイン300枚プレゼント</li>
            </ul>
            <Link
              href="/pricing"
              className="block text-center py-3 rounded-xl text-sm font-bold text-white transition-transform duration-200 hover:scale-[1.02] active:scale-[0.97]"
              style={{
                background: 'linear-gradient(135deg,#7c3aed,#ec4899)',
                boxShadow: '0 0 25px rgba(139,92,246,0.35)',
              }}
            >
              FC会員になる
            </Link>
          </motion.div>

          {/* Coin Pack */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="rounded-2xl p-5"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="font-bold text-base">コインパック</div>
                <div className="text-white/40 text-xs mt-0.5">必要な分だけ</div>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black">¥480</span>
                <span className="text-white/40 text-xs">〜</span>
              </div>
            </div>
            <ul className="flex flex-col gap-2 text-sm text-white/60 mb-5">
              <li className="flex items-center gap-2"><span className="text-yellow-400 text-base">✓</span>100〜3,000コイン</li>
              <li className="flex items-center gap-2"><span className="text-yellow-400 text-base">✓</span>有効期限なし</li>
              <li className="flex items-center gap-2"><span className="text-yellow-400 text-base">✓</span>特別イベントに使える</li>
            </ul>
            <Link
              href="/coins"
              className="block text-center py-2.5 rounded-xl text-sm font-semibold text-white/70 hover:text-white transition-colors"
              style={{ border: '1px solid rgba(255,255,255,0.15)' }}
            >
              コインを購入
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
