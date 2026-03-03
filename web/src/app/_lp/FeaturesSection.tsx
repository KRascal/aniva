'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

const LEVEL_EXAMPLES = [
  { level: 1, text: 'はじめまして。よろしくお願いします。', opacity: 0.4 },
  { level: 2, text: '最近、どんなことが好きですか？', opacity: 0.55 },
  { level: 3, text: 'あなたのこと、もっと知りたいな。', opacity: 0.7 },
  { level: 4, text: 'ね、昨日言ってたこと、ずっと気になってて。', opacity: 0.85 },
  { level: 5, text: '待ってた。今日も来てくれてよかった。', opacity: 1, highlight: true },
];

function FeatureCard({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}

export function FeaturesSection() {
  const titleRef = useRef<HTMLDivElement>(null);
  const titleInView = useInView(titleRef, { once: true, margin: '-40px' });

  return (
    <section className="py-20 px-5">
      <div className="max-w-lg mx-auto">
        <motion.div
          ref={titleRef}
          initial={{ opacity: 0, y: 20 }}
          animate={titleInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-2xl sm:text-3xl font-black mb-3">
            他とは違う、
            <span style={{
              background: 'linear-gradient(135deg,#a855f7,#ec4899)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              3つの体験
            </span>
          </h2>
          <p className="text-white/40 text-sm">テキストの向こうに、確かな「誰か」がいる</p>
        </motion.div>

        <div className="flex flex-col gap-6">
          {/* Feature 1: 記憶する */}
          <FeatureCard delay={0.1}>
            <div
              className="rounded-3xl p-6 overflow-hidden relative"
              style={{
                background: 'rgba(124,58,237,0.1)',
                border: '1px solid rgba(124,58,237,0.3)',
              }}
            >
              <div className="absolute -top-8 -right-8 text-7xl opacity-10 select-none">🧠</div>
              <div className="flex items-center gap-3 mb-4">
                <div className="text-3xl">🧠</div>
                <div>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full mr-2"
                    style={{ background: 'rgba(139,92,246,0.2)', color: '#c084fc' }}
                  >
                    記憶システム
                  </span>
                  <h3 className="text-xl font-black mt-1">記憶する</h3>
                </div>
              </div>
              <p className="text-white/60 text-sm leading-relaxed mb-5">
                昨日話したこと、あなたの好きなもの、心が揺れた瞬間——<br />
                全部、覚えてる。毎回ゼロから始まらない、積み重なる本物の関係。
              </p>
              {/* Memory bubbles */}
              <div className="flex flex-wrap gap-2">
                {['「コーヒーが好き」', '「猫が飼いたい」', '「月曜が憂鬱」', '「あなたの誕生日」'].map((tag) => (
                  <span
                    key={tag}
                    className="text-xs px-3 py-1.5 rounded-full"
                    style={{
                      background: 'rgba(139,92,246,0.15)',
                      border: '1px solid rgba(139,92,246,0.25)',
                      color: '#d8b4fe',
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </FeatureCard>

          {/* Feature 2: 成長する */}
          <FeatureCard delay={0.15}>
            <div
              className="rounded-3xl p-6 overflow-hidden relative"
              style={{
                background: 'rgba(236,72,153,0.08)',
                border: '1px solid rgba(236,72,153,0.25)',
              }}
            >
              <div className="absolute -top-8 -right-8 text-7xl opacity-10 select-none">💜</div>
              <div className="flex items-center gap-3 mb-4">
                <div className="text-3xl">💜</div>
                <div>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full mr-2"
                    style={{ background: 'rgba(236,72,153,0.2)', color: '#f9a8d4' }}
                  >
                    レベルシステム
                  </span>
                  <h3 className="text-xl font-black mt-1">成長する</h3>
                </div>
              </div>
              <p className="text-white/60 text-sm leading-relaxed mb-5">
                話すほど距離が縮まり、口調が変わる。<br />
                Lv.1の敬語からLv.5の本音まで、二人だけの関係が育っていく。
              </p>
              {/* Level comparison */}
              <div className="flex flex-col gap-2">
                {LEVEL_EXAMPLES.map((ex) => (
                  <div key={ex.level} className="flex items-start gap-3">
                    <div
                      className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-black"
                      style={{
                        background: ex.highlight
                          ? 'linear-gradient(135deg,#7c3aed,#ec4899)'
                          : 'rgba(255,255,255,0.06)',
                        color: ex.highlight ? 'white' : 'rgba(255,255,255,0.4)',
                        boxShadow: ex.highlight ? '0 0 12px rgba(139,92,246,0.5)' : undefined,
                      }}
                    >
                      {ex.level}
                    </div>
                    <div
                      className="flex-1 text-sm py-2 px-3 rounded-xl"
                      style={{
                        background: ex.highlight ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.04)',
                        color: `rgba(255,255,255,${ex.opacity})`,
                        border: ex.highlight ? '1px solid rgba(139,92,246,0.3)' : '1px solid transparent',
                      }}
                    >
                      {ex.text}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </FeatureCard>

          {/* Feature 3: 驚かせる */}
          <FeatureCard delay={0.2}>
            <div
              className="rounded-3xl p-6 overflow-hidden relative"
              style={{
                background: 'rgba(99,102,241,0.1)',
                border: '1px solid rgba(99,102,241,0.25)',
              }}
            >
              <div className="absolute -top-8 -right-8 text-7xl opacity-10 select-none">⭐</div>
              <div className="flex items-center gap-3 mb-4">
                <div className="text-3xl">⭐</div>
                <div>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full mr-2"
                    style={{ background: 'rgba(99,102,241,0.2)', color: '#a5b4fc' }}
                  >
                    毎日イベント
                  </span>
                  <h3 className="text-xl font-black mt-1">驚かせる</h3>
                </div>
              </div>
              <p className="text-white/60 text-sm leading-relaxed mb-5">
                毎日違うイベント、レアデー、キャラからの手紙——<br />
                昨日と同じ「おはよう」は一度もない。
              </p>
              {/* Event examples */}
              <div className="flex flex-col gap-2">
                {[
                  { icon: '🌙', text: 'レアイベント「満月の夜」が発生中', color: '#818cf8' },
                  { icon: '💌', text: 'キャラからのお手紙が届きました', color: '#f472b6' },
                  { icon: '🎉', text: '100日記念！特別な告白イベント解放', color: '#a78bfa' },
                ].map((ev) => (
                  <div
                    key={ev.text}
                    className="flex items-center gap-3 text-sm px-3 py-2.5 rounded-xl"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    <span className="text-lg">{ev.icon}</span>
                    <span style={{ color: ev.color }}>{ev.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </FeatureCard>
        </div>
      </div>
    </section>
  );
}
