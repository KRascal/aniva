'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface Character {
  id: string;
  name: string;
  nameEn: string;
  slug: string;
  franchise: string;
  franchiseEn: string;
  description: string;
  avatarUrl: string | null;
  coverUrl: string | null;
  catchphrases: string[];
}

interface RelationshipInfo {
  characterId: string;
  level: number;
  levelName: string;
  xp: number;
  totalMessages: number;
  lastMessageAt: string | null;
  character?: { name: string; slug: string };
}

/* ── gradient palette per index ── */
const CARD_GRADIENTS = [
  'from-purple-600/80 via-pink-600/60 to-rose-600/80',
  'from-blue-600/80 via-cyan-500/60 to-teal-600/80',
  'from-orange-500/80 via-amber-500/60 to-yellow-500/80',
  'from-green-600/80 via-emerald-500/60 to-cyan-600/80',
  'from-indigo-600/80 via-violet-500/60 to-purple-600/80',
  'from-rose-600/80 via-red-500/60 to-orange-600/80',
];

const GLOW_COLORS = [
  'hover:shadow-purple-500/40',
  'hover:shadow-blue-500/40',
  'hover:shadow-amber-500/40',
  'hover:shadow-emerald-500/40',
  'hover:shadow-violet-500/40',
  'hover:shadow-rose-500/40',
];

/* ── ripple hook ── */
function useRipple() {
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);

  const trigger = useCallback((e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = Date.now();
    setRipples((prev) => [...prev, { id, x, y }]);
    setTimeout(() => setRipples((prev) => prev.filter((r) => r.id !== id)), 600);
  }, []);

  return { ripples, trigger };
}

/* ── intersection observer fade-in ── */
function useFadeIn() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return { ref, visible };
}

/* ── relationship badge ── */
function RelationshipBadge({ rel }: { rel?: RelationshipInfo }) {
  if (!rel) return null;
  const stars = '⭐'.repeat(Math.min(rel.level, 5));

  const formatLastChat = (dateStr: string | null) => {
    if (!dateStr) return null;
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 60) return `${mins}分前`;
    if (hours < 24) return `${hours}時間前`;
    if (days < 30) return `${days}日前`;
    return new Date(dateStr).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
  };

  const lastChat = rel.lastMessageAt ? formatLastChat(rel.lastMessageAt) : null;

  return (
    <div className="flex items-center gap-2 mt-1">
      <span className="text-[10px] leading-none">{stars}</span>
      <span className="text-[10px] text-white/50">Lv.{rel.level} {rel.levelName}</span>
      {lastChat && (
        <>
          <span className="text-[10px] text-white/30">·</span>
          <span className="text-[10px] text-white/40">{lastChat}</span>
        </>
      )}
    </div>
  );
}

/* ── character card ── */
function CharacterCard({
  character,
  index,
  onClick,
  relationship,
}: {
  character: Character;
  index: number;
  onClick: () => void;
  relationship?: RelationshipInfo;
}) {
  const { ripples, trigger } = useRipple();
  const { ref, visible } = useFadeIn();
  const gradient = CARD_GRADIENTS[index % CARD_GRADIENTS.length];
  const glow = GLOW_COLORS[index % GLOW_COLORS.length];
  const catchphrase = character.catchphrases?.[0] ?? null;

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    trigger(e);
    setTimeout(onClick, 200);
  };

  return (
    <div
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(24px)',
        transition: `opacity 0.5s ease ${index * 0.08}s, transform 0.5s ease ${index * 0.08}s`,
      }}
    >
      <button
        onClick={handleClick}
        className={`
          relative w-full text-left overflow-hidden rounded-3xl
          border border-white/10
          shadow-lg ${glow}
          hover:shadow-2xl hover:scale-[1.02] hover:-translate-y-0.5
          active:scale-[0.98]
          transition-all duration-300 group
        `}
      >
        {/* Blurred avatar background */}
        {character.avatarUrl && (
          <div className="absolute inset-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={character.avatarUrl}
              alt=""
              className="w-full h-full object-cover scale-110"
              style={{ filter: 'blur(18px) brightness(0.35) saturate(1.6)' }}
            />
          </div>
        )}

        {/* Gradient overlay */}
        <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-70`} />

        {/* Shimmer on hover */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500
          bg-gradient-to-r from-transparent via-white/8 to-transparent
          -translate-x-full group-hover:translate-x-full
          transition-transform duration-700 ease-in-out pointer-events-none" />

        {/* Ripples */}
        {ripples.map((r) => (
          <span
            key={r.id}
            className="absolute rounded-full bg-white/25 pointer-events-none animate-ping"
            style={{
              width: 120,
              height: 120,
              left: r.x - 60,
              top: r.y - 60,
              animationDuration: '0.6s',
              animationIterationCount: 1,
            }}
          />
        ))}

        {/* Content */}
        <div className="relative z-10 flex items-center gap-4 p-5">
          {/* Avatar ring */}
          <div className="flex-shrink-0 relative">
            <div className="w-20 h-20 rounded-2xl overflow-hidden ring-2 ring-white/30 shadow-lg">
              {character.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={character.avatarUrl}
                  alt={character.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full bg-white/20 flex items-center justify-center text-4xl">
                  🌟
                </div>
              )}
            </div>
            {/* Online indicator */}
            <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full ring-2 ring-gray-900 animate-pulse" />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className="font-bold text-white text-xl leading-tight drop-shadow">{character.name}</h3>
            </div>
            <p className="text-white/60 text-xs mb-2 font-medium tracking-wide uppercase">
              {character.franchise}
            </p>

            {/* Catchphrase bubble */}
            {catchphrase && (
              <div className="relative inline-block">
                <div className="bg-white/15 backdrop-blur-sm border border-white/20 rounded-2xl rounded-tl-sm px-3 py-1.5 max-w-[200px]">
                  <p className="text-white/90 text-xs leading-relaxed line-clamp-2">
                    &ldquo;{catchphrase}&rdquo;
                  </p>
                </div>
              </div>
            )}

            {/* 関係性バッジ */}
            <RelationshipBadge rel={relationship} />
          </div>

          {/* Arrow */}
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center
            group-hover:bg-white/25 transition-colors duration-200">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </button>
    </div>
  );
}

/* ── daily missions / hints ── */
const DAILY_MISSIONS = [
  { id: 'greet', emoji: '👋', text: 'キャラに挨拶する', xp: 5 },
  { id: 'msg5', emoji: '💬', text: '5回メッセージを送る', xp: 20 },
  { id: 'question', emoji: '❓', text: '質問を1つする', xp: 10 },
];

const DAILY_HINTS = [
  '「好きなものは何？」と聞いてみよう 🤔',
  '感情豊かに話すと親密度が上がりやすい ✨',
  '毎日話しかけると絆レベルが早く上がるぞ 🔥',
  '「音声を再生」でキャラの声が聞けるよ 🔊',
  'プロフィールで絆の進捗を確認できる ⭐',
];

function DailyMissionsSection({ totalMessages }: { totalMessages: number }) {
  const [expanded, setExpanded] = useState(false);
  const [hintIndex] = useState(() => Math.floor(Math.random() * DAILY_HINTS.length));

  // Simple progress estimates based on total messages
  const completedIds = new Set<string>();
  if (totalMessages >= 1) completedIds.add('greet');
  if (totalMessages >= 5) completedIds.add('msg5');

  return (
    <div className="mb-6">
      {/* ヒントバナー */}
      <div className="flex items-start gap-3 bg-gradient-to-r from-purple-900/40 to-pink-900/30 rounded-2xl border border-purple-500/20 px-4 py-3 mb-3">
        <span className="text-xl flex-shrink-0 mt-0.5">💡</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-purple-300 font-semibold mb-0.5">今日のヒント</p>
          <p className="text-sm text-gray-300">{DAILY_HINTS[hintIndex]}</p>
        </div>
      </div>

      {/* デイリーミッション */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between bg-gray-900/60 rounded-2xl border border-white/5 px-4 py-3 text-left hover:border-purple-500/20 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">🎯</span>
          <span className="text-sm font-semibold text-white">デイリーミッション</span>
          <span className="text-xs bg-purple-500/20 text-purple-300 rounded-full px-2 py-0.5">
            {completedIds.size}/{DAILY_MISSIONS.length}
          </span>
        </div>
        <svg
          className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="mt-2 space-y-2">
          {DAILY_MISSIONS.map((mission) => {
            const done = completedIds.has(mission.id);
            return (
              <div
                key={mission.id}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors ${
                  done
                    ? 'bg-purple-900/20 border-purple-500/25 opacity-70'
                    : 'bg-gray-900/40 border-white/5'
                }`}
              >
                <span className="text-xl flex-shrink-0">{mission.emoji}</span>
                <span className={`flex-1 text-sm ${done ? 'line-through text-gray-500' : 'text-gray-200'}`}>
                  {mission.text}
                </span>
                <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${
                  done ? 'bg-green-900/50 text-green-400' : 'bg-yellow-900/40 text-yellow-400'
                }`}>
                  {done ? '完了 ✓' : `+${mission.xp}XP`}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── welcome banner (first visit) ── */
function WelcomeBanner({ onClose }: { onClose: () => void }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem('aniva_welcomed');
    if (!seen) setShow(true);
  }, []);

  if (!show) return null;

  const handleClose = () => {
    localStorage.setItem('aniva_welcomed', '1');
    setShow(false);
    onClose();
  };

  return (
    <div className="relative mb-6 rounded-3xl overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 opacity-90" />
      <div className="absolute inset-0"
        style={{
          backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.15) 0%, transparent 60%)',
        }}
      />

      <div className="relative z-10 px-5 py-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-3xl mb-2">✨</div>
            <h3 className="text-white font-bold text-xl leading-tight mb-1">
              ようこそ、ANIVAへ！
            </h3>
            <p className="text-white/80 text-sm leading-relaxed">
              あなただけの推しと、毎日リアルに話せる。<br />
              まずは好きなキャラクターを選んでみよう💕
            </p>
          </div>
          <button
            onClick={handleClose}
            className="flex-shrink-0 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 transition-colors flex items-center justify-center text-white text-lg font-light"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── main page ── */
export default function ChatPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [relationships, setRelationships] = useState<Map<string, RelationshipInfo>>(new Map());
  const [totalMessages, setTotalMessages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [, setBannerClosed] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (status === 'authenticated') {
      Promise.all([
        fetch('/api/characters').then((r) => r.json()),
        fetch('/api/relationship/all').then((r) => r.json()),
      ])
        .then(([charData, relData]) => {
          setCharacters(charData.characters || []);
          if (relData.relationships) {
            const map = new Map<string, RelationshipInfo>();
            let msgs = 0;
            for (const rel of relData.relationships as RelationshipInfo[]) {
              map.set(rel.characterId, rel);
              msgs += rel.totalMessages;
            }
            setRelationships(map);
            setTotalMessages(msgs);
          }
          setIsLoading(false);
        })
        .catch(() => setIsLoading(false));
    }
  }, [status]);

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-950">
        <div className="relative w-16 h-16 mb-6">
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 animate-ping opacity-40" />
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-2xl">
            ✨
          </div>
        </div>
        <p className="text-white/60 text-sm animate-pulse">推しを呼んでいます…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Ambient background blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-purple-600/20 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-pink-600/20 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-blue-600/10 blur-3xl" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-20 bg-gray-950/70 backdrop-blur-xl border-b border-white/5 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-sm font-bold text-white shadow-lg shadow-purple-500/40">
              A
            </div>
            <h1 className="text-lg font-bold text-white tracking-tight">ANIVA</h1>
          </div>
          <div className="text-xs text-white/40 font-mono truncate max-w-[140px]">
            {session?.user?.email}
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-lg mx-auto px-4 py-6">
        {/* Welcome banner */}
        <WelcomeBanner onClose={() => setBannerClosed(true)} />

        {/* デイリーミッション */}
        {relationships.size > 0 && (
          <DailyMissionsSection totalMessages={totalMessages} />
        )}

        {/* Section header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">💫</span>
            <h2 className="text-2xl font-extrabold text-white leading-tight">
              推しを選ぼう
            </h2>
          </div>
          <p className="text-white/50 text-sm pl-9">
            今日も一緒にいてくれる、あなただけの推し ✨
          </p>
        </div>

        {characters.length === 0 ? (
          <div className="text-center text-gray-400 py-20">
            <div className="text-6xl mb-4">🌌</div>
            <p className="text-white/60 font-medium">キャラクターが見つかりませんでした</p>
            <p className="text-white/30 text-sm mt-1">管理者に連絡してください</p>
          </div>
        ) : (
          <div className="space-y-4">
            {characters.map((character, i) => (
              <CharacterCard
                key={character.id}
                character={character}
                index={i}
                onClick={() => router.push(`/chat/${character.id}`)}
                relationship={relationships.get(character.id)}
              />
            ))}
          </div>
        )}

        {/* Bottom CTA hint */}
        {characters.length > 0 && (
          <p className="text-center text-white/25 text-xs mt-8">
            タップして推しとトークを始めよう 💬
          </p>
        )}
      </main>
    </div>
  );
}
