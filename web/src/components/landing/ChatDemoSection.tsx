'use client';

import Image from "next/image";
import { useEffect, useState } from "react";
import { GuestChatDemo } from "@/components/lp/GuestChatDemo";
import { chatMessages } from "./data";
import { useScrollInView, FadeSection, CTAButton } from "./landing-utils";

// ── ChatDemo (decorative inline demo) ──

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
        {/* Header */}
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

        {/* Messages */}
        <div className="px-4 py-5 flex flex-col gap-3 min-h-[260px]">
          {chatMessages.map((msg, i) => {
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
                    <div
                      className={`rounded-2xl px-4 py-2.5 max-w-[80%] text-sm leading-relaxed ${
                        msg.from === "user"
                          ? "bg-gradient-to-br from-purple-600 to-pink-600 text-white rounded-tr-sm"
                          : "bg-gray-800/90 text-gray-100 rounded-tl-sm border border-gray-700/50"
                      }`}
                    >
                      {msg.text}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* Input bar */}
        <div className="px-4 pb-4 flex items-center gap-2 border-t border-gray-800/50 pt-3">
          <div className="flex-1 bg-gray-800/80 rounded-full px-4 py-2.5 text-gray-500 text-sm border border-gray-700/40">
            メッセージを入力…
          </div>
          <button className="w-9 h-9 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center text-white text-sm shadow-md shadow-purple-900/50 flex-shrink-0">
            ↑
          </button>
          <button className="w-9 h-9 rounded-full bg-gray-800 border border-gray-700/50 flex items-center justify-center text-gray-400 text-sm flex-shrink-0">
            📞
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Exported Sections ──

export function GuestChatDemoSection() {
  return (
    <section className="py-16 px-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-950/10 to-transparent pointer-events-none" />
      <FadeSection className="text-center mb-8">
        <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-pink-900/50 text-pink-300 border border-pink-700/40 mb-4 tracking-widest uppercase">
          Try it now
        </span>
        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
          今すぐ、話してみて
        </h2>
        <p className="text-gray-400 text-sm">
          ログイン不要。推しがあなたを待ってる
        </p>
      </FadeSection>
      <FadeSection delay={200}>
        <GuestChatDemo />
      </FadeSection>
    </section>
  );
}

export function LiveDemoSection() {
  return (
    <section className="py-20 px-6 relative bg-gray-950/30">
      <div className="relative max-w-sm mx-auto">
        <FadeSection className="text-center mb-10">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-purple-900/50 text-purple-300 border border-purple-700/40 mb-4 tracking-widest uppercase">
            Live Demo
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
            実際の会話を見てみよう
          </h2>
          <p className="text-gray-400 text-sm">こんな会話が、今日から始められる</p>
        </FadeSection>

        <FadeSection delay={150}>
          <ChatDemo />
        </FadeSection>

        <FadeSection delay={350} className="text-center mt-8">
          <CTAButton href="/signup">
            話してみる →
          </CTAButton>
          <p className="text-xs text-gray-600 mt-3">無料で始めて、すぐに会話できます</p>
        </FadeSection>
      </div>
    </section>
  );
}
