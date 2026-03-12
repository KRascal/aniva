'use client';

import { stats, features } from "./data";
import { useScrollInView, FadeSection, CTAButton } from "./landing-utils";

// ── StatCard ──

function StatCard({ value, label, delay }: { value: string; label: string; delay: number }) {
  const { ref, inView } = useScrollInView(0.3);
  return (
    <div
      ref={ref}
      className="flex flex-col items-center"
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "translateY(0) scale(1)" : "translateY(20px) scale(0.95)",
        transition: `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms`,
      }}
    >
      <span className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text text-transparent">
        {value}
      </span>
      <span className="text-gray-500 text-xs mt-1">{label}</span>
    </div>
  );
}

// ── Exported Sections ──

export function StatsSection() {
  return (
    <section className="py-12 px-6 border-y border-gray-900 bg-gray-950/50">
      <div className="max-w-lg mx-auto grid grid-cols-2 sm:grid-cols-4 gap-6">
        {stats.map((s, i) => (
          <StatCard key={s.label} value={s.value} label={s.label} delay={i * 80} />
        ))}
      </div>
    </section>
  );
}

export function FeaturesSection() {
  return (
    <section className="py-20 px-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-950/8 to-transparent pointer-events-none" />
      <FadeSection className="text-center mb-12">
        <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-purple-900/50 text-purple-300 border border-purple-700/40 mb-4 tracking-widest uppercase">
          Features
        </span>
        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
          できることが、多すぎる
        </h2>
        <p className="text-gray-400 text-sm">
          チャットだけじゃない。ANIVAが提供する4つの体験
        </p>
      </FadeSection>

      <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-4">
        {features.map((f, i) => (
          <FadeSection key={f.title} delay={i * 80}>
            <div
              className={`bg-gradient-to-b ${f.gradient} rounded-2xl border ${f.border} p-6 flex gap-4 items-start hover:scale-[1.02] transition-transform duration-200`}
            >
              <div className="text-4xl flex-shrink-0">{f.icon}</div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-white font-bold text-lg">{f.title}</h3>
                  <span className={`text-xs font-black tracking-widest ${f.accent}`}>{f.label}</span>
                </div>
                <p className="text-gray-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            </div>
          </FadeSection>
        ))}
      </div>

      <FadeSection delay={400} className="text-center mt-10">
        <CTAButton href="/signup">
          全機能を体験する →
        </CTAButton>
      </FadeSection>
    </section>
  );
}
