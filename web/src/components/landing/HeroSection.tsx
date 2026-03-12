'use client';

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { heroPhrases, heroCharacters, type Particle } from "./data";
import { CTAButton } from "./landing-utils";

// ── Sub-components ──

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
        onError={() => {}}
      />
      {isActive && (
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-2">
          <p className="text-white text-xs font-bold truncate">{char.name}</p>
          <p className="text-gray-400 text-[10px] truncate">{char.series}</p>
        </div>
      )}
      {isActive && (
        <div className="absolute top-2 right-2 w-3 h-3 bg-green-400 rounded-full ring-2 ring-black animate-pulse" />
      )}
    </motion.button>
  );
}

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

function LiveCounter() {
  const BASE = 1247;
  const [count, setCount] = useState(BASE);
  const [delta, setDelta] = useState<'+' | '-' | null>(null);

  useEffect(() => {
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

// ── Main Export ──

export function HeroSection() {
  const [activeCharIdx, setActiveCharIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setActiveCharIdx((i) => (i + 1) % heroCharacters.length);
    }, 4000);
    return () => clearInterval(t);
  }, []);

  const activeChar = heroCharacters[activeCharIdx];

  return (
    <>
      <ParticleField />

      {/* Header */}
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

      {/* Hero */}
      <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 pt-24 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-purple-950/70 via-black/80 to-black" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] bg-purple-700/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-2/3 left-1/4 w-[280px] h-[280px] bg-pink-700/8 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center gap-6 max-w-lg w-full">
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

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <CharacterQuote quote={activeChar.quote} />
          </motion.div>

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
            <div className="px-4 py-2 rounded-full bg-gray-950/70 border border-green-500/20 backdrop-blur-sm">
              <LiveCounter />
            </div>
          </motion.div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-gray-600 text-sm flex flex-col items-center gap-1 animate-bounce">
          <span>scroll</span>
          <span>↓</span>
        </div>
      </section>
    </>
  );
}
