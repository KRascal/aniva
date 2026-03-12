'use client';

import Image from "next/image";
import { useEffect, useState } from "react";
import { GuestChatDemo } from "@/components/lp/GuestChatDemo";
import { features, stats, chatMessages, type ChatMessage } from "./data";
import { FadeSection, CTAButton, useScrollInView } from "./shared";

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

function ChatDemo() {
  const { ref, inView } = useScrollInView(0.2);
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let count = 0;
    const tick = () => {
      count += 1;
      setVisibleCount(count);
      if (count < chatMessages.length) setTimeout(tick, 750);
    };
    setTimeout(tick, 300);
  }, [inView]);

  return (
    <div ref={ref} className="max-w-sm mx-auto">
      <div className="bg-gray-950 rounded-3xl border border-gray-800/80 overflow-hidden shadow-2xl shadow-purple-900/30">
        <div className="bg-gradient-to-r from-purple-900/80 to-pink-900/50 px-4 py-4 flex items-center gap-3 border-b border-gray-800/60">
          <div className="relative flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white font-bold text-sm overflow-hidden ring-2 ring-purple-500/40">
              <Image src="/characters/luffy/avatar.webp" alt="キャラクター" width={40} height={40} className="w-full h-full object-cover" priority />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-gray-950" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-white text-sm truncate">Haruki</p>
            <p className="text-green-400 text-xs">オンライン • ANIVA</p>
          </div>
          <span className="text-gray-400 text-sm">📞</span>
        </div>

        <div className="px-4 py-5 flex flex-col gap-3 min-h-[260px]">
          {chatMessages.map((msg: ChatMessage, i: number) => {
            const visible = i < visibleCount;
            return (
              <div
                key={msg.id}
                className={`flex ${msg.from === "user" ? "justify-end" : "justify-start"}`}
                style={{
                  opacity: visible ? 1 : 0,
                  transform: visible ? "translateY(0)" : "translateY(14px)",
                  transition: "opacity 0.45s ease, transform 0.45s ease",
                }}
              >
                {msg.isVoice ? (
                  <div className="flex items-start gap-2 w-full">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex-shrink-0 overflow-hidden">
                      <Image src="/characters/luffy/avatar.webp" alt="キャラクター" width={28} height={28} className="w-full h-full object-cover" />
                    </div>
                    <div className="bg-gradient-to-r from-purple-800/60 to-pink-800/40 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2 border border-purple-600/30">
                      <span className="text-purple-300 text-sm">🔊</span>
                      <div className="flex gap-0.5 items-center h-5">
                        {[3, 5, 7, 4, 6, 3, 5, 4].map((h, j) => (
                          <div key={j} className="w-1 bg-purple-400 rounded-full animate-pulse" style={{ height: `${h * 3}px`, animationDelay: `${j * 100}ms` }} />
                        ))}
                      </div>
                      <span className="text-gray-500 text-xs ml-1">0:04</span>
                    </div>
                  </div>
                ) : (
                  <>
                    {msg.from === "char" && (
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-500 to-red-600 mr-2 flex-shrink-0 self-end overflow-hidden">
                        <Image src="/characters/luffy/avatar.webp" alt="キャラクター" width={28} height={28} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className={`rounded-2xl px-4 py-2.5 max-w-[80%] text-sm leading-relaxed ${
                      msg.from === "user"
                        ? "bg-gradient-to-br from-purple-600 to-pink-600 text-white rounded-tr-sm"
                        : "bg-gray-800/90 text-gray-100 rounded-tl-sm border border-gray-700/50"
                    }`}>
                      {msg.text}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        <div className="px-4 pb-4 flex items-center gap-2 border-t border-gray-800/50 pt-3">
          <div className="flex-1 bg-gray-800/80 rounded-full px-4 py-2.5 text-gray-500 text-sm border border-gray-700/40">
            メッセージを入力…
          </div>
          <button className="w-9 h-9 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center text-white text-sm shadow-md shadow-purple-900/50 flex-shrink-0">↑</button>
          <button className="w-9 h-9 rounded-full bg-gray-800 border border-gray-700/50 flex items-center justify-center text-gray-400 text-sm flex-shrink-0">📞</button>
        </div>
      </div>
    </div>
  );
}

export function GuestChatDemoSection() {
  return (
    <section className="py-16 px-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-950/10 to-transparent pointer-events-none" />
      <FadeSection className="text-center mb-8">
        <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-pink-900/50 text-pink-300 border border-pink-700/40 mb-4 tracking-widest uppercase">Try it now</span>
        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">今すぐ、話してみて</h2>
        <p className="text-gray-400 text-sm">ログイン不要。推しがあなたを待ってる</p>
      </FadeSection>
      <FadeSection delay={200}><GuestChatDemo /></FadeSection>
    </section>
  );
}

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
        <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-purple-900/50 text-purple-300 border border-purple-700/40 mb-4 tracking-widest uppercase">Features</span>
        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">できることが、多すぎる</h2>
        <p className="text-gray-400 text-sm">チャットだけじゃない。ANIVAが提供する4つの体験</p>
      </FadeSection>
      <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-4">
        {features.map((f, i) => (
          <FadeSection key={f.title} delay={i * 80}>
            <div className={`bg-gradient-to-b ${f.gradient} rounded-2xl border ${f.border} p-6 flex gap-4 items-start hover:scale-[1.02] transition-transform duration-200`}>
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
        <CTAButton href="/signup">全機能を体験する →</CTAButton>
      </FadeSection>
    </section>
  );
}

export function ChatDemoSection() {
  return (
    <section className="py-20 px-6 relative bg-gray-950/30">
      <div className="relative max-w-sm mx-auto">
        <FadeSection className="text-center mb-10">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-purple-900/50 text-purple-300 border border-purple-700/40 mb-4 tracking-widest uppercase">Live Demo</span>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">実際の会話を見てみよう</h2>
          <p className="text-gray-400 text-sm">こんな会話が、今日から始められる</p>
        </FadeSection>
        <FadeSection delay={150}><ChatDemo /></FadeSection>
        <FadeSection delay={350} className="text-center mt-8">
          <CTAButton href="/signup">話してみる →</CTAButton>
          <p className="text-xs text-gray-600 mt-3">無料で始めて、すぐに会話できます</p>
        </FadeSection>
      </div>
    </section>
  );
}
