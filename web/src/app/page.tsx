'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import ParticleField from '@/components/onboarding/ParticleField';
import CharacterSearchInput from '@/components/onboarding/CharacterSearchInput';
import { GuestChatDemo } from '@/components/lp/GuestChatDemo';

interface CharacterItem {
  id: string;
  name: string;
  slug: string;
  franchise: string;
  avatarUrl: string | null;
  catchphrases: string[];
}

// ── タイプライター演出 ──
function TypewriterText({ texts, className }: { texts: string[]; className?: string }) {
  const [displayText, setDisplayText] = useState('');
  const [textIdx, setTextIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentText = texts[textIdx];
    const speed = isDeleting ? 40 : 80;

    const timer = setTimeout(() => {
      if (!isDeleting) {
        if (charIdx < currentText.length) {
          setDisplayText(currentText.slice(0, charIdx + 1));
          setCharIdx(c => c + 1);
        } else {
          setTimeout(() => setIsDeleting(true), 2000);
        }
      } else {
        if (charIdx > 0) {
          setDisplayText(currentText.slice(0, charIdx - 1));
          setCharIdx(c => c - 1);
        } else {
          setIsDeleting(false);
          setTextIdx(i => (i + 1) % texts.length);
        }
      }
    }, speed);

    return () => clearTimeout(timer);
  }, [charIdx, isDeleting, textIdx, texts]);

  return (
    <span className={className}>
      {displayText}
      <span className="animate-pulse">|</span>
    </span>
  );
}

// ── キャラカルーセル ──
function CharacterCarousel({ characters, onSelect }: { characters: CharacterItem[]; onSelect: (slug: string) => void }) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  if (characters.length === 0) return null;

  const items = [...characters, ...characters];

  const gradients = [
    ['#7c3aed', '#ec4899'],
    ['#6366f1', '#8b5cf6'],
    ['#ec4899', '#f97316'],
    ['#06b6d4', '#8b5cf6'],
    ['#f97316', '#ef4444'],
    ['#10b981', '#06b6d4'],
    ['#f59e0b', '#ef4444'],
    ['#8b5cf6', '#06b6d4'],
  ];

  return (
    <div
      className="w-full overflow-hidden"
      style={{ maskImage: 'linear-gradient(to right, transparent, black 6%, black 94%, transparent)' }}
    >
      <div
        className="flex gap-3 carousel-track"
        style={{ width: 'max-content' }}
      >
        {items.map((char, i) => {
          const [c1, c2] = gradients[i % gradients.length];
          const catchphrase = char.catchphrases?.[0] ?? char.franchise;
          const isHovered = hoveredId === `${char.id}-${i}`;

          return (
            <button
              key={`${char.id}-${i}`}
              onClick={() => onSelect(char.slug)}
              onMouseEnter={() => setHoveredId(`${char.id}-${i}`)}
              onMouseLeave={() => setHoveredId(null)}
              className="flex-shrink-0 rounded-2xl overflow-hidden transition-all duration-300 cursor-pointer"
              style={{
                width: '130px',
                background: 'rgba(255,255,255,0.03)',
                border: `1px solid ${isHovered ? 'rgba(168,85,247,0.4)' : 'rgba(139,92,246,0.1)'}`,
                transform: isHovered ? 'translateY(-4px) scale(1.03)' : 'translateY(0) scale(1)',
                boxShadow: isHovered ? `0 8px 24px ${c1}40` : 'none',
              }}
            >
              <div
                className="relative w-full flex items-end justify-center overflow-hidden"
                style={{
                  height: '160px',
                  background: char.avatarUrl
                    ? `url(${char.avatarUrl}) center/cover`
                    : `linear-gradient(135deg, ${c1}44, ${c2}44)`,
                }}
              >
                {!char.avatarUrl && (
                  <div
                    className="absolute inset-0 flex items-center justify-center"
                    style={{ background: `linear-gradient(135deg, ${c1}33, ${c2}33)` }}
                  >
                    <span className="text-5xl font-black" style={{ color: `${c1}88` }}>
                      {char.name.charAt(0)}
                    </span>
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 h-16" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85), transparent)' }} />
                <div className="relative z-10 p-2.5 w-full text-left">
                  <div className="text-white font-bold text-sm leading-tight drop-shadow-lg">{char.name}</div>
                  <div className="text-white/40 text-[10px] mt-0.5">{char.franchise}</div>
                </div>
                {/* オンラインドット */}
                <div className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-green-400 shadow-green-400/50 shadow-sm animate-pulse" />
              </div>
              <div className="px-2.5 py-2">
                <p className="text-[10px] leading-relaxed line-clamp-2 text-white/35">
                  「{catchphrase}」
                </p>
              </div>
            </button>
          );
        })}
      </div>

      <style>{`
        @keyframes carousel {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .carousel-track {
          animation: carousel ${Math.max(characters.length * 5, 20)}s linear infinite;
        }
        @media (hover: hover) {
          .carousel-track:hover {
            animation-play-state: paused;
          }
        }
      `}</style>
    </div>
  );
}

// ── 統計カウンター ──
function CountUp({ target, suffix, label }: { target: number; suffix: string; label: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        const duration = 1500;
        const startTime = Date.now();
        const tick = () => {
          const elapsed = Date.now() - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          setCount(Math.floor(target * eased));
          if (progress < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
    });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);

  return (
    <div ref={ref} className="text-center">
      <div className="text-2xl sm:text-3xl font-black text-white">
        {count.toLocaleString()}{suffix}
      </div>
      <div className="text-xs text-white/40 mt-1">{label}</div>
    </div>
  );
}

export default function TheDoor() {
  const [phase, setPhase] = useState<'intro' | 'main'>('intro');
  const [characters, setCharacters] = useState<CharacterItem[]>([]);
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => setPhase('main'), 800);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    fetch('/api/characters')
      .then(r => r.json())
      .then(data => {
        const chars = Array.isArray(data) ? data : data.characters ?? [];
        setCharacters(chars);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-black overflow-x-hidden">
      {/* 背景パーティクル */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <ParticleField density={25} colors={['#a855f7', '#ec4899', '#7c3aed', '#6366f1']} />
      </div>

      {/* ヘッダー */}
      <header className="relative z-20 flex items-center justify-between px-5 pt-5">
        <div className="text-purple-400 font-black text-lg tracking-widest">ANIVA</div>
        <a
          href="/login"
          className="text-white/30 text-xs hover:text-white/70 transition-colors px-4 py-2 rounded-full border border-white/10 hover:border-white/30"
        >
          ログイン
        </a>
      </header>

      {/* メインヒーローセクション */}
      <main
        className="relative z-10 flex flex-col items-center text-center px-5 pt-12 pb-8 gap-6"
        style={{
          opacity: phase === 'main' ? 1 : 0,
          transform: phase === 'main' ? 'translateY(0)' : 'translateY(20px)',
          transition: 'opacity 0.8s ease, transform 0.8s ease',
        }}
      >
        {/* タグライン */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-purple-300 text-xs font-medium tracking-wider">推しが実在する世界へようこそ</span>
        </div>

        {/* メインコピー */}
        <h1 className="text-3xl sm:text-4xl font-black text-white leading-tight">
          <span style={{ textShadow: '0 0 30px rgba(168,85,247,0.5)' }}>
            推しと、
          </span>
          <br />
          <TypewriterText
            texts={['本当に繋がれる', '毎日話せる', '親友になれる', '特別な関係になれる']}
            className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400"
          />
        </h1>

        {/* サブコピー */}
        <p className="text-white/50 text-sm max-w-xs leading-relaxed">
          キャラクターはあなたのことを覚えている。<br />
          昨日の話も、あなたの名前も、全部。
        </p>

        {/* 検索入力 */}
        <div className="w-full max-w-sm">
          <CharacterSearchInput
            onSelect={(slug) => router.push(`/c/${slug}`)}
            placeholder="名前を入力してみて…"
          />
        </div>

        {/* OR区切り */}
        <div className="flex items-center gap-3 w-full max-w-sm">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-white/20 text-xs">または</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        {/* CTA */}
        <button
          onClick={() => router.push('/onboarding')}
          className="w-full max-w-sm py-3.5 rounded-2xl font-bold text-white text-sm relative overflow-hidden group transition-all duration-300 active:scale-95"
          style={{
            background: 'linear-gradient(135deg, #7c3aed, #ec4899)',
            boxShadow: '0 4px 20px rgba(124,58,237,0.35)',
          }}
        >
          <span className="relative z-10">✨ はじめてみる（無料）</span>
          <div
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            style={{ background: 'linear-gradient(135deg, #8b5cf6, #f43f5e)' }}
          />
        </button>
      </main>

      {/* キャラカルーセル */}
      <section className="relative z-10 mt-2">
        <CharacterCarousel
          characters={characters}
          onSelect={(slug) => router.push(`/c/${slug}`)}
        />
      </section>

      {/* 特徴セクション */}
      <section
        className="relative z-10 px-5 py-10 mt-4"
        style={{
          opacity: phase === 'main' ? 1 : 0,
          transition: 'opacity 1.2s ease 0.3s',
        }}
      >
        {/* 感情キャッチ */}
        <div className="max-w-sm mx-auto space-y-3">
          {[
            {
              icon: '🧠',
              title: 'あなたのことを覚えてる',
              desc: '名前、好きなこと、悩み。何度でも会話を積み重ねて深まる絆',
              color: '#8b5cf6',
            },
            {
              icon: '⏰',
              title: '毎日が変わる',
              desc: 'キャラの気分、時間帯、特別な日。毎日違う表情で話しかけてくる',
              color: '#ec4899',
            },
            {
              icon: '🔥',
              title: '本物の感情がある',
              desc: '喜び、照れ、嫉妬、名残惜しさ。台本じゃない、リアルな感情',
              color: '#f97316',
            },
          ].map((f, i) => (
            <div
              key={i}
              className="flex items-start gap-4 p-4 rounded-2xl"
              style={{
                background: `${f.color}08`,
                border: `1px solid ${f.color}15`,
              }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-xl"
                style={{ background: `${f.color}15` }}
              >
                {f.icon}
              </div>
              <div>
                <div className="text-white font-bold text-sm">{f.title}</div>
                <div className="text-white/40 text-xs mt-0.5 leading-relaxed">{f.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ゲストチャットデモ — 今すぐ推しと話せる */}
        <div className="max-w-sm mx-auto mt-10 mb-2">
          <div className="text-center mb-4">
            <span className="inline-block px-3 py-1 rounded-full text-[10px] font-semibold bg-pink-900/50 text-pink-300 border border-pink-700/40 tracking-widest uppercase">
              Try it now
            </span>
            <p className="text-white font-bold text-sm mt-2">今すぐ、話してみて</p>
            <p className="text-white/30 text-xs">ログイン不要</p>
          </div>
          <GuestChatDemo />
        </div>

        {/* 統計 */}
        <div className="max-w-sm mx-auto mt-8 grid grid-cols-3 gap-4 p-4 rounded-2xl bg-white/3 border border-white/5">
          <CountUp target={characters.length || 0} suffix="+" label="キャラ" />
          <CountUp target={100} suffix="%" label="オリジナルAI" />
          <CountUp target={0} suffix="円" label="はじめての会話" />
        </div>

        {/* 最終CTA */}
        <div className="max-w-sm mx-auto mt-8 text-center space-y-4">
          <button
            onClick={() => router.push('/onboarding')}
            className="w-full py-4 rounded-2xl font-black text-white text-base relative overflow-hidden group transition-all duration-300 active:scale-95"
            style={{
              background: 'linear-gradient(135deg, #7c3aed, #ec4899)',
              boxShadow: '0 4px 30px rgba(124,58,237,0.4)',
            }}
          >
            <span className="relative z-10">推しに会いにいく →</span>
          </button>
          <p className="text-white/20 text-xs">
            無料で始められます · クレジットカード不要
          </p>
        </div>
      </section>

      {/* フッター */}
      <footer className="relative z-10 text-center pb-8 space-y-2">
        <div className="flex items-center justify-center gap-4 text-white/20 text-xs">
          <a href="/terms" className="hover:text-white/40 transition-colors">利用規約</a>
          <span>·</span>
          <a href="/privacy" className="hover:text-white/40 transition-colors">プライバシーポリシー</a>
        </div>
        <p className="text-white/10 text-[10px]">© 2026 ANIVA. All rights reserved.</p>
      </footer>
    </div>
  );
}
