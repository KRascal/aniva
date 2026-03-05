'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { DailyBonus } from '@/components/DailyBonus';
import { getTodayMainEvent } from '@/lib/today-events';
import { getDailyState } from '@/lib/character-daily-state';
import { useMissionTrigger } from '@/hooks/useMissionTrigger';

// ── 期間限定シナリオ型 ──
interface LimitedScenarioSummary {
  id: string;
  title: string;
  description: string | null;
  endsAt: string;
  isExpired: boolean;
  isRead: boolean;
  remainingHours: number;
  character: {
    id: string;
    name: string;
    slug: string;
    avatarUrl: string | null;
    franchise: string;
  };
}

// ── 期間限定シナリオ残り時間カウントダウン ──
function useScenarioCountdown(endsAt: string): string {
  const [label, setLabel] = useState('');

  useEffect(() => {
    function update() {
      const diff = new Date(endsAt).getTime() - Date.now();
      if (diff <= 0) {
        setLabel('終了');
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      if (h >= 24) {
        const d = Math.floor(h / 24);
        setLabel(`残り${d}日${h % 24}時間`);
      } else if (h > 0) {
        setLabel(`残り${h}時間${m}分`);
      } else {
        setLabel(`残り${m}分！`);
      }
    }
    update();
    const id = setInterval(update, 10000);
    return () => clearInterval(id);
  }, [endsAt]);

  return label;
}

// ── 期間限定シナリオバナーカード ──
function LimitedScenarioBannerCard({ scenario }: { scenario: LimitedScenarioSummary }) {
  const router = useRouter();
  const countdown = useScenarioCountdown(scenario.endsAt);
  const isUrgent = scenario.remainingHours <= 6;

  return (
    <button
      onClick={() => router.push(`/scenario/${scenario.id}`)}
      className="w-full text-left rounded-2xl overflow-hidden active:scale-[0.98] transition-all duration-200"
      style={{
        background: isUrgent
          ? 'linear-gradient(135deg, rgba(239,68,68,0.22), rgba(220,38,38,0.18), rgba(154,52,18,0.15))'
          : 'linear-gradient(135deg, rgba(239,68,68,0.18), rgba(251,113,133,0.15), rgba(139,92,246,0.12))',
        border: isUrgent
          ? '1px solid rgba(239,68,68,0.5)'
          : '1px solid rgba(239,68,68,0.35)',
        boxShadow: isUrgent
          ? '0 4px 24px rgba(239,68,68,0.25), 0 0 0 1px rgba(239,68,68,0.15)'
          : '0 2px 16px rgba(239,68,68,0.12)',
      }}
    >
      <div className="px-4 py-3 flex items-center gap-3">
        {/* キャラアバター */}
        <div className="flex-shrink-0 relative">
          {scenario.character.avatarUrl ? (
            <img
              src={scenario.character.avatarUrl}
              alt={scenario.character.name}
              className="w-12 h-12 rounded-full object-cover"
              style={{
                boxShadow: '0 0 0 2px rgba(239,68,68,0.5), 0 4px 12px rgba(0,0,0,0.4)',
              }}
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-600 to-pink-600 flex items-center justify-center text-white font-bold text-base">
              {scenario.character.name.charAt(0)}
            </div>
          )}
          {/* 未読ドット */}
          {!scenario.isRead && (
            <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-red-500 rounded-full ring-2 ring-gray-950 animate-pulse" />
          )}
        </div>

        {/* コンテンツ */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-red-400 text-[10px] font-black tracking-widest uppercase">期間限定</span>
            {isUrgent && (
              <span className="text-red-300 text-[9px] font-bold bg-red-500/20 px-1.5 py-0.5 rounded-full border border-red-500/30">
                🔥 まもなく終了
              </span>
            )}
          </div>
          <p className="text-white font-bold text-sm leading-tight truncate">{scenario.title}</p>
          {scenario.description && (
            <p className="text-white/55 text-xs mt-0.5 truncate">{scenario.description}</p>
          )}
          <p className={`text-xs font-semibold mt-1 ${isUrgent ? 'text-red-300' : 'text-red-400/80'}`}>
            ⏰ {countdown}
          </p>
        </div>

        {/* CTAラベル */}
        <div className="flex-shrink-0">
          <span
            className="text-white text-xs font-bold px-3 py-1.5 rounded-full"
            style={{
              background: isUrgent
                ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                : 'linear-gradient(135deg, rgba(239,68,68,0.8), rgba(220,38,38,0.8))',
              boxShadow: '0 2px 8px rgba(239,68,68,0.4)',
            }}
          >
            読む →
          </span>
        </div>
      </div>

      {/* FOOMOメッセージ帯 */}
      <div
        className="px-4 py-1.5 text-center text-[10px] font-bold tracking-wide"
        style={{
          background: isUrgent
            ? 'rgba(239,68,68,0.15)'
            : 'rgba(239,68,68,0.08)',
          borderTop: '1px solid rgba(239,68,68,0.15)',
          color: 'rgba(252,165,165,0.85)',
        }}
      >
        ⚠️ 見逃すと二度と読めない
      </div>
    </button>
  );
}

// ── 期間限定シナリオセクション ──
function LimitedScenariosSection() {
  const [scenarios, setScenarios] = useState<LimitedScenarioSummary[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch('/api/scenarios/active')
      .then(r => r.json())
      .then(data => {
        const active = (data.scenarios ?? []).filter((s: LimitedScenarioSummary) => !s.isExpired);
        setScenarios(active);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  if (!loaded || scenarios.length === 0) return null;

  return (
    <FadeSection delay={25}>
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-3">
          <h3 className="text-white font-bold text-base">期間限定シナリオ</h3>
          <span
            className="text-xs px-2 py-0.5 rounded-full font-bold"
            style={{
              background: 'linear-gradient(135deg, rgba(239,68,68,0.3), rgba(220,38,38,0.3))',
              color: 'rgba(252,165,165,0.9)',
              border: '1px solid rgba(239,68,68,0.3)',
            }}
          >
            {scenarios.length}件
          </span>
        </div>
        <div className="space-y-3">
          {scenarios.map(s => (
            <LimitedScenarioBannerCard key={s.id} scenario={s} />
          ))}
        </div>
      </div>
    </FadeSection>
  );
}

// ── キャラ主導メッセージ型 ──
interface ProactiveMessage {
  id: string;
  message: string;
  isRead: boolean;
  expiresAt: string;
  createdAt: string;
  character: {
    id: string;
    name: string;
    slug: string;
    avatarUrl: string | null;
    franchise: string;
  };
}

// ── 残り時間フォーマット ──
function useCountdown(expiresAt: string): string {
  const [label, setLabel] = useState('');

  useEffect(() => {
    function update() {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) {
        setLabel('期限切れ');
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      if (h > 0) {
        setLabel(`残り${h}時間${m}分`);
      } else {
        setLabel(`残り${m}分`);
      }
    }
    update();
    const id = setInterval(update, 30000);
    return () => clearInterval(id);
  }, [expiresAt]);

  return label;
}

// ── 単一メッセージカードアイテム ──
function ProactiveMessageItem({
  msg,
  onRead,
}: {
  msg: ProactiveMessage;
  onRead: (id: string) => void;
}) {
  const router = useRouter();
  const countdown = useCountdown(msg.expiresAt);
  const isExpired = new Date(msg.expiresAt).getTime() < Date.now();

  // 期限切れ（1時間以内）→ 「読めなかった…💔」表示
  if (isExpired) {
    const expiredAgo = Date.now() - new Date(msg.expiresAt).getTime();
    if (expiredAgo > 60 * 60 * 1000) return null; // 1h超えたら非表示
    return (
      <div
        className="flex-shrink-0 w-64 rounded-2xl p-3 flex items-center gap-3 opacity-50"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0 text-base">
          {msg.character.avatarUrl ? (
            <img src={msg.character.avatarUrl} alt={msg.character.name} className="w-full h-full rounded-full object-cover" />
          ) : (
            msg.character.name.charAt(0)
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-gray-400 text-xs font-medium truncate">{msg.character.name}</p>
          <p className="text-gray-500 text-xs mt-0.5">読めなかった…💔</p>
        </div>
      </div>
    );
  }

  const handleTap = async () => {
    // 既読API
    if (!msg.isRead) {
      onRead(msg.id);
      fetch(`/api/proactive-messages/${msg.id}/read`, { method: 'POST' }).catch(() => {});
    }
    router.push(`/chat/${msg.character.slug}`);
  };

  return (
    <button
      onClick={handleTap}
      className="flex-shrink-0 w-64 rounded-2xl p-3 flex items-center gap-3 text-left cursor-pointer transition-all active:scale-95"
      style={{
        background: msg.isRead
          ? 'rgba(255,255,255,0.04)'
          : 'linear-gradient(135deg, rgba(139,92,246,0.18), rgba(236,72,153,0.12))',
        border: msg.isRead
          ? '1px solid rgba(255,255,255,0.08)'
          : '1px solid rgba(139,92,246,0.35)',
        boxShadow: msg.isRead ? 'none' : '0 2px 16px rgba(139,92,246,0.12)',
      }}
    >
      {/* アバター + 未読ドット */}
      <div className="relative flex-shrink-0">
        {msg.character.avatarUrl ? (
          <img
            src={msg.character.avatarUrl}
            alt={msg.character.name}
            className="w-11 h-11 rounded-full object-cover"
            style={{ boxShadow: '0 0 0 2px rgba(139,92,246,0.4)' }}
          />
        ) : (
          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-white font-bold text-sm">
            {msg.character.name.charAt(0)}
          </div>
        )}
        {!msg.isRead && (
          <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-pink-500 rounded-full ring-2 ring-gray-950" />
        )}
      </div>

      {/* メッセージ */}
      <div className="flex-1 min-w-0">
        <p className="text-white text-xs font-bold truncate">{msg.character.name}</p>
        <p className="text-gray-300 text-xs leading-relaxed line-clamp-2 mt-0.5">{msg.message}</p>
        <p className="text-purple-400 text-[10px] mt-1">{countdown}</p>
      </div>
    </button>
  );
}

// ── 新着メッセージセクション ──
function ProactiveMessagesSection() {
  const [messages, setMessages] = useState<ProactiveMessage[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch('/api/proactive-messages')
      .then(r => r.json())
      .then(data => {
        setMessages(data.messages ?? []);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  const handleRead = useCallback((id: string) => {
    setMessages(prev =>
      prev.map(m => (m.id === id ? { ...m, isRead: true } : m))
    );
  }, []);

  if (!loaded || messages.length === 0) return null;

  return (
    <FadeSection delay={20}>
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-3">
          <h3 className="text-white font-bold text-base">新着メッセージ</h3>
          <span
            className="text-xs px-2 py-0.5 rounded-full font-bold"
            style={{
              background: 'linear-gradient(135deg, rgba(139,92,246,0.3), rgba(236,72,153,0.3))',
              color: 'rgba(216,180,254,0.9)',
              border: '1px solid rgba(139,92,246,0.3)',
            }}
          >
            {messages.filter(m => !m.isRead).length}件未読
          </span>
        </div>
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
          {messages.map(msg => (
            <ProactiveMessageItem key={msg.id} msg={msg} onRead={handleRead} />
          ))}
        </div>
      </div>
    </FadeSection>
  );
}

interface Character {
  id: string;
  name: string;
  nameEn: string | null;
  slug: string;
  franchise: string;
  franchiseEn: string | null;
  description: string | null;
  avatarUrl: string | null;
  coverUrl: string | null;
  catchphrases: string[];
  followerCount?: number;
  birthday?: string | null;
}

/** 誕生日が今日から daysAhead 日以内かチェック (MM-DD or M/D 形式対応) */
function getBirthdayCountdown(birthday: string | null | undefined): number | null {
  if (!birthday) return null;
  const normalized = birthday.includes('/') ? birthday.replace('/', '-').padStart(5, '0') : birthday;
  const [mm, dd] = normalized.split('-').map(Number);
  if (!mm || !dd) return null;
  const now = new Date();
  const jstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const year = jstNow.getUTCFullYear();
  let bday = new Date(Date.UTC(year, mm - 1, dd));
  if (bday < jstNow) bday = new Date(Date.UTC(year + 1, mm - 1, dd));
  const diffMs = bday.getTime() - jstNow.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return diffDays <= 7 ? diffDays : null;
}

interface RelationshipInfo {
  characterId: string;
  level: number;
  levelName: string;
  xp: number;
  totalMessages: number;
  isFollowing: boolean;
  isFanclub: boolean;
}

// Franchise categories with gradient
const FRANCHISE_CATEGORIES = [
  { name: 'すべて', gradient: 'from-purple-500 to-pink-500' },
  { name: 'ONE PIECE', gradient: 'from-orange-500 to-red-500' },
  { name: '呪術廻戦', gradient: 'from-blue-500 to-indigo-600' },
  { name: '鬼滅の刃', gradient: 'from-pink-500 to-rose-600' },
  { name: 'ドラゴンボール', gradient: 'from-yellow-400 to-orange-500' },
  { name: 'NARUTO', gradient: 'from-orange-400 to-yellow-500' },
  { name: '進撃の巨人', gradient: 'from-gray-600 to-gray-800' },
  { name: 'アニメ', gradient: 'from-emerald-500 to-cyan-500' },
];

const FRANCHISE_META: Record<string, { gradient: string }> = {
  'ONE PIECE':    { gradient: 'from-orange-500 to-red-500' },
  '呪術廻戦':     { gradient: 'from-blue-500 to-indigo-600' },
  '鬼滅の刃':     { gradient: 'from-pink-500 to-rose-600' },
  'ドラゴンボール':{ gradient: 'from-yellow-400 to-orange-500' },
  'NARUTO':       { gradient: 'from-orange-400 to-yellow-500' },
  '進撃の巨人':   { gradient: 'from-gray-500 to-gray-700' },
  'アニメ':       { gradient: 'from-emerald-500 to-cyan-500' },
};

const CARD_GRADIENTS = [
  'from-purple-600 via-pink-600 to-rose-500',
  'from-blue-600 via-cyan-500 to-teal-500',
  'from-orange-500 via-amber-500 to-yellow-400',
  'from-green-600 via-emerald-500 to-cyan-500',
  'from-indigo-600 via-violet-500 to-purple-500',
  'from-rose-600 via-red-500 to-orange-500',
];

/* ── Intersection Observer fade-in hook ── */
function useFadeIn() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, visible };
}

/* ── Fade-in section wrapper ── */
function FadeSection({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const { ref, visible } = useFadeIn();
  return (
    <div
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(28px)',
        transition: `opacity 0.55s cubic-bezier(0.22,1,0.36,1) ${delay}ms, transform 0.55s cubic-bezier(0.22,1,0.36,1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

/* ── Franchise Badge ── */
function FranchiseBadge({ franchise }: { franchise: string }) {
  const meta = FRANCHISE_META[franchise];
  if (!meta) {
    return (
      <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-white/15 text-white/70 border border-white/20">
        {franchise}
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center text-[9px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r ${meta.gradient} text-white shadow-sm`}>
      {franchise}
    </span>
  );
}

function FollowButton({
  characterId,
  initialFollowing,
  onFollow,
}: {
  characterId: string;
  initialFollowing: boolean;
  onFollow: (id: string, following: boolean) => void;
}) {
  const [following, setFollowing] = useState(initialFollowing);
  const [loading, setLoading] = useState(false);

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setLoading(true);
    try {
      const res = await fetch(`/api/relationship/${characterId}/follow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ follow: !following }),
      });
      if (res.ok) {
        setFollowing(!following);
        onFollow(characterId, !following);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`
        flex-shrink-0 px-4 py-2 rounded-full text-xs font-bold transition-all duration-200 active:scale-95
        ${following
          ? 'bg-white/10 text-white border border-white/25 hover:bg-red-900/30 hover:text-red-300 hover:border-red-500/40 hover:scale-105'
          : 'text-white hover:scale-105'
        }
        ${loading ? 'opacity-50' : ''}
      `}
      style={!following ? {
        background: 'linear-gradient(135deg, rgba(139,92,246,0.9), rgba(236,72,153,0.9))',
        boxShadow: '0 2px 12px rgba(139,92,246,0.4)',
      } : undefined}
    >
      {loading ? '…' : following ? 'フォロー中' : 'フォローする'}
    </button>
  );
}

// Tall vertical card (Instagram Reels style) — glassmorphism + hover lift
function CharacterVerticalCard({
  character,
  index,
  relationship,
  onFollow,
  onClick,
}: {
  character: Character;
  index: number;
  relationship?: RelationshipInfo;
  onFollow: (id: string, following: boolean) => void;
  onClick: () => void;
}) {
  const gradient = CARD_GRADIENTS[index % CARD_GRADIENTS.length];
  const catchphrase = character.catchphrases?.[0] ?? null;
  const isFollowing = relationship?.isFollowing ?? false;
  const isFanclub = relationship?.isFanclub ?? false;
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative flex-shrink-0 w-44 cursor-pointer"
      style={{
        transform: hovered ? 'translateY(-8px)' : 'translateY(0)',
        transition: 'transform 0.35s cubic-bezier(0.22,1,0.36,1)',
      }}
    >
      {/* Glow shadow on hover */}
      <div
        className="absolute -inset-1 rounded-3xl opacity-0 transition-opacity duration-300 pointer-events-none"
        style={{
          opacity: hovered ? 0.6 : 0,
          background: 'radial-gradient(ellipse at center, rgba(139,92,246,0.4) 0%, transparent 70%)',
          filter: 'blur(8px)',
        }}
      />

      {/* Card */}
      <div
        className="relative h-64 rounded-2xl overflow-hidden"
        style={{
          boxShadow: hovered
            ? '0 20px 60px rgba(0,0,0,0.6), 0 0 30px rgba(139,92,246,0.3)'
            : '0 8px 32px rgba(0,0,0,0.4)',
          transition: 'box-shadow 0.35s ease',
        }}
      >
        {/* Background image */}
        {character.coverUrl ? (
          <img
            src={character.coverUrl}
            alt={character.name}
            className="absolute inset-0 w-full h-full object-cover"
            style={{
              transform: hovered ? 'scale(1.08)' : 'scale(1.02)',
              transition: 'transform 0.6s cubic-bezier(0.22,1,0.36,1)',
            }}
          />
        ) : character.avatarUrl ? (
          <img
            src={character.avatarUrl}
            alt={character.name}
            className="absolute inset-0 w-full h-full object-cover"
            style={{
              filter: 'brightness(0.65) saturate(1.4)',
              transform: hovered ? 'scale(1.12)' : 'scale(1.08)',
              transition: 'transform 0.6s cubic-bezier(0.22,1,0.36,1)',
            }}
          />
        ) : (
          <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`} />
        )}

        {/* Multi-layer overlay — richer depth */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent" />
        {/* Iridescent tint on hover */}
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-300"
          style={{
            opacity: hovered ? 0.15 : 0,
            background: 'linear-gradient(135deg, rgba(139,92,246,0.6) 0%, rgba(236,72,153,0.4) 50%, rgba(251,146,60,0.3) 100%)',
          }}
        />

        {/* Glassmorphism overlay card at bottom */}
        <div
          className="absolute bottom-0 left-0 right-0 p-3"
          style={{
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.2) 60%, transparent 100%)',
          }}
        >
          {/* Franchise badge */}
          <div className="mb-1.5">
            <FranchiseBadge franchise={character.franchise} />
          </div>

          <p className="text-white font-bold text-sm leading-tight mb-1">{character.name}</p>
          {/* 今日のキャラ状態バッジ */}
          {(() => {
            const state = getDailyState(character.slug ?? character.id);
            return (
              <div className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 mb-1 text-[9px] font-medium ${
                state.isRareDay
                  ? 'bg-yellow-500/30 border border-yellow-500/50 text-yellow-300'
                  : state.energy === 'high'
                  ? 'bg-purple-600/20 border border-purple-500/30 text-purple-300'
                  : 'bg-gray-700/40 border border-gray-600/30 text-gray-400'
              }`}>
                <span>{state.moodEmoji}</span>
                <span>{state.mood}</span>
              </div>
            );
          })()}
          {catchphrase && (
            <p className="text-white/65 text-[10px] leading-tight line-clamp-2 mb-1 italic">
              &ldquo;{catchphrase}&rdquo;
            </p>
          )}
          {(character.followerCount ?? 0) > 0 && (
            <p className="text-white/45 text-[9px] mb-1.5">
              {(character.followerCount ?? 0).toLocaleString()} フォロワー
            </p>
          )}
          <div onClick={(e) => e.stopPropagation()}>
            <FollowButton
              characterId={character.id}
              initialFollowing={isFollowing}
              onFollow={onFollow}
            />
          </div>
        </div>

        {/* Fanclub badge */}
        {isFanclub && (
          <div className="absolute top-2 left-2 flex items-center gap-1 text-white text-[9px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: 'linear-gradient(135deg, rgba(236,72,153,0.9), rgba(139,92,246,0.9))', boxShadow: '0 2px 8px rgba(236,72,153,0.5)' }}
          >
            推し
          </div>
        )}

        {/* Avatar circle */}
        <div className="absolute top-3 right-3">
          {character.avatarUrl ? (
            <img
              src={character.avatarUrl}
              alt={character.name}
              className="w-10 h-10 rounded-full object-cover"
              style={{ boxShadow: '0 0 0 2px rgba(255,255,255,0.3), 0 4px 12px rgba(0,0,0,0.5)' }}
            />
          ) : (
            <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-base font-bold text-white`}
              style={{ boxShadow: '0 0 0 2px rgba(255,255,255,0.3)' }}
            >
              {character.name.charAt(0)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Horizontal card — glassmorphism hover
function CharacterHorizontalCard({
  character,
  index,
  relationship,
  onFollow,
  onClick,
}: {
  character: Character;
  index: number;
  relationship?: RelationshipInfo;
  onFollow: (id: string, following: boolean) => void;
  onClick: () => void;
}) {
  const gradient = CARD_GRADIENTS[index % CARD_GRADIENTS.length];
  const catchphrase = character.catchphrases?.[0] ?? null;
  const isFollowing = relationship?.isFollowing ?? false;
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="flex items-center gap-4 rounded-2xl p-4 cursor-pointer border"
      style={{
        background: hovered ? 'rgba(139,92,246,0.08)' : 'rgba(255,255,255,0.03)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderColor: hovered ? 'rgba(139,92,246,0.35)' : 'rgba(255,255,255,0.07)',
        transform: hovered ? 'translateY(-3px)' : 'translateY(0)',
        boxShadow: hovered ? '0 12px 40px rgba(0,0,0,0.3), 0 0 20px rgba(139,92,246,0.15)' : '0 2px 8px rgba(0,0,0,0.2)',
        transition: 'all 0.3s cubic-bezier(0.22,1,0.36,1)',
      }}
    >
      {/* Avatar */}
      <div className="flex-shrink-0 relative">
        {character.avatarUrl ? (
          <img
            src={character.avatarUrl}
            alt={character.name}
            className="w-16 h-16 rounded-xl object-cover"
            style={{
              transform: hovered ? 'scale(1.06)' : 'scale(1)',
              transition: 'transform 0.3s ease',
              boxShadow: hovered ? '0 4px 16px rgba(139,92,246,0.3)' : 'none',
            }}
          />
        ) : (
          <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-xl font-bold text-white`}>
            {character.name.charAt(0)}
          </div>
        )}
        {/* Online dot */}
        <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-green-400 rounded-full ring-2 ring-gray-950 animate-pulse" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-white font-bold text-base leading-tight mb-0.5">{character.name}</p>
        <div className="mb-1">
          <FranchiseBadge franchise={character.franchise} />
        </div>
        {catchphrase && (
          <p className="text-gray-400 text-xs italic truncate">&ldquo;{catchphrase}&rdquo;</p>
        )}
        {(character.followerCount ?? 0) > 0 && (
          <p className="text-gray-500 text-[10px] mt-0.5">
            {(character.followerCount ?? 0).toLocaleString()} フォロワー
          </p>
        )}
      </div>

      {/* Follow button */}
      <div onClick={(e) => e.stopPropagation()}>
        <FollowButton
          characterId={character.id}
          initialFollowing={isFollowing}
          onFollow={onFollow}
        />
      </div>
    </div>
  );
}

export default function ExplorePage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();

  // ミッション「キャラを探す」自動完了
  useMissionTrigger('explore_visit');

  const [characters, setCharacters] = useState<Character[]>([]);
  const [relationships, setRelationships] = useState<Map<string, RelationshipInfo>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('すべて');
  const [incompleteMissions, setIncompleteMissions] = useState(0);
  const [missionHint, setMissionHint] = useState('');

  // オンボーディング未完了ならリダイレクト（stale JWT対策: proxyをバイパスした場合のフォールバック）
  useEffect(() => {
    if (status === 'authenticated') {
      const step = session?.user?.onboardingStep;
      if (step !== 'completed') {
        // JWTがstaleかもしれない → update()でDB最新を取得してから再判定
        update().then((updated) => {
          const updatedStep = updated?.user?.onboardingStep;
          if (updatedStep !== 'completed') {
            router.push('/onboarding');
          }
        });
      }
    }
  }, [status, session, update, router]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  // 未完了ミッション数を取得
  useEffect(() => {
    if (status !== 'authenticated') return;
    fetch('/api/missions')
      .then(r => r.json())
      .then(data => {
        const daily = (data.missions ?? []).filter((m: { completed: boolean }) => !m.completed);
        const weekly = (data.weeklyMissions ?? []).filter((m: { completed: boolean }) => !m.completed);
        const total = daily.length + weekly.length;
        setIncompleteMissions(total);
        if (total === 1) setMissionHint('あと1個でコイン獲得！急げ！');
        else if (total === 2) setMissionHint('あと2個！今日中にクリアしよう');
        else if (total > 0) setMissionHint(`${total}個の未完了ミッション`);
      })
      .catch(() => {});
  }, [status]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetch('/api/characters').then(r => r.json()).then(charData => {
        setCharacters(charData.characters || []);
      }).catch(err => console.error('Failed to fetch characters:', err));

      fetch('/api/relationship/all').then(r => r.json()).then(relData => {
        if (relData.relationships) {
          const map = new Map<string, RelationshipInfo>();
          for (const rel of relData.relationships as RelationshipInfo[]) {
            map.set(rel.characterId, rel);
          }
          setRelationships(map);
        }
      }).catch(err => console.error('Failed to fetch relationships:', err))
        .finally(() => setIsLoading(false));
    }
  }, [status]);

  const handleFollow = useCallback((characterId: string, following: boolean) => {
    setRelationships(prev => {
      const next = new Map(prev);
      const existing = next.get(characterId);
      if (existing) {
        next.set(characterId, { ...existing, isFollowing: following });
      } else {
        next.set(characterId, {
          characterId,
          level: 1,
          levelName: '知り合い',
          xp: 0,
          totalMessages: 0,
          isFollowing: following,
          isFanclub: false,
        });
      }
      return next;
    });
  }, []);

  // Filter characters
  const filteredCharacters = characters.filter(c => {
    const matchesSearch = !searchQuery ||
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.nameEn?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      c.franchise.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = selectedCategory === 'すべて' || c.franchise === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const availableFranchises = new Set(characters.map(c => c.franchise));
  const visibleCategories = FRANCHISE_CATEGORIES.filter(
    cat => cat.name === 'すべて' || availableFranchises.has(cat.name) || cat.name === 'アニメ'
  );

  if (status === 'loading' || (status === 'authenticated' && isLoading)) {
    return (
      <div className="min-h-screen bg-gray-950 pb-24">
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-40 -left-20 w-80 h-80 rounded-full bg-purple-600/15 blur-3xl" />
          <div className="absolute top-1/3 right-0 w-64 h-64 rounded-full bg-pink-600/10 blur-3xl" />
        </div>
        <header className="sticky top-0 z-30 bg-gray-950 border-b border-white/5">
          <div className="max-w-lg mx-auto px-4 pt-4 pb-3">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">A</div>
              <div className="h-5 w-24 bg-white/10 rounded-full animate-pulse" />
            </div>
            <div className="h-10 bg-white/6 rounded-full animate-pulse" />
          </div>
          <div className="flex gap-2 px-4 pb-3 overflow-hidden">
            {[60, 100, 70, 80, 90].map((w, i) => (
              <div key={i} className="flex-shrink-0 h-8 rounded-full bg-white/6 animate-pulse" style={{ width: `${w}px`, animationDelay: `${i * 100}ms` }} />
            ))}
          </div>
        </header>
        <div className="max-w-lg mx-auto px-4 py-6">
          <div className="h-44 rounded-3xl bg-white/5 animate-pulse mb-6" />
          <div className="mb-2 h-5 w-32 bg-white/10 rounded-full animate-pulse" />
          <div className="flex gap-3 overflow-hidden mt-3 mb-6 pb-2">
            {[0,1,2,3].map(i => (
              <div key={i} className="flex-shrink-0 w-44">
                <div className="h-64 rounded-2xl bg-white/5 animate-pulse" style={{ animationDelay: `${i * 80}ms` }} />
              </div>
            ))}
          </div>
          <div className="mb-2 h-5 w-36 bg-white/10 rounded-full animate-pulse" />
          <div className="space-y-3 mt-3">
            {[0,1,2,3].map(i => (
              <div key={i} className="flex items-center gap-4 bg-white/[0.04] rounded-2xl p-4" style={{ animationDelay: `${i * 80}ms` }}>
                <div className="w-16 h-16 rounded-xl bg-white/8 animate-pulse flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-white/8 rounded-full animate-pulse w-24" />
                  <div className="h-3 bg-white/5 rounded-full animate-pulse w-16" />
                  <div className="h-3 bg-white/5 rounded-full animate-pulse w-32" />
                </div>
                <div className="w-20 h-8 rounded-full bg-white/8 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Empty state when no characters loaded
  if (!isLoading && characters.length === 0) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center pb-24 px-4">
        <div className="text-6xl mb-4">🌊</div>
        <h2 className="text-white text-xl font-bold mb-2">キャラクターを準備中です</h2>
        <p className="text-gray-400 text-sm text-center">もうしばらくお待ちください。<br />新しいキャラクターが間もなく登場します！</p>
      </div>
    );
  }

  const followingChars = filteredCharacters.filter(c => relationships.get(c.id)?.isFollowing);
  const popularChars = filteredCharacters.slice(0, 6);
  const newChars = [...filteredCharacters].reverse().slice(0, 4);

  return (
    <>
      {/* デイリーログインボーナス */}
      <DailyBonus />
      <style>{`
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        @keyframes catBadgePop {
          0%   { transform: scale(0.85); opacity: 0; }
          60%  { transform: scale(1.08); }
          100% { transform: scale(1); opacity: 1; }
        }
        .cat-badge-active { animation: catBadgePop 0.25s cubic-bezier(0.22,1,0.36,1) forwards; }
      `}</style>

      <div className="min-h-screen bg-gray-950 pb-24">
        {/* Fixed background blobs */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-40 -left-20 w-96 h-96 rounded-full bg-purple-600/12 blur-3xl" />
          <div className="absolute top-1/3 right-0 w-72 h-72 rounded-full bg-pink-600/10 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 w-80 h-80 rounded-full bg-indigo-600/08 blur-3xl" />
          <div className="absolute top-2/3 left-0 w-60 h-60 rounded-full bg-orange-600/06 blur-3xl" />
        </div>

        {/* Header */}
        <header className="sticky top-0 z-30 border-b border-white/5"
          style={{ background: 'rgb(3,7,18)' }}
        >
          <div className="max-w-lg mx-auto px-4 pt-4 pb-3">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', boxShadow: '0 2px 12px rgba(139,92,246,0.5)' }}
              >
                A
              </div>
              <h1 className="text-lg font-black text-white tracking-tight">推しを探す</h1>
            </div>

            {/* Search bar */}
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="キャラ名、作品名で検索…"
                className="w-full pl-10 pr-4 py-2.5 text-white placeholder-gray-500 text-sm focus:outline-none transition-all rounded-full"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.10)',
                }}
                onFocus={(e) => { e.target.style.borderColor = 'rgba(139,92,246,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(139,92,246,0.12)'; }}
                onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.10)'; e.target.style.boxShadow = ''; }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Category scroll */}
          <div className="overflow-x-auto no-scrollbar">
            <div className="flex gap-2 px-4 pb-3">
              {visibleCategories.map(cat => (
                <button
                  key={cat.name}
                  onClick={() => setSelectedCategory(cat.name)}
                  className={`
                    flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200
                    ${selectedCategory === cat.name ? 'cat-badge-active text-white' : 'text-gray-400 border border-white/10 hover:text-gray-200 hover:border-white/20'}
                  `}
                  style={selectedCategory === cat.name ? {
                    background: `linear-gradient(135deg, var(--tw-gradient-stops))`,
                    boxShadow: '0 2px 12px rgba(0,0,0,0.4)',
                    backgroundImage: `linear-gradient(135deg, ${cat.gradient.includes('purple') ? '#8b5cf6, #ec4899' : cat.gradient.includes('orange') ? '#f97316, #ef4444' : cat.gradient.includes('blue') ? '#3b82f6, #4f46e5' : cat.gradient.includes('pink') ? '#ec4899, #f43f5e' : cat.gradient.includes('yellow') ? '#facc15, #f97316' : cat.gradient.includes('gray') ? '#6b7280, #374151' : '#10b981, #06b6d4'})`,
                  } : {
                    background: 'rgba(255,255,255,0.04)',
                  }}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        </header>

        <main className="relative z-10 max-w-lg mx-auto px-4">

          {/* HERO section — only on no search/filter */}
          {!searchQuery && selectedCategory === 'すべて' && (
            <div className="py-6">
              {/* 新着メッセージ（キャラ主導） */}
              <ProactiveMessagesSection />

              {/* Hero banner — dynamic character avatars */}
              <FadeSection>
                {(() => {
                  // Pick up to 4 characters with avatarUrl for the banner
                  const heroChars = characters
                    .filter(c => c.avatarUrl)
                    .slice(0, 4);
                  // Background blur source: first char with coverUrl or avatarUrl
                  const bgSrc = characters.find(c => c.coverUrl)?.coverUrl
                    ?? heroChars[0]?.avatarUrl ?? null;
                  return (
                    <div className="relative rounded-3xl overflow-hidden mb-6"
                      style={{ boxShadow: '0 8px 48px rgba(139,92,246,0.35), 0 0 0 1px rgba(255,255,255,0.06)', minHeight: 220 }}
                    >
                      {/* Blurred background from character art */}
                      {bgSrc ? (
                        <img
                          src={bgSrc}
                          alt=""
                          className="absolute inset-0 w-full h-full object-cover"
                          style={{ filter: 'blur(20px) saturate(1.4) brightness(0.45)', transform: 'scale(1.1)' }}
                          aria-hidden="true"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-purple-700 via-pink-600 to-rose-500" />
                      )}
                      {/* Color overlay */}
                      <div className="absolute inset-0"
                        style={{
                          background: 'linear-gradient(135deg, rgba(88,28,135,0.72) 0%, rgba(157,23,77,0.55) 60%, rgba(0,0,0,0.3) 100%)',
                        }}
                      />
                      {/* Shimmer sweep */}
                      <div className="absolute inset-0 opacity-25"
                        style={{
                          background: 'linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.18) 50%, transparent 65%)',
                          backgroundSize: '200% 100%',
                          animation: 'heroShimmer 3.5s ease-in-out infinite',
                        }}
                      />
                      {/* Particle dots */}
                      <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        {[...Array(8)].map((_, i) => (
                          <div
                            key={i}
                            className="absolute rounded-full bg-white"
                            style={{
                              width: 3 + (i % 3),
                              height: 3 + (i % 3),
                              left: `${10 + i * 11}%`,
                              top: `${15 + (i % 4) * 18}%`,
                              opacity: 0.25 + (i % 3) * 0.15,
                              animation: `heroPart${i % 3 + 1} ${2.5 + i * 0.3}s ease-in-out infinite`,
                              animationDelay: `${i * 0.4}s`,
                            }}
                          />
                        ))}
                      </div>
                      <style>{`
                        @keyframes heroShimmer { 0%,100% { background-position: 200% 0; } 50% { background-position: -200% 0; } }
                        @keyframes heroPart1 { 0%,100% { transform: translateY(0) scale(1); } 50% { transform: translateY(-8px) scale(1.2); } }
                        @keyframes heroPart2 { 0%,100% { transform: translateY(0) scale(1); } 50% { transform: translateY(-5px) scale(0.9); } }
                        @keyframes heroPart3 { 0%,100% { transform: translateY(0) scale(1); } 50% { transform: translateY(-10px) scale(1.1); } }
                        @keyframes heroFloat { 0%,100% { transform: translateY(0px) rotate(-2deg); } 50% { transform: translateY(-6px) rotate(2deg); } }
                        @keyframes heroFloatAlt { 0%,100% { transform: translateY(0px) rotate(2deg); } 50% { transform: translateY(-8px) rotate(-2deg); } }
                        @keyframes heroGlitter { 0%,100% { opacity: 0; transform: scale(0.5); } 50% { opacity: 1; transform: scale(1.2); } }
                        @keyframes heroTicker { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
                      `}</style>

                      <div className="relative z-10 px-5 pt-7 pb-4">
                        <p className="text-white/70 text-xs font-semibold tracking-widest uppercase mb-1.5">✦ Discover</p>
                        <h2 className="text-3xl font-black text-white leading-tight mb-1">
                          推しが、<br />待ってる。
                        </h2>
                        <p className="text-white/65 text-xs leading-relaxed mb-4">
                          フォローして、推しとリアルにトークしよう。
                        </p>

                        {/* Character avatar row */}
                        {heroChars.length > 0 && (
                          <div className="flex items-center mb-4" style={{ gap: '-8px' }}>
                            {heroChars.map((c, i) => (
                              <div
                                key={c.id}
                                className="relative rounded-full border-2 border-white/60 overflow-hidden bg-purple-900 flex-shrink-0"
                                style={{
                                  width: 52,
                                  height: 52,
                                  marginLeft: i === 0 ? 0 : -14,
                                  zIndex: heroChars.length - i,
                                  animation: i % 2 === 0 ? 'heroFloat 3s ease-in-out infinite' : 'heroFloatAlt 3.5s ease-in-out infinite',
                                  animationDelay: `${i * 0.4}s`,
                                  boxShadow: '0 4px 16px rgba(0,0,0,0.5), 0 0 0 2px rgba(255,255,255,0.15)',
                                }}
                                title={c.name}
                              >
                                <img
                                  src={c.avatarUrl!}
                                  alt={c.name}
                                  className="w-full h-full object-cover"
                                />
                                {/* Glitter star */}
                                <div
                                  className="absolute"
                                  style={{
                                    top: -4,
                                    right: -4,
                                    fontSize: 10,
                                    animation: `heroGlitter ${1.5 + i * 0.3}s ease-in-out infinite`,
                                    animationDelay: `${i * 0.6}s`,
                                  }}
                                >✨</div>
                              </div>
                            ))}
                            {characters.filter(c => c.avatarUrl).length > 4 && (
                              <div
                                className="rounded-full border-2 border-white/40 flex items-center justify-center bg-white/10 flex-shrink-0"
                                style={{ width: 52, height: 52, marginLeft: -14, fontSize: 10, color: 'rgba(255,255,255,0.8)', fontWeight: 700 }}
                              >
                                +{characters.filter(c => c.avatarUrl).length - 4}
                              </div>
                            )}
                          </div>
                        )}

                        <div className="flex gap-3">
                          <button
                            onClick={() => document.getElementById('popular-section')?.scrollIntoView({ behavior: 'smooth' })}
                            className="px-5 py-2.5 bg-white text-gray-900 rounded-full font-bold text-sm hover:bg-gray-100 active:scale-95 transition-all shadow-lg"
                          >
                            探す →
                          </button>
                          <button
                            onClick={() => router.push('/chat')}
                            className="px-5 py-2.5 rounded-full font-medium text-sm text-white border border-white/30 hover:bg-white/15 transition-all"
                            style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)' }}
                          >
                            チャットへ
                          </button>
                        </div>
                      </div>

                      {/* Character name ticker marquee */}
                      {characters.length > 0 && (
                        <div
                          className="relative z-10 overflow-hidden border-t py-2"
                          style={{ borderColor: 'rgba(255,255,255,0.12)', background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(4px)' }}
                        >
                          <div
                            className="flex gap-6 whitespace-nowrap text-white/60 text-xs font-medium"
                            style={{ animation: 'heroTicker 20s linear infinite' }}
                          >
                            {/* Duplicate for seamless loop */}
                            {[...characters, ...characters].map((c, i) => (
                              <span key={i} className="flex items-center gap-1.5 flex-shrink-0">
                                <span className="opacity-50">✦</span>
                                {c.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </FadeSection>

              {/* 期間限定シナリオバナー */}
              <LimitedScenariosSection />

              {/* 今日のイベントバナー（hype高めのみ表示） */}
              {(() => {
                const todayEvent = getTodayMainEvent();
                const eventEmojis: Record<string, string> = {
                  'ひな祭り': '🎎',
                  'バレンタイン': '💝',
                  'ホワイトデー': '🍬',
                  'ハロウィン': '🎃',
                  'クリスマスイブ': '🎄',
                  'クリスマス': '🎄',
                  '元日': '🎍',
                  '大晦日': '🎊',
                  '七夕': '🌟',
                  '花見シーズン': '🌸',
                  'TGIF！花金': '🎉',
                  'ポッキーの日': '🍫',
                  '猫の日': '🐱',
                };
                if (!todayEvent) return null;
                const emoji = eventEmojis[todayEvent] ?? '✨';
                return (
                  <FadeSection delay={30}>
                    <div className="rounded-2xl px-4 py-3 mb-5 flex items-center gap-3 cursor-pointer hover:opacity-90 active:scale-[0.99] transition-all"
                      style={{
                        background: 'linear-gradient(135deg, rgba(236,72,153,0.18), rgba(139,92,246,0.18))',
                        border: '1px solid rgba(236,72,153,0.3)',
                        boxShadow: '0 2px 16px rgba(236,72,153,0.12)',
                      }}
                      onClick={() => router.push('/moments')}
                    >
                      <span className="text-2xl flex-shrink-0">{emoji}</span>
                      <div>
                        <p className="text-white font-semibold text-sm">今日は{todayEvent}！</p>
                        <p className="text-white/55 text-xs mt-0.5">推しと{todayEvent}を楽しもう →</p>
                      </div>
                    </div>
                  </FadeSection>
                );
              })()}

              {/* 誕生日カウントダウンバナー（7日以内） */}
              {(() => {
                const upcomingBirthdays = characters
                  .map(c => ({ c, days: getBirthdayCountdown(c.birthday) }))
                  .filter(({ days }) => days !== null)
                  .sort((a, b) => (a.days ?? 99) - (b.days ?? 99))
                  .slice(0, 2);
                if (upcomingBirthdays.length === 0) return null;
                return (
                  <FadeSection delay={35}>
                    <div className="mb-5 space-y-2">
                      {upcomingBirthdays.map(({ c, days }) => (
                        <div
                          key={c.id}
                          className="rounded-2xl px-4 py-3 flex items-center gap-3 cursor-pointer hover:opacity-90 active:scale-[0.99] transition-all"
                          style={{
                            background: 'linear-gradient(135deg, rgba(251,191,36,0.15), rgba(244,63,94,0.15))',
                            border: '1px solid rgba(251,191,36,0.3)',
                            boxShadow: '0 2px 16px rgba(251,191,36,0.08)',
                          }}
                          onClick={() => router.push(`/chat/${c.slug}`)}
                        >
                          {c.avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={c.avatarUrl} alt={c.name} className="w-10 h-10 rounded-full object-cover flex-shrink-0 border-2 border-yellow-400/40" />
                          ) : (
                            <span className="text-2xl flex-shrink-0">🎂</span>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-semibold text-sm">
                              {days === 0 ? `🎉 今日は${c.name.split('・').pop()}の誕生日！` : `🎂 ${c.name.split('・').pop()}の誕生日まであと${days}日`}
                            </p>
                            <p className="text-yellow-300/70 text-xs mt-0.5">
                              {days === 0 ? 'お祝いメッセージを送ろう ✨' : `特別なメッセージを届けよう →`}
                            </p>
                          </div>
                          <span className="text-yellow-400 text-lg flex-shrink-0">🎁</span>
                        </div>
                      ))}
                    </div>
                  </FadeSection>
                );
              })()}

              {/* 未完了ミッションリマインダー */}
              {incompleteMissions > 0 && (
                <FadeSection delay={40}>
                  <div
                    className="mb-4 rounded-2xl px-4 py-3 flex items-center gap-3 cursor-pointer hover:opacity-90 active:scale-[0.99] transition-all"
                    style={{
                      background: incompleteMissions <= 2
                        ? 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(249,115,22,0.15))'
                        : 'linear-gradient(135deg, rgba(168,85,247,0.12), rgba(99,102,241,0.12))',
                      border: incompleteMissions <= 2
                        ? '1px solid rgba(239,68,68,0.3)'
                        : '1px solid rgba(168,85,247,0.2)',
                    }}
                    onClick={() => {
                      const el = document.getElementById('daily-missions');
                      el?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    <span className="text-2xl flex-shrink-0">{incompleteMissions <= 2 ? '⚡' : '📋'}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold text-sm ${incompleteMissions <= 2 ? 'text-red-300' : 'text-purple-300'}`}>
                        {missionHint}
                      </p>
                      <p className="text-gray-400 text-xs mt-0.5">
                        タップしてミッションを確認 →
                      </p>
                    </div>
                    <span className="text-xs bg-red-500/30 text-red-300 px-2 py-1 rounded-full font-bold flex-shrink-0">
                      {incompleteMissions}
                    </span>
                  </div>
                </FadeSection>
              )}

              {/* Following characters strip (if any) */}
              {followingChars.length > 0 && (
                <FadeSection delay={60}>
                  <div className="mb-6">
                    <h3 className="text-white font-bold text-base mb-3">
                      フォロー中
                    </h3>
                    <div className="flex gap-3 overflow-x-auto no-scrollbar pb-3">
                      {followingChars.map((character, i) => (
                        <CharacterVerticalCard
                          key={character.id}
                          character={character}
                          index={i}
                          relationship={relationships.get(character.id)}
                          onFollow={handleFollow}
                          onClick={() => router.push(`/profile/${character.id}`)}
                        />
                      ))}
                    </div>
                  </div>
                </FadeSection>
              )}

              {/* Popular characters */}
              <FadeSection delay={120}>
                <div id="popular-section" className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-white font-bold text-base">
                      人気のキャラクター
                    </h3>
                    <span className="text-xs px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(139,92,246,0.15)', color: 'rgba(196,181,253,0.9)', border: '1px solid rgba(139,92,246,0.25)' }}
                    >
                      {popularChars.length}人
                    </span>
                  </div>
                  {popularChars.length > 0 ? (
                    <div className="flex gap-3 overflow-x-auto no-scrollbar pb-3">
                      {popularChars.map((character, i) => (
                        <CharacterVerticalCard
                          key={character.id}
                          character={character}
                          index={i}
                          relationship={relationships.get(character.id)}
                          onFollow={handleFollow}
                          onClick={() => router.push(`/profile/${character.id}`)}
                        />
                      ))}
                    </div>
                  ) : (
                    <EmptyState />
                  )}
                </div>
              </FadeSection>

              {/* New characters */}
              {newChars.length > 0 && (
                <FadeSection delay={180}>
                  <div className="mb-6">
                    <h3 className="text-white font-bold text-base mb-3">
                      新着キャラクター
                    </h3>
                    <div className="space-y-3">
                      {newChars.map((character, i) => (
                        <CharacterHorizontalCard
                          key={character.id}
                          character={character}
                          index={i}
                          relationship={relationships.get(character.id)}
                          onFollow={handleFollow}
                          onClick={() => router.push(`/profile/${character.id}`)}
                        />
                      ))}
                    </div>
                  </div>
                </FadeSection>
              )}

              {/* All characters */}
              {characters.length > 6 && (
                <FadeSection delay={240}>
                  <div>
                    <h3 className="text-white font-bold text-base mb-3">
                      すべてのキャラクター
                    </h3>
                    <div className="space-y-3">
                      {characters.slice(6).map((character, i) => (
                        <CharacterHorizontalCard
                          key={character.id}
                          character={character}
                          index={i + 6}
                          relationship={relationships.get(character.id)}
                          onFollow={handleFollow}
                          onClick={() => router.push(`/profile/${character.id}`)}
                        />
                      ))}
                    </div>
                  </div>
                </FadeSection>
              )}
            </div>
          )}

          {/* Search / Filter results */}
          {(searchQuery || selectedCategory !== 'すべて') && (
            <FadeSection>
              <div className="py-6">
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="text-white font-bold text-base">
                    {searchQuery ? `「${searchQuery}」の検索結果` : `${selectedCategory}のキャラクター`}
                  </h3>
                  <span className="text-gray-500 text-xs">{filteredCharacters.length}件</span>
                </div>

                {filteredCharacters.length > 0 ? (
                  <div className="space-y-3">
                    {filteredCharacters.map((character, i) => (
                      <CharacterHorizontalCard
                        key={character.id}
                        character={character}
                        index={i}
                        relationship={relationships.get(character.id)}
                        onFollow={handleFollow}
                        onClick={() => router.push(`/profile/${character.id}`)}
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState message="該当するキャラクターが見つかりませんでした" />
                )}
              </div>
            </FadeSection>
          )}
        </main>
      </div>
    </>
  );
}

function EmptyState({ message }: { message?: string }) {
  return (
    <div className="text-center py-16">
      <div className="flex justify-center mb-4">
        <svg className="w-12 h-12 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803a7.5 7.5 0 0010.607 10.607z" />
        </svg>
      </div>
      <p className="text-white/50 text-sm">{message ?? 'キャラクターを準備中です'}</p>
      <p className="text-white/30 text-xs mt-2">もうすぐ追加されます</p>
    </div>
  );
}
