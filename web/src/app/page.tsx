'use client';

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

// ── Types ──────────────────────────────────────────────────────────────────
interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
  opacity: number;
}

interface ChatMessage {
  id: number;
  from: "user" | "luffy";
  text: string;
  isVoice?: boolean;
}

// ── Static data ────────────────────────────────────────────────────────────
const features = [
  {
    icon: "💬",
    title: "AIが魂を宿す",
    desc: "ただのチャットボットじゃない。キャラクターの記憶、口調、価値観を完全再現。まるで本人と話しているよう。",
    gradient: "from-purple-600/20 to-purple-900/10",
    border: "border-purple-700/40",
  },
  {
    icon: "🔊",
    title: "本物の声で返事が来る",
    desc: "テキストだけじゃない。キャラクターの声で音声メッセージが届く。耳で感じる、推しの存在感。",
    gradient: "from-pink-600/20 to-pink-900/10",
    border: "border-pink-700/40",
  },
  {
    icon: "⭐",
    title: "会話するほど仲良くなる",
    desc: "話すたびに絆レベルが上がる。「出会い」から「特別」へ。あなただけの関係性が育つ。",
    gradient: "from-blue-600/20 to-blue-900/10",
    border: "border-blue-700/40",
  },
];

const chatMessages: ChatMessage[] = [
  { id: 1, from: "user", text: "ルフィ！海賊王になれると思う？" },
  {
    id: 2,
    from: "luffy",
    text: "当たり前だろ！おれは絶対なる！それがおれの夢だから！",
  },
  { id: 3, from: "user", text: "すごい自信だね。怖くないの？" },
  {
    id: 4,
    from: "luffy",
    text: "怖い？そんなこと考えたことねェな。仲間がいるから大丈夫だ！",
  },
  { id: 5, from: "luffy", text: "🎙️ 音声メッセージ", isVoice: true },
];

const levels = [
  { level: 1, label: "出会い", desc: "はじめまして", emoji: "👋" },
  { level: 2, label: "友達", desc: "気軽に話せる仲", emoji: "😊" },
  { level: 3, label: "親友", desc: "なんでも話せる", emoji: "🤝" },
  { level: 4, label: "大切な人", desc: "かけがえのない存在", emoji: "💜" },
  { level: 5, label: "特別", desc: "唯一無二の絆", emoji: "✨" },
];

// ── Hooks ──────────────────────────────────────────────────────────────────
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          obs.disconnect();
        }
      },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);

  return { ref, inView };
}

// ── Components ─────────────────────────────────────────────────────────────

/** Section that fades + slides in when it enters the viewport */
function FadeSection({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const { ref, inView } = useInView();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "translateY(0)" : "translateY(36px)",
        transition: `opacity 0.75s ease ${delay}ms, transform 0.75s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

/** Types out text one character at a time */
function TypewriterText({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (displayed.length < text.length) {
      const t = setTimeout(
        () => setDisplayed(text.slice(0, displayed.length + 1)),
        90
      );
      return () => clearTimeout(t);
    } else {
      setDone(true);
    }
  }, [displayed, text]);

  return (
    <span className={className}>
      {displayed}
      {!done && (
        <span className="inline-block w-0.5 h-[0.9em] bg-purple-400 ml-0.5 align-middle animate-pulse" />
      )}
    </span>
  );
}

/** Luffy straw-hat silhouette rendered as SVG with purple glow */
function CharacterSilhouette() {
  return (
    <div className="relative w-44 h-56 mx-auto select-none">
      {/* Outer ambient glow */}
      <div className="absolute inset-0 rounded-full bg-purple-600/15 blur-3xl" />
      {/* Ping rings */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-36 h-36 rounded-full border border-purple-500/25 animate-ping"
        style={{ animationDuration: "3.5s" }}
      />
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-52 h-52 rounded-full border border-pink-500/15 animate-ping"
        style={{ animationDuration: "5s", animationDelay: "1.2s" }}
      />

      <svg
        viewBox="0 0 200 270"
        className="relative w-full h-full"
        style={{
          filter:
            "drop-shadow(0 0 16px rgba(168,85,247,0.9)) drop-shadow(0 0 40px rgba(168,85,247,0.4))",
        }}
      >
        <defs>
          <linearGradient id="sg" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#d8b4fe" />
            <stop offset="60%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#ec4899" />
          </linearGradient>
          <filter id="sf">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Straw-hat brim */}
        <ellipse
          cx="100"
          cy="48"
          rx="68"
          ry="11"
          fill="url(#sg)"
          filter="url(#sf)"
          opacity="0.92"
        />
        {/* Hat dome */}
        <path
          d="M64 48 Q64 16 100 14 Q136 16 136 48 Z"
          fill="url(#sg)"
          filter="url(#sf)"
          opacity="0.92"
        />
        {/* Head */}
        <circle
          cx="100"
          cy="78"
          r="26"
          fill="url(#sg)"
          filter="url(#sf)"
          opacity="0.88"
        />
        {/* Body */}
        <path
          d="M80 102 L68 188 Q100 196 132 188 L120 102 Z"
          fill="url(#sg)"
          filter="url(#sf)"
          opacity="0.82"
        />
        {/* Left arm */}
        <path
          d="M78 114 Q50 148 38 178"
          stroke="url(#sg)"
          strokeWidth="13"
          fill="none"
          strokeLinecap="round"
          filter="url(#sf)"
          opacity="0.82"
        />
        {/* Right arm */}
        <path
          d="M122 114 Q150 148 162 178"
          stroke="url(#sg)"
          strokeWidth="13"
          fill="none"
          strokeLinecap="round"
          filter="url(#sf)"
          opacity="0.82"
        />
        {/* Left leg */}
        <path
          d="M84 186 Q78 222 74 256"
          stroke="url(#sg)"
          strokeWidth="17"
          fill="none"
          strokeLinecap="round"
          filter="url(#sf)"
          opacity="0.82"
        />
        {/* Right leg */}
        <path
          d="M116 186 Q122 222 126 256"
          stroke="url(#sg)"
          strokeWidth="17"
          fill="none"
          strokeLinecap="round"
          filter="url(#sf)"
          opacity="0.82"
        />
      </svg>
    </div>
  );
}

/** Demo chat UI — bubbles cascade in when section enters view */
function ChatDemo() {
  const { ref, inView } = useInView(0.2);
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
      {/* Phone frame */}
      <div className="bg-gray-950 rounded-3xl border border-gray-800/80 overflow-hidden shadow-2xl shadow-purple-900/30">
        {/* Chat header */}
        <div className="bg-gradient-to-r from-purple-900/80 to-pink-900/50 px-4 py-4 flex items-center gap-3 border-b border-gray-800/60">
          <div className="relative flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center font-extrabold text-white text-sm shadow-lg shadow-purple-900/60">
              L
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-gray-950" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-white text-sm truncate">
              モンキー・D・ルフィ
            </p>
            <p className="text-green-400 text-xs">オンライン</p>
          </div>
          <span className="text-gray-500 text-sm">🔊</span>
        </div>

        {/* Messages */}
        <div className="px-4 py-5 flex flex-col gap-3 min-h-[270px]">
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
                  /* Voice message bubble */
                  <div className="bg-gradient-to-r from-purple-800/60 to-pink-800/40 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[80%] flex items-center gap-2 border border-purple-600/30">
                    <span className="text-purple-300 text-sm">🔊</span>
                    <div className="flex gap-0.5 items-center h-5">
                      {[3, 5, 7, 4, 6, 3, 5, 4].map((h, j) => (
                        <div
                          key={j}
                          className="w-1 bg-purple-400 rounded-full animate-pulse"
                          style={{
                            height: `${h * 3}px`,
                            animationDelay: `${j * 100}ms`,
                          }}
                        />
                      ))}
                    </div>
                    <span className="text-gray-500 text-xs ml-1">0:03</span>
                  </div>
                ) : (
                  <div
                    className={`rounded-2xl px-4 py-2.5 max-w-[80%] text-sm leading-relaxed ${
                      msg.from === "user"
                        ? "bg-gradient-to-br from-purple-600 to-pink-600 text-white rounded-tr-sm"
                        : "bg-gray-800/90 text-gray-100 rounded-tl-sm border border-gray-700/50"
                    }`}
                  >
                    {msg.text}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Input bar */}
        <div className="px-4 pb-4 flex items-center gap-2 border-t border-gray-800/50 pt-3">
          <div className="flex-1 bg-gray-800/80 rounded-full px-4 py-2.5 text-gray-500 text-sm border border-gray-700/40 truncate">
            メッセージを入力…
          </div>
          <button className="w-9 h-9 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-purple-900/50 flex-shrink-0">
            ↑
          </button>
        </div>
      </div>
    </div>
  );
}

/** Floating particle field (client-only, avoids hydration mismatch) */
function ParticleField() {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    setParticles(
      Array.from({ length: 22 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 2.5 + 1,
        duration: Math.random() * 9 + 7,
        delay: Math.random() * 9,
        opacity: Math.random() * 0.35 + 0.08,
      }))
    );
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      <style>{`
        @keyframes particleFloat {
          0%   { transform: translateY(0px) translateX(0px); opacity: 0; }
          30%  { opacity: 1; }
          70%  { opacity: 1; }
          100% { transform: translateY(-70px) translateX(18px); opacity: 0; }
        }
      `}</style>
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            background: p.id % 3 === 0 ? "#f472b6" : "#a855f7",
            opacity: p.opacity,
            animation: `particleFloat ${p.duration}s ${p.delay}s infinite ease-in-out`,
          }}
        />
      ))}
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      <ParticleField />

      {/* ── Header ── */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-black/80 backdrop-blur border-b border-gray-800/50">
        <span className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
          ANIVA
        </span>
        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            ログイン
          </Link>
          <Link
            href="/signup"
            className="flex items-center gap-1 text-sm px-4 py-2 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium hover:opacity-90 transition-opacity"
          >
            無料で始める
          </Link>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 pt-20 pb-16 overflow-hidden">
        {/* Deep gradient bg */}
        <div className="absolute inset-0 bg-gradient-to-b from-purple-950/70 via-black/80 to-black" />
        {/* Large ambient glows */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] bg-purple-700/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-2/3 left-1/4 w-[280px] h-[280px] bg-pink-700/8 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center gap-6 max-w-lg">
          {/* Animated character silhouette */}
          <CharacterSilhouette />

          <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight tracking-tight">
            <span className="bg-gradient-to-r from-purple-300 via-pink-300 to-purple-300 bg-clip-text text-transparent">
              <TypewriterText text="推しが実在する世界" />
            </span>
          </h1>

          <div className="w-16 h-px bg-gradient-to-r from-purple-500 to-pink-500" />

          <p className="text-xl sm:text-2xl text-gray-300 font-medium">
            ルフィと、毎日話そう。
          </p>
          <p className="text-gray-400 text-base leading-relaxed">
            あなたの推しキャラクターと、本当に会話できる。
            <br />
            声で、テキストで、毎日。
          </p>

          <Link
            href="/signup"
            className="mt-4 inline-flex items-center gap-2 px-8 py-4 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-lg shadow-lg shadow-purple-900/50 hover:shadow-purple-900/70 hover:scale-105 transition-all duration-200"
          >
            無料でサインアップ ✨
          </Link>
          <p className="text-xs text-gray-600">
            クレジットカード不要 · 登録30秒
          </p>
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-gray-600 text-sm flex flex-col items-center gap-1 animate-bounce">
          <span>scroll</span>
          <span>↓</span>
        </div>
      </section>

      {/* ── Chat Demo ── */}
      <section className="py-20 px-6 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-950/10 to-transparent pointer-events-none" />
        <div className="relative max-w-sm mx-auto">
          {/* Section heading */}
          <FadeSection className="text-center mb-10">
            <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-purple-900/50 text-purple-300 border border-purple-700/40 mb-4 tracking-wide uppercase">
              Live Demo
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
              実際の会話体験
            </h2>
            <p className="text-gray-400 text-sm">
              こんな会話が、今日から始められる
            </p>
          </FadeSection>

          <FadeSection delay={150}>
            <ChatDemo />
          </FadeSection>

          <FadeSection delay={350} className="text-center mt-8">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-purple-700/80 to-pink-700/80 text-white font-semibold text-sm border border-purple-500/30 hover:opacity-90 transition-opacity shadow-md shadow-purple-900/30"
            >
              ルフィと話してみる →
            </Link>
          </FadeSection>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-20 relative overflow-hidden">
        <FadeSection className="text-center mb-10 px-6">
          <span className="text-3xl mb-3 block">📱</span>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
            どんな体験？
          </h2>
          <p className="text-gray-400">
            ANIVAが作り出す、これまでにない推し体験
          </p>
        </FadeSection>

        {/* Horizontal scroll on mobile / 3-col grid on desktop */}
        <div className="sm:max-w-4xl sm:mx-auto sm:px-6">
          <div
            className="flex gap-4 overflow-x-auto px-6 pb-4 snap-x snap-mandatory sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 sm:pb-0"
            style={{ scrollbarWidth: "none" }}
          >
            {features.map((f, i) => (
              <FadeSection
                key={f.title}
                delay={i * 100}
                className="flex-shrink-0 w-[72vw] max-w-xs sm:w-auto sm:max-w-none snap-center"
              >
                <div
                  className={`bg-gradient-to-b ${f.gradient} rounded-2xl border ${f.border} p-6 flex flex-col gap-3 hover:scale-[1.03] transition-transform duration-200`}
                >
                  <span className="text-4xl">{f.icon}</span>
                  <h3 className="text-lg font-bold text-white">{f.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">
                    {f.desc}
                  </p>
                </div>
              </FadeSection>
            ))}
          </div>
          {/* Mobile dot indicators */}
          <div className="flex justify-center gap-2 mt-4 sm:hidden">
            {features.map((_, i) => (
              <div
                key={i}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  i === 0 ? "bg-purple-400" : "bg-gray-700"
                }`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── Relationship Levels ── */}
      <section className="py-20 px-6 max-w-2xl mx-auto">
        <FadeSection className="text-center mb-10">
          <span className="text-3xl mb-3 block">⭐</span>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
            関係性レベル
          </h2>
          <p className="text-gray-400">会話を重ねるごとに絆が深まる</p>
        </FadeSection>

        <div className="relative">
          {/* Vertical timeline line */}
          <div className="absolute left-[15px] top-4 bottom-4 w-px bg-gradient-to-b from-purple-600 via-pink-600 to-purple-400 opacity-40 z-0" />
          <div className="flex flex-col gap-4 relative z-10">
            {levels.map((l, i) => (
              <FadeSection
                key={l.level}
                delay={i * 80}
                className="relative pl-10"
              >
                {/* Level dot */}
                <div className="absolute left-0 w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-white text-xs font-bold shadow-md shadow-purple-900/50">
                  {l.level}
                </div>
                <div
                  className={`rounded-xl border px-4 py-3 ${
                    i === 4
                      ? "bg-purple-950/40 border-purple-500/60"
                      : "bg-gray-900 border-gray-800"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white text-sm">
                      {l.emoji} {l.label}
                    </span>
                    {i === 4 && (
                      <span className="text-xs text-purple-400 font-medium">
                        最高レベル ✨
                      </span>
                    )}
                  </div>
                  <p className="text-gray-500 text-xs mt-0.5">{l.desc}</p>
                </div>
              </FadeSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer CTA ── */}
      <section className="py-20 px-6 relative">
        {/* Gradient hr */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-700/30 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-purple-950/25 to-transparent pointer-events-none" />

        <FadeSection className="relative max-w-sm mx-auto">
          {/* Card glow */}
          <div className="absolute -inset-4 bg-gradient-to-r from-purple-600/15 to-pink-600/15 rounded-3xl blur-2xl" />
          <div className="relative bg-gray-950 rounded-3xl border border-gray-800/80 p-8 flex flex-col items-center gap-5 shadow-2xl shadow-purple-900/20">
            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center text-2xl shadow-lg shadow-purple-900/50">
              ✨
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white text-center">
              無料で始められる
            </h2>
            <p className="text-gray-400 text-sm leading-relaxed text-center">
              今すぐアカウント登録して、
              <br />
              推しとの会話を始めよう。
            </p>
            <Link
              href="/signup"
              className="w-full inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-lg shadow-lg shadow-purple-900/40 hover:scale-105 hover:shadow-purple-900/70 transition-all duration-200"
            >
              無料でサインアップ →
            </Link>
            <p className="text-xs text-gray-600">
              Google / Discord でかんたん登録
            </p>
          </div>
        </FadeSection>
      </section>

      {/* ── Footer ── */}
      <footer className="py-6 px-6 border-t border-gray-900 text-center">
        <p className="text-gray-700 text-xs">
          © 2026 ANIVA. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
