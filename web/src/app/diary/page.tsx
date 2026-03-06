'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

/* ── 型定義 ── */
interface DiaryCharacter {
  id: string;
  name: string;
  slug: string;
  avatarUrl: string | null;
  franchise: string;
}

interface DiaryEntry {
  id: string;
  characterId: string;
  date: string;
  content: string;
  mood: string;
  imageUrl: string | null;
  likes: number;
  createdAt: string;
  character: DiaryCharacter;
  isLiked: boolean;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/* ── mood マップ ── */
const MOOD_EMOJI: Record<string, string> = {
  happy:      '😊',
  sad:        '😢',
  excited:    '🔥',
  tired:      '😴',
  neutral:    '😐',
  angry:      '😤',
  love:       '💕',
  mysterious: '🌙',
  nostalgic:  '🌸',
};

const MOOD_LABEL: Record<string, string> = {
  happy:      'ハッピー',
  sad:        '悲しい',
  excited:    '興奮',
  tired:      '疲れた',
  neutral:    '普通',
  angry:      '怒り',
  love:       '愛情',
  mysterious: '神秘的',
  nostalgic:  'ノスタルジー',
};

/* ── キャラのテーマカラー（franchise 別） ── */
const FRANCHISE_COLOR: Record<string, { bg: string; border: string; accent: string }> = {
  'ONE PIECE':    { bg: 'rgba(249,115,22,0.08)',  border: 'rgba(249,115,22,0.3)',  accent: '#fb923c' },
  '呪術廻戦':     { bg: 'rgba(99,102,241,0.08)',  border: 'rgba(99,102,241,0.3)',  accent: '#818cf8' },
  '鬼滅の刃':     { bg: 'rgba(236,72,153,0.08)',  border: 'rgba(236,72,153,0.3)',  accent: '#f472b6' },
  'ドラゴンボール':{ bg: 'rgba(234,179,8,0.08)',   border: 'rgba(234,179,8,0.3)',   accent: '#facc15' },
  'NARUTO':       { bg: 'rgba(249,115,22,0.08)',  border: 'rgba(249,115,22,0.25)', accent: '#fb923c' },
  '進撃の巨人':   { bg: 'rgba(107,114,128,0.08)', border: 'rgba(107,114,128,0.3)', accent: '#9ca3af' },
};
const DEFAULT_THEME = { bg: 'rgba(139,92,246,0.08)', border: 'rgba(139,92,246,0.3)', accent: '#a78bfa' };

function getTheme(franchise: string) {
  return FRANCHISE_COLOR[franchise] ?? DEFAULT_THEME;
}

/* ── 日付フォーマット ── */
function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
}

/* ── ハートアニメーション ── */
function HeartBurst({ x, y }: { x: number; y: number }) {
  return (
    <div
      className="pointer-events-none fixed z-50 text-pink-400 text-2xl animate-ping"
      style={{ left: x - 12, top: y - 12, animationDuration: '0.6s', animationIterationCount: 1 }}
    >
      ❤️
    </div>
  );
}

/* ── いいねボタン ── */
function LikeButton({
  diaryId,
  characterId,
  initialLikes,
  initialLiked,
}: {
  diaryId: string;
  characterId: string;
  initialLikes: number;
  initialLiked: boolean;
}) {
  const [liked, setLiked] = useState(initialLiked);
  const [likes, setLikes] = useState(initialLikes);
  const [loading, setLoading] = useState(false);
  const [burst, setBurst] = useState<{ x: number; y: number } | null>(null);

  const handleLike = useCallback(async (e: React.MouseEvent<HTMLButtonElement>) => {
    if (loading) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setLoading(true);
    try {
      const res = await fetch(`/api/diary/${characterId}/${diaryId}/like`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json() as { liked: boolean; likes: number };
        setLiked(data.liked);
        setLikes(data.likes);
        if (data.liked) {
          setBurst({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
          setTimeout(() => setBurst(null), 700);
        }
      }
    } catch {/* ignore */} finally {
      setLoading(false);
    }
  }, [loading, diaryId, characterId]);

  return (
    <>
      {burst && <HeartBurst x={burst.x} y={burst.y} />}
      <button
        onClick={handleLike}
        disabled={loading}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-200 active:scale-95"
        style={{
          background: liked ? 'rgba(236,72,153,0.2)' : 'rgba(255,255,255,0.06)',
          border: liked ? '1px solid rgba(236,72,153,0.5)' : '1px solid rgba(255,255,255,0.12)',
          color: liked ? '#f472b6' : 'rgba(255,255,255,0.5)',
          transform: loading ? 'scale(0.95)' : 'scale(1)',
        }}
      >
        <span
          style={{
            display: 'inline-block',
            transform: liked ? 'scale(1.3)' : 'scale(1)',
            transition: 'transform 0.2s cubic-bezier(0.34,1.56,0.64,1)',
          }}
        >
          {liked ? '❤️' : '🤍'}
        </span>
        <span>{likes}</span>
      </button>
    </>
  );
}

/* ── 日記カード ── */
function DiaryCard({ entry, onClick }: { entry: DiaryEntry; onClick: () => void }) {
  const theme = getTheme(entry.character.franchise);
  const moodEmoji = MOOD_EMOJI[entry.mood] ?? '📝';
  const moodLabel = MOOD_LABEL[entry.mood] ?? entry.mood;

  return (
    <article
      className="relative rounded-2xl overflow-hidden cursor-pointer active:scale-[0.99] transition-all duration-200"
      style={{
        background: theme.bg,
        border: `1px solid ${theme.border}`,
        boxShadow: '0 2px 16px rgba(0,0,0,0.25)',
        // ノート罫線背景（手書き風）
        backgroundImage: `${theme.bg}, repeating-linear-gradient(transparent, transparent 27px, rgba(255,255,255,0.04) 27px, rgba(255,255,255,0.04) 28px)`,
      }}
      onClick={onClick}
    >
      {/* 左の色帯 */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl"
        style={{ background: theme.accent }}
      />

      <div className="pl-4 pr-4 pt-4 pb-3">
        {/* キャラヘッダー */}
        <div className="flex items-center gap-3 mb-3">
          {entry.character.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={entry.character.avatarUrl}
              alt={entry.character.name}
              className="w-10 h-10 rounded-full object-cover flex-shrink-0"
              style={{ boxShadow: `0 0 0 2px ${theme.accent}60, 0 2px 8px rgba(0,0,0,0.4)` }}
            />
          ) : (
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
              style={{ background: theme.accent }}
            >
              {entry.character.name.charAt(0)}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-sm leading-tight">{entry.character.name}</p>
            <p className="text-white/40 text-[10px] mt-0.5">{formatDate(entry.date)}</p>
          </div>
          {/* mood badge */}
          <div
            className="flex-shrink-0 flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.7)',
            }}
          >
            <span>{moodEmoji}</span>
            <span>{moodLabel}</span>
          </div>
        </div>

        {/* 日記本文（手書き風フォント） */}
        <div
          className="text-white/85 text-sm leading-relaxed mb-3"
          style={{ fontFamily: '"Hiragino Maru Gothic ProN", "Rounded Mplus 1c", cursive, sans-serif' }}
        >
          <p className="line-clamp-4">{entry.content}</p>
        </div>

        {/* 画像（あれば） */}
        {entry.imageUrl && (
          <div className="mb-3 rounded-xl overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={entry.imageUrl}
              alt="日記の挿絵"
              className="w-full max-h-48 object-cover"
            />
          </div>
        )}

        {/* フッター: いいね + チャットへ */}
        <div className="flex items-center justify-between">
          <LikeButton
            diaryId={entry.id}
            characterId={entry.characterId}
            initialLikes={entry.likes}
            initialLiked={entry.isLiked}
          />
          <span
            className="text-[10px] font-medium"
            style={{ color: theme.accent }}
          >
            続きを読む →
          </span>
        </div>
      </div>
    </article>
  );
}

/* ── ローディングスケルトン ── */
function DiaryCardSkeleton() {
  return (
    <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-white/8 animate-pulse flex-shrink-0" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3.5 bg-white/8 rounded-full animate-pulse w-24" />
          <div className="h-2.5 bg-white/5 rounded-full animate-pulse w-32" />
        </div>
        <div className="w-16 h-6 bg-white/5 rounded-full animate-pulse" />
      </div>
      <div className="space-y-2 mb-3">
        <div className="h-3 bg-white/6 rounded-full animate-pulse" />
        <div className="h-3 bg-white/6 rounded-full animate-pulse w-5/6" />
        <div className="h-3 bg-white/6 rounded-full animate-pulse w-4/6" />
      </div>
      <div className="flex justify-between">
        <div className="w-16 h-7 bg-white/5 rounded-full animate-pulse" />
        <div className="w-20 h-4 bg-white/4 rounded-full animate-pulse" />
      </div>
    </div>
  );
}

/* ── メインページ ── */
export default function DiaryPage() {
  const { status } = useSession();
  const router = useRouter();
  const [diaries, setDiaries] = useState<DiaryEntry[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const loaderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status, router]);

  const fetchDiaries = useCallback(async (page: number, append = false) => {
    if (!append) setIsLoading(true);
    else setIsFetchingMore(true);
    try {
      const res = await fetch(`/api/diary?page=${page}&limit=15`);
      if (!res.ok) throw new Error('fetch failed');
      const data = await res.json() as { diaries: DiaryEntry[]; pagination: Pagination };
      setDiaries(prev => append ? [...prev, ...data.diaries] : data.diaries);
      setPagination(data.pagination);
      setCurrentPage(page);
    } catch {/* ignore */} finally {
      setIsLoading(false);
      setIsFetchingMore(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'authenticated') fetchDiaries(1);
  }, [status, fetchDiaries]);

  // 無限スクロール
  useEffect(() => {
    if (!pagination) return;
    const el = loaderRef.current;
    if (!el) return;
    const obs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !isFetchingMore && currentPage < pagination.totalPages) {
        fetchDiaries(currentPage + 1, true);
      }
    }, { rootMargin: '200px' });
    obs.observe(el);
    return () => obs.disconnect();
  }, [pagination, isFetchingMore, currentPage, fetchDiaries]);

  const handleCardClick = (entry: DiaryEntry) => {
    router.push(`/diary/${entry.character.slug}`);
  };

  return (
    <>
      <style>{`
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .diary-card-enter {
          animation: fadeSlideUp 0.45s cubic-bezier(0.22,1,0.36,1) forwards;
        }
      `}</style>

      <div className="min-h-screen bg-gray-950 pb-28">
        {/* 背景ブロブ */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-32 -left-16 w-80 h-80 rounded-full bg-purple-600/10 blur-3xl" />
          <div className="absolute top-1/2 right-0 w-64 h-64 rounded-full bg-pink-600/8 blur-3xl" />
        </div>

        {/* ヘッダー */}
        <header
          className="sticky top-0 z-30 border-b border-white/6"
          style={{ background: 'rgba(3,7,18,0.95)', backdropFilter: 'blur(12px)' }}
        >
          <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-white/60 hover:text-white hover:bg-white/8 transition-all"
            >
              ←
            </button>
            <div>
              <h1 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                📔 キャラ日記
              </h1>
              {pagination && (
                <p className="text-white/35 text-xs">
                  全{pagination.total}件
                </p>
              )}
            </div>
          </div>
        </header>

        <main className="relative z-10 max-w-lg mx-auto px-4 py-5">
          {/* ローディング */}
          {isLoading && (
            <div className="space-y-4">
              {[0, 1, 2, 3, 4].map((i) => (
                <DiaryCardSkeleton key={i} />
              ))}
            </div>
          )}

          {/* 空状態 */}
          {!isLoading && diaries.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="text-5xl mb-4">📔</div>
              <h2 className="text-white font-bold text-lg mb-2">
                キャラクターたちの日記がここに表示されます
              </h2>
              <p className="text-white/40 text-sm leading-relaxed">
                キャラクターたちが日記を書くと<br />ここに表示されます。<br />推しをフォローして日記を待とう！
              </p>
              <button
                onClick={() => router.push('/explore')}
                className="mt-6 px-6 py-3 rounded-full text-white font-bold text-sm"
                style={{
                  background: 'linear-gradient(135deg, rgba(139,92,246,0.9), rgba(236,72,153,0.9))',
                  boxShadow: '0 4px 16px rgba(139,92,246,0.4)',
                }}
              >
                推しを探す →
              </button>
            </div>
          )}

          {/* 日記タイムライン */}
          {!isLoading && diaries.length > 0 && (
            <div className="space-y-4">
              {/* 日付ヘッダー付きタイムライン */}
              {diaries.map((entry, i) => {
                const prevDate = i > 0 ? diaries[i - 1].date : null;
                const showDateHeader = entry.date !== prevDate;
                return (
                  <div
                    key={entry.id}
                    className="diary-card-enter"
                    style={{ animationDelay: `${Math.min(i, 5) * 60}ms` }}
                  >
                    {showDateHeader && (
                      <div className="flex items-center gap-3 mb-3 mt-2">
                        <div className="flex-1 h-px bg-white/8" />
                        <span
                          className="text-[10px] font-semibold px-3 py-1 rounded-full"
                          style={{
                            background: 'rgba(255,255,255,0.05)',
                            color: 'rgba(255,255,255,0.4)',
                            border: '1px solid rgba(255,255,255,0.08)',
                          }}
                        >
                          {formatDate(entry.date)}
                        </span>
                        <div className="flex-1 h-px bg-white/8" />
                      </div>
                    )}
                    <DiaryCard entry={entry} onClick={() => handleCardClick(entry)} />
                  </div>
                );
              })}

              {/* 追加ロード */}
              <div ref={loaderRef} className="py-4 flex justify-center">
                {isFetchingMore && (
                  <div className="flex items-center gap-2 text-white/30 text-sm">
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white/50 rounded-full animate-spin" />
                    読み込み中...
                  </div>
                )}
                {!isFetchingMore && pagination && currentPage >= pagination.totalPages && diaries.length > 0 && (
                  <p className="text-white/20 text-xs">すべての日記を表示しました</p>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
