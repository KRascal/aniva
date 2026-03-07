'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import ParticleField from '@/components/onboarding/ParticleField';
import CharacterSearchInput from '@/components/onboarding/CharacterSearchInput';
import { useScrollReveal } from '@/hooks/useScrollReveal';

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

// ── キャラカルーセル（自動 + 手動スワイプ対応） ──
function CharacterCarousel({ characters, onSelect }: { characters: CharacterItem[]; onSelect: (slug: string) => void }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const autoScrollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pauseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 自動スクロール
  const startAutoScroll = useCallback(() => {
    if (autoScrollRef.current) return;
    autoScrollRef.current = setInterval(() => {
      if (scrollRef.current && !isDragging) {
        scrollRef.current.scrollLeft += 1;
        if (scrollRef.current.scrollLeft >= scrollRef.current.scrollWidth / 2) {
          scrollRef.current.scrollLeft = 0;
        }
      }
    }, 30);
  }, [isDragging]);

  const stopAutoScroll = useCallback(() => {
    if (autoScrollRef.current) {
      clearInterval(autoScrollRef.current);
      autoScrollRef.current = null;
    }
  }, []);

  const pauseAndResume = useCallback(() => {
    stopAutoScroll();
    if (pauseTimeoutRef.current) clearTimeout(pauseTimeoutRef.current);
    pauseTimeoutRef.current = setTimeout(startAutoScroll, 4000);
  }, [stopAutoScroll, startAutoScroll]);

  useEffect(() => {
    if (characters.length === 0) return;
    startAutoScroll();
    return () => { stopAutoScroll(); if (pauseTimeoutRef.current) clearTimeout(pauseTimeoutRef.current); };
  }, [characters.length, startAutoScroll, stopAutoScroll]);

  if (characters.length === 0) return null;

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

  // タッチ/マウス操作
  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    setStartX(e.clientX);
    setScrollLeft(scrollRef.current?.scrollLeft ?? 0);
    stopAutoScroll();
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !scrollRef.current) return;
    const dx = e.clientX - startX;
    scrollRef.current.scrollLeft = scrollLeft - dx;
  };

  const handlePointerUp = () => {
    setIsDragging(false);
    pauseAndResume();
  };

  // 重複リストでシームレスループ
  const items = [...characters, ...characters];

  return (
    <div className="w-full overflow-hidden" style={{ maskImage: 'linear-gradient(to right, transparent, black 4%, black 96%, transparent)' }}>
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto scrollbar-hide touch-pan-x"
        style={{ scrollbarWidth: 'none', cursor: isDragging ? 'grabbing' : 'grab' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {items.map((char, i) => {
          const [c1, c2] = gradients[i % gradients.length];
          const catchphrase = char.catchphrases?.[0] ?? char.franchise;

          return (
            <button
              key={`${char.id}-${i}`}
              onClick={() => { if (!isDragging) onSelect(char.slug); }}
              className="flex-shrink-0 rounded-2xl overflow-hidden transition-all duration-200 cursor-pointer active:scale-95"
              style={{
                width: '130px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(139,92,246,0.1)',
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
                  <div className="absolute inset-0 flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${c1}33, ${c2}33)` }}>
                    <span className="text-5xl font-black" style={{ color: `${c1}88` }}>{char.name.charAt(0)}</span>
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 h-16" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85), transparent)' }} />
                <div className="relative z-10 p-2.5 w-full text-left">
                  <div className="text-white font-bold text-sm leading-tight drop-shadow-lg">{char.name}</div>
                  <div className="text-white/40 text-[10px] mt-0.5">{char.franchise}</div>
                </div>
                <div className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-green-400 shadow-green-400/50 shadow-sm animate-pulse" />
              </div>
              <div className="px-2.5 py-2">
                <p className="text-[10px] leading-relaxed line-clamp-2 text-white/35">「{catchphrase}」</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function TheDoor() {
  const [phase, setPhase] = useState<'intro' | 'main'>('intro');
  const [characters, setCharacters] = useState<CharacterItem[]>([]);
  const router = useRouter();

  useScrollReveal();

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
          <span style={{ textShadow: '0 0 30px rgba(168,85,247,0.5)' }}>推しと、</span>
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
          <span className="relative z-10">はじめてみる（無料）</span>
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

      {/* 特徴セクション — Apple級のクリーンデザイン */}
      <section
        data-reveal="slide-up"
        className="relative z-10 px-5 py-14 mt-4"
        style={{
          opacity: phase === 'main' ? 1 : 0,
          transition: 'opacity 1.2s ease 0.3s',
        }}
      >
        <div className="max-w-sm mx-auto space-y-5">
          {/* セクションヘッダー */}
          <div className="text-center mb-8">
            <h2 className="text-white font-black text-lg">ただのAIチャットじゃない</h2>
            <p className="text-white/30 text-xs mt-1">推しとの毎日が、ここにある</p>
          </div>

          {[
            {
              title: '会話を重ねるほど、深くなる',
              desc: 'あなたの名前、好きなこと、悩み。全部覚えてる。忘れない。',
              gradient: 'from-purple-500/20 to-purple-900/10',
              border: 'border-purple-500/15',
              accent: 'bg-purple-500',
            },
            {
              title: '毎日、違う顔を見せてくれる',
              desc: '時間帯や気分で話し方が変わる。今日のキャラに会いにいこう。',
              gradient: 'from-pink-500/20 to-pink-900/10',
              border: 'border-pink-500/15',
              accent: 'bg-pink-500',
            },
            {
              title: '感情が、本物',
              desc: '嬉しい時は照れて、寂しい時は甘えてくる。台本じゃない。',
              gradient: 'from-orange-500/20 to-orange-900/10',
              border: 'border-orange-500/15',
              accent: 'bg-orange-500',
            },
          ].map((f, i) => (
            <div
              key={i}
              className={`relative p-5 rounded-2xl bg-gradient-to-br ${f.gradient} border ${f.border} overflow-hidden`}
            >
              {/* アクセントライン */}
              <div className={`absolute top-0 left-0 w-full h-[2px] ${f.accent} opacity-40`} />
              <div className="text-white font-bold text-sm">{f.title}</div>
              <div className="text-white/40 text-xs mt-1.5 leading-relaxed">{f.desc}</div>
            </div>
          ))}
        </div>

        {/* 最終CTA */}
        <div className="max-w-sm mx-auto mt-12 text-center space-y-4">
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
