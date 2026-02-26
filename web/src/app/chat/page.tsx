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
  isFollowing?: boolean;
  isFanclub?: boolean;
  character?: { name: string; slug: string; avatarUrl?: string | null };
  lastMessage?: { content: string; role: string } | null;
}

/* ── LINE-style chat row for fanclub characters ── */
function ChatRow({
  character,
  relationship,
  onClick,
}: {
  character: Character;
  relationship: RelationshipInfo;
  onClick: () => void;
}) {
  const lastMsg = relationship.lastMessage;
  const lastAt = relationship.lastMessageAt;
  // Dummy unread count (future use)
  const unread = 0;

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 1) return 'たった今';
    if (mins < 60) return `${mins}分前`;
    if (hours < 24) return `${hours}時間前`;
    if (days < 7) return `${days}日前`;
    return new Date(dateStr).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' });
  };

  const previewText = lastMsg
    ? (lastMsg.role === 'USER' ? `あなた: ${lastMsg.content}` : lastMsg.content)
    : 'メッセージを送ってみよう！';

  const level = relationship.level;
  const filledStars = Math.min(level, 5);

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3.5 bg-gray-900/70 hover:bg-gray-800/80 active:bg-gray-800 rounded-2xl border border-white/5 hover:border-purple-500/20 transition-all duration-200 group text-left"
    >
      {/* アバター */}
      <div className="relative flex-shrink-0">
        <div className="w-14 h-14 rounded-2xl overflow-hidden ring-2 ring-purple-500/20 group-hover:ring-purple-500/40 transition-all">
          {character.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={character.avatarUrl} alt={character.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-xl font-bold text-white">
              {character.name.charAt(0)}
            </div>
          )}
        </div>
        {/* オンラインドット */}
        <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-400 rounded-full border-2 border-gray-950 animate-pulse" />
      </div>

      {/* テキスト情報 */}
      <div className="flex-1 min-w-0">
        {/* 名前 + 時間 */}
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <span className="font-bold text-white text-sm truncate">{character.name}</span>
          <span className="text-[10px] text-gray-500 flex-shrink-0">{formatTime(lastAt)}</span>
        </div>
        {/* 絆レベル */}
        <div className="flex items-center gap-0.5 mb-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <svg key={i} className={`w-2.5 h-2.5 ${i < filledStars ? 'text-yellow-400' : 'text-gray-700'}`} viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
            </svg>
          ))}
          <span className="text-[10px] text-gray-600 ml-0.5">Lv.{level}</span>
        </div>
        {/* 最新メッセージプレビュー */}
        <p className="text-xs text-gray-400 truncate leading-relaxed">
          {previewText}
        </p>
      </div>

      {/* 未読バッジ（ダミー） */}
      <div className="flex-shrink-0 flex flex-col items-end gap-1.5">
        {unread > 0 ? (
          <span className="bg-pink-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {unread}
          </span>
        ) : (
          <svg className="w-4 h-4 text-gray-700 group-hover:text-purple-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        )}
      </div>
    </button>
  );
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
  const filledStars = Math.min(rel.level, 5);

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
      <span className="flex items-center gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <svg key={i} className={`w-2.5 h-2.5 ${i < filledStars ? 'text-yellow-400' : 'text-gray-600'}`} viewBox="0 0 24 24" fill="currentColor">
            <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
          </svg>
        ))}
      </span>
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
  const hasCover = !!character.coverUrl;

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
          hover:shadow-2xl hover:scale-[1.01] hover:-translate-y-0.5
          active:scale-[0.99]
          transition-all duration-300 group bg-gray-900
        `}
      >
        {/* Ripples */}
        {ripples.map((r) => (
          <span
            key={r.id}
            className="absolute rounded-full bg-white/25 pointer-events-none animate-ping z-20"
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

        {/* ── Cover image (Instagram-style) ── */}
        {hasCover ? (
          <div className="relative h-28 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={character.coverUrl!}
              alt=""
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            {/* Gradient fade to card body */}
            <div className={`absolute inset-0 bg-gradient-to-b from-transparent via-black/10 to-gray-900`} />
            {/* Franchise badge overlaid on cover */}
            <div className="absolute top-3 right-3">
              <span className="text-[10px] font-semibold text-white/80 bg-black/40 backdrop-blur-sm px-2 py-1 rounded-full border border-white/15 uppercase tracking-wide">
                {character.franchise}
              </span>
            </div>
          </div>
        ) : (
          /* No cover: blurred avatar background */
          <div className="absolute inset-0">
            {character.avatarUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={character.avatarUrl}
                alt=""
                className="w-full h-full object-cover scale-110"
                style={{ filter: 'blur(22px) brightness(0.3) saturate(1.5)' }}
              />
            )}
            <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-65`} />
          </div>
        )}

        {/* Shimmer on hover */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500
          bg-gradient-to-r from-transparent via-white/6 to-transparent
          -translate-x-full group-hover:translate-x-full
          transition-transform duration-700 ease-in-out pointer-events-none z-10" />

        {/* ── Content ── */}
        <div className={`relative z-10 flex items-end gap-4 px-5 pb-5 ${hasCover ? 'pt-0' : 'pt-5'}`}>
          {/* Avatar ring — overlaps cover when cover exists */}
          <div className={`flex-shrink-0 relative ${hasCover ? '-mt-10' : ''}`}>
            <div className={`w-20 h-20 rounded-2xl overflow-hidden shadow-xl ${hasCover ? 'ring-3 ring-gray-900 ring-offset-0' : 'ring-2 ring-white/30'}`}>
              {character.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={character.avatarUrl}
                  alt={character.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center text-2xl font-bold text-white`}>
                  {character.name.charAt(0)}
                </div>
              )}
            </div>
            {/* Online indicator */}
            <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full ring-2 ring-gray-900 animate-pulse" />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 pb-0.5">
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className="font-bold text-white text-xl leading-tight drop-shadow">{character.name}</h3>
            </div>
            {/* Franchise (only show here if no cover image) */}
            {!hasCover && (
              <p className="text-white/60 text-xs mb-2 font-medium tracking-wide uppercase">
                {character.franchise}
              </p>
            )}

            {/* Catchphrase bubble */}
            {catchphrase && (
              <div className="relative inline-block mt-1">
                <div className="bg-white/12 backdrop-blur-sm border border-white/18 rounded-2xl rounded-tl-sm px-3 py-1.5 max-w-[200px]">
                  <p className="text-white/85 text-xs leading-relaxed line-clamp-2">
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
            group-hover:bg-white/25 transition-colors duration-200 self-end mb-0.5">
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
  { id: 'greet', text: 'キャラに挨拶する', xp: 5 },
  { id: 'msg5', text: '5回メッセージを送る', xp: 20 },
  { id: 'question', text: '質問を1つする', xp: 10 },
];

const DAILY_HINTS = [
  '「好きなものは何？」と聞いてみよう',
  '感情豊かに話すと親密度が上がりやすい',
  '毎日話しかけると絆レベルが早く上がるぞ',
  '「音声を再生」でキャラの声が聞けるよ',
  'プロフィールで絆の進捗を確認できる',
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
        <svg className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
        </svg>
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
          <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
          </svg>
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
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${done ? 'bg-green-400' : 'bg-gray-600'}`} />
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
            <h3 className="text-white font-bold text-xl leading-tight mb-1">
              ようこそ、ANIVAへ！
            </h3>
            <p className="text-white/80 text-sm leading-relaxed">
              あなただけの推しと、毎日リアルに話せる。<br />
              まずは好きなキャラクターを選んでみよう
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
      fetch('/api/characters').then(r => r.json()).then(charData => {
        setCharacters(charData.characters || []);
      }).catch(err => console.error('Failed to fetch characters:', err));

      fetch('/api/relationship/all').then(r => r.json()).then(relData => {
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
      }).catch(err => console.error('Failed to fetch relationships:', err))
        .finally(() => setIsLoading(false));
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

      <main className="relative z-10 max-w-lg mx-auto px-4 py-4">
        {/* チャット一覧 — 会話履歴のあるキャラのみ、最終トーク順 */}
        {(() => {
          // 会話履歴があるキャラのみ（totalMessages > 0）
          const charsWithHistory = characters
            .filter((c) => {
              const rel = relationships.get(c.id);
              return rel && rel.totalMessages > 0;
            })
            .sort((a, b) => {
              const relA = relationships.get(a.id);
              const relB = relationships.get(b.id);
              const timeA = relA?.lastMessageAt ? new Date(relA.lastMessageAt).getTime() : 0;
              const timeB = relB?.lastMessageAt ? new Date(relB.lastMessageAt).getTime() : 0;
              return timeB - timeA; // 最新が上
            });

          if (charsWithHistory.length === 0) {
            return (
              <div className="text-center py-24 px-6">
                <div className="text-5xl mb-4">💬</div>
                <h3 className="text-white font-bold text-lg mb-2">まだ誰とも会話していません</h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  キャラクターのページからチャットを始めてみよう
                </p>
              </div>
            );
          }

          return (
            <div className="space-y-2">
              {charsWithHistory.map((character) => (
                <ChatRow
                  key={character.id}
                  character={character}
                  relationship={relationships.get(character.id)!}
                  onClick={() => router.push(`/chat/${character.id}`)}
                />
              ))}
            </div>
          );
        })()}
      </main>
    </div>
  );
}
