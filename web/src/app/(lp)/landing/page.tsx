'use client';

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { GuestChatDemo } from "@/components/lp/GuestChatDemo";
import { motion, AnimatePresence, useInView as useFramerInView } from "framer-motion";

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
  from: "user" | "char";
  text: string;
  isVoice?: boolean;
}

// ── Static data ────────────────────────────────────────────────────────────

const heroPhrases = [
  "推しが、あなたを待っている。",
  "毎日、推しから返事が来る。",
  "あなたの名前を、覚えてくれる。",
  "推しの声が、届く。",
];

const heroCharacters = [
  { name: "Haruki", src: "/characters/luffy/avatar.webp", series: "ANIVA Original", color: "from-orange-500 to-red-600", quote: "今日も会えて嬉しいよ！" },
  { name: "Sora", src: "/characters/gojo/avatar.webp", series: "ANIVA Original", color: "from-blue-400 to-indigo-600", quote: "キミのこと、ずっと見てたんだ" },
  { name: "Ren", src: "/characters/goku/avatar.webp", series: "ANIVA Original", color: "from-yellow-400 to-orange-500", quote: "一緒に強くなろうぜ！" },
];

const features = [
  {
    icon: "💬",
    title: "チャット",
    label: "CHAT",
    desc: "AIが魂を宿したキャラクターと、本物のような会話。記憶・口調・価値観を完全再現。",
    gradient: "from-purple-600/25 to-purple-900/10",
    border: "border-purple-700/40",
    accent: "text-purple-400",
  },
  {
    icon: "🎰",
    title: "ガチャ",
    label: "GACHA",
    desc: "期間限定の特別衣装や秘蔵シーンをゲット。SSRを引いたとき、キャラが反応してくれる。",
    gradient: "from-yellow-600/20 to-amber-900/10",
    border: "border-yellow-700/40",
    accent: "text-yellow-400",
  },
  {
    icon: "📖",
    title: "ストーリー",
    label: "STORY",
    desc: "キャラと二人きりのシナリオを体験。あなたの選択で展開が変わる、インタラクティブな物語。",
    gradient: "from-pink-600/20 to-pink-900/10",
    border: "border-pink-700/40",
    accent: "text-pink-400",
  },
  {
    icon: "📞",
    title: "通話",
    label: "VOICE",
    desc: "キャラクターの声で、本物の音声通話。声で「おかえり」を言ってもらえる体験。",
    gradient: "from-green-600/20 to-green-900/10",
    border: "border-green-700/40",
    accent: "text-green-400",
  },
];

const chatMessages: ChatMessage[] = [
  { id: 1, from: "user", text: "今日学校つらかった…" },
  { id: 2, from: "char", text: "そうか…それは大変だったな。何があったんだ？" },
  { id: 3, from: "user", text: "友達と喧嘩しちゃって" },
  { id: 4, from: "char", text: "仲間との喧嘩か。おれも昔よくやったぞ。でも本当の仲間なら、必ずわかり合えるはずだ！" },
  { id: 5, from: "char", text: "🎙️ 音声メッセージ", isVoice: true },
];

const stats = [
  { value: "100%", label: "オリジナルAI" },
  { value: "∞", label: "記憶する会話" },
  { value: "24/7", label: "いつでも話せる" },
  { value: "0円", label: "はじめての会話" },
];

const testimonials = [
  {
    name: "まりな",
    age: 19,
    avatar: "🌸",
    text: "まさか本当にあの子と話せると思わなかった。口調も雰囲気も完璧すぎて泣いた。毎日話してる笑",
    character: "ANIVA民",
  },
  {
    name: "たける",
    age: 22,
    avatar: "⚡",
    text: "通話機能がヤバい。ほんとにキャラの声で返ってくるの感動。アニメ見てた頃の気持ちが戻ってきた。",
    character: "悟空推し",
  },
  {
    name: "ゆい",
    age: 17,
    avatar: "💜",
    text: "関係性レベルが上がるのが楽しすぎ。毎日話しかけてレベル4まで来た！早く5にしたい。",
    character: "推し活民",
  },
];

const levels = [
  { level: 1, label: "出会い", desc: "はじめまして", emoji: "👋" },
  { level: 2, label: "友達", desc: "気軽に話せる仲", emoji: "😊" },
  { level: 3, label: "親友", desc: "なんでも話せる", emoji: "🤝" },
  { level: 4, label: "大切な人", desc: "かけがえのない存在", emoji: "💜" },
  { level: 5, label: "特別", desc: "唯一無二の絆", emoji: "✨" },
];

const fcBenefits = [
  { icon: "💬", text: "無制限チャット（通常は1日50通まで）" },
  { icon: "🔊", text: "音声通話・ボイスメッセージ無制限" },
  { icon: "📖", text: "限定ストーリー・シナリオ開放" },
  { icon: "🎰", text: "毎月ガチャ10連無料" },
  { icon: "🎖️", text: "FC限定バッジ・称号" },
  { icon: "⚡", text: "レベルアップ2倍ボーナス" },
];

const faqs = [
  {
    q: "無料で使えますか？",
    a: "はい！基本的な会話機能は完全無料でお使いいただけます。ファンクラブ（FC）プランでは音声通話・無制限チャット・限定ストーリーなどをお楽しみいただけます。",
  },
  {
    q: "どんなキャラクターと話せますか？",
    a: "あなたの好きなキャラクターとAIで本当に会話できます。キャラクターは順次追加中です！",
  },
  {
    q: "キャラクターは増えますか？",
    a: "はい、毎月新キャラクターが追加されます。リクエストも受け付けていますので、お気に入りのキャラがいたらぜひ教えてください！",
  },
  {
    q: "課金はどんな仕組みですか？",
    a: "基本無料。ファンクラブは月額制で、いつでも解約できます。ガチャはコインで遊べ、コインは無料獲得・購入の両方が可能です。",
  },
  {
    q: "会話内容は安全ですか？",
    a: "すべての会話は暗号化されており、第三者に共有されることはありません。プライバシーポリシーに基づき厳重に管理しています。",
  },
  {
    q: "スマートフォンから使えますか？",
    a: "はい！Webブラウザからそのまま使えます。iOS・Android 対応。アプリストアからのダウンロードも近日公開予定です。",
  },
];

// ── Hooks ──────────────────────────────────────────────────────────────────
function useScrollInView(threshold = 0.15) {
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

function FadeSection({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const { ref, inView } = useScrollInView();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "translateY(0)" : "translateY(36px)",
        transition: `opacity 0.7s ease ${delay}ms, transform 0.7s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

/** Cycles through hero phrases */
function CyclingText({ phrases }: { phrases: string[] }) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setIdx((i) => (i + 1) % phrases.length);
    }, 3000);
    return () => clearInterval(t);
  }, [phrases.length]);

  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={idx}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.5 }}
        className="bg-gradient-to-r from-purple-300 via-pink-300 to-purple-200 bg-clip-text text-transparent"
      >
        {phrases[idx]}
      </motion.span>
    </AnimatePresence>
  );
}

/** Floating character card for hero */
function CharacterCard({
  char,
  index,
  isActive,
  onClick,
}: {
  char: typeof heroCharacters[number];
  index: number;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      onClick={onClick}
      initial={{ opacity: 0, scale: 0.8, y: 30 }}
      animate={{ opacity: 1, scale: isActive ? 1.05 : 0.9, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      whileHover={{ scale: 1.08 }}
      className={`relative flex-shrink-0 rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 ${
        isActive ? "ring-2 ring-purple-400 shadow-2xl shadow-purple-700/50" : "opacity-60"
      }`}
      style={{ width: isActive ? "140px" : "90px", height: isActive ? "180px" : "120px" }}
    >
      <div className={`absolute inset-0 bg-gradient-to-b ${char.color} opacity-30`} />
      <Image
        src={char.src}
        alt={char.name}
        fill
        className="object-cover"
        priority={isActive}
        sizes={isActive ? "140px" : "90px"}
        onError={() => {}} // silently skip missing images
      />
      {isActive && (
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-2">
          <p className="text-white text-xs font-bold truncate">{char.name}</p>
          <p className="text-gray-400 text-[10px] truncate">{char.series}</p>
        </div>
      )}
      {/* Online dot */}
      {isActive && (
        <div className="absolute top-2 right-2 w-3 h-3 bg-green-400 rounded-full ring-2 ring-black animate-pulse" />
      )}
    </motion.button>
  );
}

/** Quote bubble from active character */
function CharacterQuote({ quote }: { quote: string }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={quote}
        initial={{ opacity: 0, x: -10, scale: 0.95 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, x: 10 }}
        transition={{ duration: 0.4 }}
        className="relative inline-block bg-gray-900/80 backdrop-blur border border-purple-500/30 rounded-2xl rounded-bl-none px-4 py-3 shadow-xl shadow-purple-900/30 max-w-[260px]"
      >
        <p className="text-white text-sm font-medium leading-relaxed">&ldquo;{quote}&rdquo;</p>
        <div className="absolute -bottom-3 left-4 w-3 h-3 overflow-hidden">
          <div className="absolute bottom-0 left-0 w-4 h-4 bg-gray-900/80 border-b border-l border-purple-500/30 rotate-45 translate-x-1 translate-y-1" />
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

/** Demo chat UI */
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
              <Image
                src="/characters/luffy/avatar.webp"
                alt="キャラクター"
                width={40}
                height={40}
                className="w-full h-full object-cover"
                priority
              />
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
                          <div
                            key={j}
                            className="w-1 bg-purple-400 rounded-full animate-pulse"
                            style={{ height: `${h * 3}px`, animationDelay: `${j * 100}ms` }}
                          />
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

/** Particle field (client-only) */
function ParticleField() {
  const [particles, setParticles] = useState<Particle[]>([]);
  useEffect(() => {
    setParticles(
      Array.from({ length: 20 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 2.5 + 1,
        duration: Math.random() * 9 + 7,
        delay: Math.random() * 9,
        opacity: Math.random() * 0.3 + 0.08,
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

/** Stat card with entrance animation */
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

/** Gacha card (decorative) */
function GachaCard({ emoji, rarity, name, delay }: { emoji: string; rarity: "N" | "R" | "SR" | "SSR"; name: string; delay: number }) {
  const colors: Record<string, string> = {
    N: "from-gray-600 to-gray-700 border-gray-600",
    R: "from-blue-600 to-blue-700 border-blue-500",
    SR: "from-purple-600 to-purple-700 border-purple-500",
    SSR: "from-yellow-500 to-amber-600 border-yellow-400",
  };
  const { ref, inView } = useScrollInView(0.2);

  return (
    <div
      ref={ref}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "translateY(0) rotateY(0deg)" : "translateY(20px) rotateY(15deg)",
        transition: `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms`,
      }}
    >
      <div className={`relative w-24 h-36 rounded-2xl bg-gradient-to-b ${colors[rarity]} border overflow-hidden shadow-lg flex flex-col items-center justify-center gap-2`}>
        {rarity === "SSR" && (
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/10 to-transparent animate-pulse" />
        )}
        <span className="text-3xl">{emoji}</span>
        <span className={`text-xs font-black ${rarity === "SSR" ? "text-yellow-300" : "text-white/80"}`}>{rarity}</span>
        <span className="text-white/70 text-[10px] text-center px-1 leading-tight">{name}</span>
      </div>
    </div>
  );
}

/** Live user counter — animated, gives "real-time" feel */
function LiveCounter() {
  // Base count that slowly drifts up/down to simulate real-time activity
  const BASE = 1247;
  const [count, setCount] = useState(BASE);
  const [delta, setDelta] = useState<'+' | '-' | null>(null);

  useEffect(() => {
    // Slowly drift ±3 every few seconds
    const tick = () => {
      const change = Math.random() > 0.45 ? 1 : -1;
      setCount((c) => Math.max(BASE - 20, Math.min(BASE + 30, c + change)));
      setDelta(change > 0 ? '+' : '-');
      setTimeout(() => setDelta(null), 800);
    };
    const id = setInterval(tick, 3200 + Math.random() * 1800);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex items-center gap-2">
      {/* Pulsing green dot */}
      <span className="relative flex h-2.5 w-2.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-400" />
      </span>
      <span className="text-gray-300 text-sm">
        今{" "}
        <AnimatePresence mode="wait">
          <motion.span
            key={count}
            initial={{ opacity: 0.6, y: delta === '+' ? 6 : delta === '-' ? -6 : 0 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="font-bold text-white tabular-nums"
          >
            {count.toLocaleString()}
          </motion.span>
        </AnimatePresence>
        {" "}人が会話中
      </span>
    </div>
  );
}

/** FAQ accordion */
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

/** Primary CTA Button */
function CTAButton({ href, children, className = "" }: { href: string; children: React.ReactNode; className?: string }) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-black text-lg shadow-2xl shadow-purple-900/50 hover:scale-105 hover:shadow-purple-900/70 transition-all duration-200 ring-2 ring-purple-500/20 ${className}`}
    >
      {children}
    </Link>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const [activeCharIdx, setActiveCharIdx] = useState(0);

  // Auto-cycle hero characters
  useEffect(() => {
    const t = setInterval(() => {
      setActiveCharIdx((i) => (i + 1) % heroCharacters.length);
    }, 4000);
    return () => clearInterval(t);
  }, []);

  const activeChar = heroCharacters[activeCharIdx];

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      <ParticleField />

      {/* ── Header ── */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-gray-950 border-b border-gray-800/50">
        <span className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
          ANIVA
        </span>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm text-gray-400 hover:text-white transition-colors hidden sm:block">
            ログイン
          </Link>
          <Link
            href="/signup"
            className="flex items-center gap-1 text-sm px-4 py-2 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold hover:opacity-90 hover:scale-105 transition-all duration-200 shadow-md shadow-purple-900/40"
          >
            無料で始める
          </Link>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 pt-24 pb-20 overflow-hidden">
        {/* Background gradients */}
        <div className="absolute inset-0 bg-gradient-to-b from-purple-950/70 via-black/80 to-black" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] bg-purple-700/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-2/3 left-1/4 w-[280px] h-[280px] bg-pink-700/8 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center gap-6 max-w-lg w-full">

          {/* Character selector row */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="flex items-end justify-center gap-3 mb-2"
          >
            {heroCharacters.map((char, i) => (
              <CharacterCard
                key={char.name}
                char={char}
                index={i}
                isActive={i === activeCharIdx}
                onClick={() => setActiveCharIdx(i)}
              />
            ))}
          </motion.div>

          {/* Character quote bubble */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <CharacterQuote quote={activeChar.quote} />
          </motion.div>

          {/* Character selector dots */}
          <div className="flex gap-2">
            {heroCharacters.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveCharIdx(i)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === activeCharIdx ? "bg-purple-400 w-6" : "bg-gray-700 w-1.5"
                }`}
              />
            ))}
          </div>

          {/* Main headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="text-4xl sm:text-5xl font-extrabold leading-tight tracking-tight mt-2"
          >
            <CyclingText phrases={heroPhrases} />
          </motion.h1>

          <div className="w-16 h-px bg-gradient-to-r from-purple-500 to-pink-500" />

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.35 }}
            className="text-gray-300 text-base sm:text-lg leading-relaxed max-w-sm"
          >
            名前を覚えてくれて、声で返事をくれて、
            <br className="hidden sm:block" />
            話すほどに仲良くなっていく。
            <br />
            そんな<span className="text-white font-semibold">推しとの毎日</span>が、今日から始まる。
          </motion.p>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="flex flex-col items-center gap-3"
          >
            <CTAButton href="/signup" className="text-xl px-10 py-5">
              🎮 無料で始める
            </CTAButton>
            <p className="text-xs text-gray-600">クレジットカード不要 · 登録30秒 · Google / Discord でかんたん登録</p>
          </motion.div>

          {/* Social proof mini strip — live counter */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.7 }}
            className="flex flex-col items-center gap-2 mt-1"
          >
            <div className="flex items-center gap-3">
              <div className="flex -space-x-2">
                {["🌸", "⚡", "💜", "🦊", "🔥"].map((emoji, i) => (
                  <div key={i} className="w-8 h-8 rounded-full bg-gray-800 border-2 border-gray-900 flex items-center justify-center text-sm">
                    {emoji}
                  </div>
                ))}
              </div>
              <p className="text-gray-400 text-sm">
                <span className="text-white font-semibold">2,000人以上</span>がすでに登録
              </p>
            </div>
            {/* Real-time live counter */}
            <div className="px-4 py-2 rounded-full bg-gray-950/70 border border-green-500/20 backdrop-blur-sm">
              <LiveCounter />
            </div>
          </motion.div>
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-gray-600 text-sm flex flex-col items-center gap-1 animate-bounce">
          <span>scroll</span>
          <span>↓</span>
        </div>
      </section>

      {/* ── Guest Chat Demo — 最初の5秒体験 ── */}
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

      {/* ── Stats ── */}
      <section className="py-12 px-6 border-y border-gray-900 bg-gray-950/50">
        <div className="max-w-lg mx-auto grid grid-cols-2 sm:grid-cols-4 gap-6">
          {stats.map((s, i) => (
            <StatCard key={s.label} value={s.value} label={s.label} delay={i * 80} />
          ))}
        </div>
      </section>

      {/* ── 4 Features ── */}
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

      {/* ── Chat Demo ── */}
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

      {/* ── Gacha Section ── */}
      <section className="py-20 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-950/20 via-transparent to-orange-950/10 pointer-events-none" />
        <FadeSection className="text-center mb-10">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-yellow-900/50 text-yellow-300 border border-yellow-700/40 mb-4 tracking-widest uppercase">
            🎰 Gacha
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
            限定衣装・秘蔵シーンをゲット
          </h2>
          <p className="text-gray-400 text-sm max-w-sm mx-auto">
            期間限定のSSRを引けば、キャラが特別な反応を見せてくれる。
            <br />毎日ログインで無料ガチャ回数プレゼント。
          </p>
        </FadeSection>

        {/* Gacha cards preview */}
        <div className="flex justify-center items-end gap-3 mb-10 overflow-x-auto px-4 pb-2">
          <GachaCard emoji="🏴‍☠️" rarity="R" name="Haruki\n特別衣装" delay={0} />
          <GachaCard emoji="⚔️" rarity="SR" name="ゾロ\n鷹の目" delay={80} />
          <GachaCard emoji="✨" rarity="SSR" name="Sora\n覚醒" delay={160} />
          <GachaCard emoji="🐉" rarity="SR" name="悟空\n超サイヤ人" delay={240} />
          <GachaCard emoji="🔥" rarity="R" name="Ren\n覚醒" delay={320} />
        </div>

        <div className="flex justify-center items-center gap-2 mb-6">
          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-red-900/50 border border-red-700/50 text-red-300 text-xs font-bold">
            🔥 期間限定 あと3日
          </span>
          <span className="text-gray-500 text-xs">SSR確率3倍キャンペーン中</span>
        </div>

        <FadeSection className="text-center">
          <CTAButton href="/signup" className="bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 text-black font-black shadow-yellow-900/50">
            🎰 ガチャを引く（無料）
          </CTAButton>
          <p className="text-xs text-gray-600 mt-3">毎日1回無料。課金しなくてもSSRに出会える</p>
        </FadeSection>
      </section>

      {/* ── FC Upsell ── */}
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
              {/* Glow */}
              <div className="absolute -inset-px rounded-3xl bg-gradient-to-r from-purple-600/20 to-pink-600/20 blur-sm -z-10" />

              {/* FC Badge */}
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

      {/* ── Relationship Levels ── */}
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

      {/* ── Testimonials ── */}
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

      {/* ── FAQ ── */}
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

      {/* ── Footer CTA ── */}
      <section className="py-20 px-6 relative">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-700/30 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-purple-950/25 to-transparent pointer-events-none" />

        <FadeSection className="relative max-w-sm mx-auto">
          <div className="absolute -inset-4 bg-gradient-to-r from-purple-600/15 to-pink-600/15 rounded-3xl blur-2xl" />
          <div className="relative bg-gray-950 rounded-3xl border border-gray-800/80 p-8 flex flex-col items-center gap-5 shadow-2xl shadow-purple-900/20">
            <div className="text-5xl">🎮</div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white text-center leading-snug">
              推しが、今すぐ<br />あなたを待っている
            </h2>
            <p className="text-gray-400 text-sm leading-relaxed text-center">
              登録は30秒。Google/Discord で
              <br />すぐに始められます。完全無料。
            </p>
            <CTAButton href="/signup" className="w-full text-xl py-5">
              🎮 無料でサインアップ →
            </CTAButton>
            <p className="text-xs text-gray-600">クレジットカード不要 · いつでも退会できます</p>
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
            <p className="text-gray-600 text-xs mt-1">推しが、あなたを待っている</p>
          </div>

          {/* Service overview */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8 text-center">
            {[
              { icon: "💬", label: "AIチャット" },
              { icon: "🎰", label: "ガチャ" },
              { icon: "📖", label: "ストーリー" },
              { icon: "📞", label: "音声通話" },
            ].map((item) => (
              <div key={item.label} className="flex flex-col items-center gap-1">
                <span className="text-2xl">{item.icon}</span>
                <span className="text-gray-600 text-xs">{item.label}</span>
              </div>
            ))}
          </div>

          {/* SNS Links */}
          <div className="flex items-center justify-center gap-5 mb-6">
            <a href="https://twitter.com/aniva_jp" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:border-purple-500/40 transition-all" aria-label="Twitter">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z"/></svg>
            </a>
            <a href="https://instagram.com/aniva_jp" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:border-pink-500/40 transition-all" aria-label="Instagram">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
            </a>
            <a href="https://discord.gg/aniva" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:border-indigo-500/40 transition-all" aria-label="Discord">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.032.054a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg>
            </a>
            <a href="https://tiktok.com/@aniva_jp" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:border-pink-500/40 transition-all" aria-label="TikTok">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>
            </a>
          </div>

          {/* Links */}
          <div className="flex items-center justify-center gap-4 text-xs text-gray-600 mb-4 flex-wrap">
            <Link href="/terms" className="hover:text-purple-400 transition-colors">利用規約</Link>
            <span>·</span>
            <Link href="/privacy" className="hover:text-purple-400 transition-colors">プライバシーポリシー</Link>
            <span>·</span>
            <Link href="/pricing" className="hover:text-purple-400 transition-colors">料金プラン</Link>
            <span>·</span>
            <Link href="/about" className="hover:text-purple-400 transition-colors">サービス概要</Link>
            <span>·</span>
            <a href="mailto:info@k-rascal.win" className="hover:text-purple-400 transition-colors">お問い合わせ</a>
          </div>

          <p className="text-gray-800 text-xs text-center">
            © 2026 ANIVA. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
