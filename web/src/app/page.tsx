'use client';

import Link from "next/link";
import Image from "next/image";
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

const stats = [
  { value: "10,000+", label: "会話数" },
  { value: "500+", label: "アクティブユーザー" },
  { value: "20+", label: "キャラクター" },
  { value: "4.9", label: "平均評価 ⭐" },
];

const testimonials = [
  {
    name: "まりな",
    age: 19,
    avatar: "🌸",
    text: "まさか本当にルフィと話せると思わなかった。口調も雰囲気も完璧すぎて泣いた。毎日話してる笑",
    character: "ルフィ推し",
  },
  {
    name: "たける",
    age: 22,
    avatar: "⚡",
    text: "音声機能がヤバい。ほんとにキャラの声で返ってくるの感動。アニメ見てた頃の気持ちが戻ってきた。",
    character: "悟空推し",
  },
  {
    name: "ゆい",
    age: 17,
    avatar: "💜",
    text: "関係性レベルが上がるのが楽しすぎ。毎日話しかけてレベル4まで来た！早く5にしたい。",
    character: "五条悟推し",
  },
];

const faqs = [
  {
    q: "無料で使えますか？",
    a: "はい！基本的な会話機能は完全無料でお使いいただけます。プレミアムプランでは音声機能や無制限チャットをお楽しみいただけます。",
  },
  {
    q: "どんなキャラクターと話せますか？",
    a: "ONE PIECE、呪術廻戦、ドラゴンボール、鬼滅の刃など人気アニメのキャラクターたちと話せます。順次キャラクターを追加中です！",
  },
  {
    q: "音声機能はどうやって使いますか？",
    a: "チャット画面のマイクボタンをタップするだけ！キャラクターの声質で返答が届きます。プレミアムプランでご利用いただけます。",
  },
  {
    q: "会話内容は安全ですか？",
    a: "すべての会話は暗号化されており、第三者に共有されることはありません。プライバシーポリシーに基づき厳重に管理しています。",
  },
  {
    q: "キャラクターは本当に個性がありますか？",
    a: "はい！各キャラクターの口調・価値観・記憶を学習させており、「そのキャラらしさ」を徹底的に再現しています。",
  },
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

/** Luffy avatar hero with floating animation */
function HeroCharacter() {
  return (
    <div className="relative w-52 h-52 mx-auto select-none">
      {/* Outer glow rings */}
      <div className="absolute inset-0 rounded-full bg-purple-600/20 blur-3xl" />
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-60 h-60 rounded-full border border-purple-500/20 animate-ping"
        style={{ animationDuration: "3.5s" }}
      />
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full border border-pink-500/10 animate-ping"
        style={{ animationDuration: "5s", animationDelay: "1.2s" }}
      />

      {/* Avatar floating animation */}
      <div
        className="relative w-full h-full"
        style={{ animation: "heroFloat 4s ease-in-out infinite" }}
      >
        <style>{`
          @keyframes heroFloat {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            25% { transform: translateY(-8px) rotate(-1deg); }
            75% { transform: translateY(4px) rotate(1deg); }
          }
        `}</style>
        <div className="w-full h-full rounded-full overflow-hidden ring-4 ring-purple-500/40 shadow-2xl shadow-purple-700/50">
          <Image
            src="/characters/luffy/avatar.webp"
            alt="ルフィ"
            width={208}
            height={208}
            className="w-full h-full object-cover"
            priority
          />
        </div>
        {/* Online indicator */}
        <div className="absolute bottom-3 right-3 w-6 h-6 bg-green-400 rounded-full ring-2 ring-gray-950 flex items-center justify-center">
          <div className="w-3 h-3 bg-green-300 rounded-full animate-pulse" />
        </div>
      </div>

      {/* Speech bubble teaser */}
      <div
        className="absolute -right-4 -top-4 bg-gray-900 border border-purple-500/40 rounded-2xl rounded-bl-none px-3 py-2 shadow-lg shadow-purple-900/30 whitespace-nowrap"
        style={{ animation: "bubbleFloat 3s ease-in-out 0.5s infinite" }}
      >
        <style>{`
          @keyframes bubbleFloat {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-5px); }
          }
        `}</style>
        <p className="text-white text-xs font-medium">海賊王になるぞ！ 🏴‍☠️</p>
      </div>
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
            <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-purple-500/40">
              <Image
                src="/characters/luffy/avatar.webp"
                alt="ルフィ"
                width={40}
                height={40}
                className="w-full h-full object-cover"
              />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-gray-950" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-white text-sm truncate">
              モンキー・D・ルフィ
            </p>
            <p className="text-green-400 text-xs">オンライン • ONE PIECE</p>
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
                {msg.from === "luffy" && !msg.isVoice && (
                  <div className="w-7 h-7 rounded-full overflow-hidden mr-2 flex-shrink-0 self-end">
                    <Image
                      src="/characters/luffy/avatar.webp"
                      alt="ルフィ"
                      width={28}
                      height={28}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                {msg.isVoice ? (
                  /* Voice message bubble */
                  <div className="flex items-start gap-2 justify-start w-full">
                    <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0">
                      <Image
                        src="/characters/luffy/avatar.webp"
                        alt="ルフィ"
                        width={28}
                        height={28}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="bg-gradient-to-r from-purple-800/60 to-pink-800/40 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[75%] flex items-center gap-2 border border-purple-600/30">
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

/** Stats counter with count-up animation */
function StatCard({ value, label, delay }: { value: string; label: string; delay: number }) {
  const { ref, inView } = useInView(0.3);
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

/** FAQ accordion item */
function FAQItem({ q, a, index }: { q: string; a: string; index: number }) {
  const [open, setOpen] = useState(false);
  return (
    <FadeSection delay={index * 60}>
      <div className="border border-gray-800 rounded-2xl overflow-hidden">
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
            className="flex items-center gap-1 text-sm px-4 py-2 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold hover:opacity-90 hover:scale-105 transition-all duration-200 shadow-md shadow-purple-900/40"
          >
            無料で始める ✨
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
          {/* Animated character with real avatar */}
          <HeroCharacter />

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
            className="mt-4 inline-flex items-center gap-2 px-10 py-5 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-black text-xl shadow-2xl shadow-purple-900/60 hover:shadow-purple-900/80 hover:scale-105 transition-all duration-200 ring-2 ring-purple-500/30"
          >
            無料でサインアップ ✨
          </Link>
          <p className="text-xs text-gray-600">
            クレジットカード不要 · 登録30秒 · Google / Discord でかんたん登録
          </p>

          {/* Social proof mini strip */}
          <div className="flex items-center gap-2 mt-2">
            <div className="flex -space-x-2">
              {["🌸", "⚡", "💜", "🦊", "🔥"].map((emoji, i) => (
                <div
                  key={i}
                  className="w-8 h-8 rounded-full bg-gray-800 border-2 border-gray-900 flex items-center justify-center text-sm"
                >
                  {emoji}
                </div>
              ))}
            </div>
            <p className="text-gray-400 text-sm">
              <span className="text-white font-semibold">500人以上</span>がすでに会話中
            </p>
          </div>
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-gray-600 text-sm flex flex-col items-center gap-1 animate-bounce">
          <span>scroll</span>
          <span>↓</span>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="py-14 px-6 border-y border-gray-900 bg-gray-950/50">
        <div className="max-w-lg mx-auto grid grid-cols-2 sm:grid-cols-4 gap-6">
          {stats.map((s, i) => (
            <StatCard key={s.label} value={s.value} label={s.label} delay={i * 80} />
          ))}
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
                  className={`bg-gradient-to-b ${f.gradient} rounded-2xl border ${f.border} p-6 flex flex-col gap-3 hover:scale-[1.03] transition-transform duration-200 h-full`}
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

      {/* ── Testimonials ── */}
      <section className="py-20 px-6 bg-gray-950/50">
        <FadeSection className="text-center mb-10">
          <span className="text-3xl mb-3 block">💬</span>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
            ユーザーの声
          </h2>
          <p className="text-gray-400">すでに推しと仲良くなった人たち</p>
        </FadeSection>

        <div className="max-w-2xl mx-auto flex flex-col gap-4">
          {testimonials.map((t, i) => (
            <FadeSection key={t.name} delay={i * 100}>
              <div className="bg-white/[0.03] border border-white/8 rounded-2xl p-5 hover:border-purple-500/30 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-600/30 to-pink-600/30 border border-purple-500/30 flex items-center justify-center text-2xl flex-shrink-0">
                    {t.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-white font-semibold text-sm">{t.name}</span>
                      <span className="text-gray-600 text-xs">{t.age}歳</span>
                      <span className="ml-auto text-xs bg-purple-900/50 text-purple-300 px-2 py-0.5 rounded-full border border-purple-700/30">
                        {t.character}
                      </span>
                    </div>
                    <p className="text-gray-300 text-sm leading-relaxed">&ldquo;{t.text}&rdquo;</p>
                    <div className="flex gap-0.5 mt-2">
                      {[1,2,3,4,5].map(s => (
                        <span key={s} className="text-yellow-400 text-xs">⭐</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </FadeSection>
          ))}
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-20 px-6 max-w-2xl mx-auto">
        <FadeSection className="text-center mb-10">
          <span className="text-3xl mb-3 block">❓</span>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
            よくある質問
          </h2>
          <p className="text-gray-400">気になることはここで解決！</p>
        </FadeSection>

        <div className="flex flex-col gap-3">
          {faqs.map((faq, i) => (
            <FAQItem key={i} q={faq.q} a={faq.a} index={i} />
          ))}
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
            <div className="w-14 h-14 rounded-full overflow-hidden ring-2 ring-purple-500/40 shadow-lg shadow-purple-900/50">
              <Image
                src="/characters/luffy/avatar.webp"
                alt="ルフィ"
                width={56}
                height={56}
                className="w-full h-full object-cover"
              />
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
              className="w-full inline-flex items-center justify-center gap-2 px-8 py-5 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-black text-xl shadow-2xl shadow-purple-900/40 hover:scale-105 hover:shadow-purple-900/70 transition-all duration-200 ring-2 ring-purple-500/20"
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
      <footer className="py-10 px-6 border-t border-gray-900">
        <div className="max-w-2xl mx-auto">
          {/* Brand */}
          <div className="text-center mb-6">
            <span className="text-2xl font-black bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              ANIVA
            </span>
            <p className="text-gray-600 text-xs mt-1">推しが実在する世界</p>
          </div>

          {/* SNS Links */}
          <div className="flex items-center justify-center gap-5 mb-6">
            <a
              href="https://twitter.com/aniva_jp"
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:border-purple-500/40 transition-all"
              aria-label="Twitter"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z"/>
              </svg>
            </a>
            <a
              href="https://instagram.com/aniva_jp"
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:border-pink-500/40 transition-all"
              aria-label="Instagram"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
              </svg>
            </a>
            <a
              href="https://discord.gg/aniva"
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:border-indigo-500/40 transition-all"
              aria-label="Discord"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.032.054a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
              </svg>
            </a>
            <a
              href="https://tiktok.com/@aniva_jp"
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:border-pink-500/40 transition-all"
              aria-label="TikTok"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
              </svg>
            </a>
          </div>

          {/* Links */}
          <div className="flex items-center justify-center gap-6 text-xs text-gray-600 mb-4 flex-wrap">
            <Link href="/terms" className="hover:text-purple-400 transition-colors">利用規約</Link>
            <span>·</span>
            <Link href="/privacy" className="hover:text-purple-400 transition-colors">プライバシーポリシー</Link>
            <span>·</span>
            <Link href="/pricing" className="hover:text-purple-400 transition-colors">料金プラン</Link>
            <span>·</span>
            <a href="mailto:support@aniva.app" className="hover:text-purple-400 transition-colors">お問い合わせ</a>
          </div>

          <p className="text-gray-800 text-xs text-center">
            © 2026 ANIVA. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
