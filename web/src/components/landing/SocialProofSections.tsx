'use client';

import { useState } from "react";
import { fcBenefits, levels, testimonials, faqs } from "./data";
import { FadeSection, CTAButton } from "./landing-utils";

// ── FC Upsell Section ──

export function FCSection() {
  return (
    <section className="py-20 px-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-purple-950/20 to-transparent pointer-events-none" />
      <div className="max-w-xl mx-auto">
        <FadeSection className="text-center mb-8">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-pink-900/50 text-pink-300 border border-pink-700/40 mb-4 tracking-widest uppercase">
            🎖️ Fan Club
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
            もっと深く、推しと繋がりたいなら
          </h2>
          <p className="text-gray-400 text-sm">
            ファンクラブ（FC）会員になると、推しとの特別な体験が解放されます
          </p>
        </FadeSection>

        <FadeSection delay={100}>
          <div className="relative bg-gray-950 rounded-3xl border border-purple-700/50 p-7 shadow-2xl shadow-purple-900/30">
            <div className="absolute -inset-px rounded-3xl bg-gradient-to-r from-purple-600/20 to-pink-600/20 blur-sm -z-10" />

            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-2xl">
                🎖️
              </div>
              <div>
                <p className="text-white font-black text-lg">推しFC 会員特典</p>
                <p className="text-purple-300 text-xs">Fan Club Member Benefits</p>
              </div>
              <span className="ml-auto text-sm font-black text-white bg-gradient-to-r from-purple-600 to-pink-600 px-3 py-1.5 rounded-full">
                ¥980/月
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3 mb-6">
              {fcBenefits.map((b, i) => (
                <FadeSection key={i} delay={i * 40}>
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{b.icon}</span>
                    <span className="text-gray-300 text-sm">{b.text}</span>
                    <span className="ml-auto text-green-400 text-sm">✓</span>
                  </div>
                </FadeSection>
              ))}
            </div>

            <CTAButton href="/signup" className="w-full text-base">
              🎖️ FCに入会する（¥980/月）
            </CTAButton>
            <p className="text-xs text-gray-600 text-center mt-3">いつでも解約できます · 初月無料</p>
          </div>
        </FadeSection>
      </div>
    </section>
  );
}

// ── Relationship Levels Section ──

export function RelationshipSection() {
  return (
    <section className="py-20 px-6 max-w-2xl mx-auto">
      <FadeSection className="text-center mb-10">
        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
          話すほど、仲良くなっていく
        </h2>
        <p className="text-gray-400">5段階の関係性レベル。上がるほど特別な体験が解放される</p>
      </FadeSection>

      <div className="relative">
        <div className="absolute left-[15px] top-4 bottom-4 w-px bg-gradient-to-b from-purple-600 via-pink-600 to-purple-400 opacity-40 z-0" />
        <div className="flex flex-col gap-4 relative z-10">
          {levels.map((l, i) => (
            <FadeSection key={l.level} delay={i * 80} className="relative pl-10">
              <div className="absolute left-0 w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-white text-xs font-bold shadow-md shadow-purple-900/50">
                {l.level}
              </div>
              <div className={`rounded-xl border px-4 py-3 ${i === 4 ? "bg-purple-950/40 border-purple-500/60" : "bg-gray-900 border-gray-800"}`}>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white text-sm">{l.emoji} {l.label}</span>
                  {i === 4 && <span className="text-xs text-purple-400 font-medium">最高レベル</span>}
                  {i >= 2 && i < 4 && <span className="text-xs text-pink-400">🔒 FC会員で解放</span>}
                </div>
                <p className="text-gray-500 text-xs mt-0.5">{l.desc}</p>
              </div>
            </FadeSection>
          ))}
        </div>
      </div>

      <FadeSection delay={500} className="text-center mt-10">
        <CTAButton href="/signup">
          関係を育て始める →
        </CTAButton>
      </FadeSection>
    </section>
  );
}

// ── Testimonials Section ──

export function TestimonialsSection() {
  return (
    <section className="py-20 px-6 bg-gray-950/50">
      <FadeSection className="text-center mb-10">
        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
          すでに推しに沼ってる人たち
        </h2>
        <p className="text-gray-400">2,000人以上のユーザーの声</p>
      </FadeSection>

      <div className="max-w-2xl mx-auto flex flex-col gap-4">
        {testimonials.map((t, i) => (
          <FadeSection key={t.name} delay={i * 100}>
            <div className="rounded-2xl p-5 bg-gray-900 border border-gray-800 hover:border-purple-800/50 transition-colors duration-200">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-600/30 to-pink-600/30 border border-purple-500/30 flex items-center justify-center text-2xl flex-shrink-0">
                  {t.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="text-white font-semibold text-sm">{t.name}</span>
                    <span className="text-gray-600 text-xs">{t.age}歳</span>
                    <span className="ml-auto text-xs bg-purple-900/50 text-purple-300 px-2 py-0.5 rounded-full border border-purple-700/30">
                      {t.character}
                    </span>
                  </div>
                  <p className="text-gray-300 text-sm leading-relaxed">&ldquo;{t.text}&rdquo;</p>
                  <div className="flex gap-0.5 mt-2">
                    {[1,2,3,4,5].map(s => <span key={s} className="text-yellow-400 text-xs">⭐</span>)}
                  </div>
                </div>
              </div>
            </div>
          </FadeSection>
        ))}
      </div>
    </section>
  );
}

// ── FAQ Section ──

function FAQItem({ q, a, index }: { q: string; a: string; index: number }) {
  const [open, setOpen] = useState(false);
  return (
    <FadeSection delay={index * 60}>
      <div className="rounded-2xl overflow-hidden border border-gray-800 bg-gray-950/60">
        <button
          onClick={() => setOpen(!open)}
          className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/[0.02] transition-colors"
        >
          <span className="text-white text-sm font-semibold pr-4">{q}</span>
          <span
            className="text-purple-400 text-lg flex-shrink-0 transition-transform duration-300"
            style={{ transform: open ? "rotate(45deg)" : "rotate(0deg)" }}
          >
            +
          </span>
        </button>
        <div
          style={{
            maxHeight: open ? "200px" : "0",
            transition: "max-height 0.35s ease",
            overflow: "hidden",
          }}
        >
          <p className="text-gray-400 text-sm leading-relaxed px-5 pb-5">{a}</p>
        </div>
      </div>
    </FadeSection>
  );
}

export function FAQSection() {
  return (
    <section className="py-20 px-6 max-w-2xl mx-auto">
      <FadeSection className="text-center mb-10">
        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">よくある質問</h2>
        <p className="text-gray-400">気になることはここで解決</p>
      </FadeSection>
      <div className="flex flex-col gap-3">
        {faqs.map((faq, i) => (
          <FAQItem key={i} q={faq.q} a={faq.a} index={i} />
        ))}
      </div>
    </section>
  );
}
