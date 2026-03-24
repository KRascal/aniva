'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

// ── 型定義 ──
interface PollChoice {
  id: string;
  text: string;
  voteCount: number;
  percentage: number;
}

interface PollCharacter {
  id: string;
  name: string;
  slug: string;
  avatarUrl: string | null;
  franchise: string;
}

interface Poll {
  id: string;
  characterId: string;
  title: string;
  description: string | null;
  choices: PollChoice[];
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  isExpired?: boolean;
  remainingHours: number;
  myVote: string | null;
  totalVotes: number;
  resultChoiceId: string | null;
  character: PollCharacter;
}

// ── カウントダウン ──
function useCountdown(endsAt: string): { label: string; isExpired: boolean; isUrgent: boolean } {
  const [state, setState] = useState({ label: '', isExpired: false, isUrgent: false });

  useEffect(() => {
    function update() {
      const diff = new Date(endsAt).getTime() - Date.now();
      if (diff <= 0) {
        setState({ label: '投票終了', isExpired: true, isUrgent: false });
        return;
      }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      const urgent = diff < 6 * 3600000;

      let label: string;
      if (d > 0) {
        label = `${d}日 ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
      } else {
        label = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
      }
      setState({ label, isExpired: false, isUrgent: urgent });
    }
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [endsAt]);

  return state;
}

// ── 投票数バー ──
function VoteBar({ choice, isWinner }: { choice: PollChoice; isWinner?: boolean }) {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setWidth(choice.percentage), 50);
    return () => clearTimeout(timer);
  }, [choice.percentage]);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className={`font-medium ${isWinner ? 'text-yellow-300' : 'text-white/70'}`}>
          {isWinner && '🏆 '}
          {choice.text}
        </span>
        <span className={`font-bold ${isWinner ? 'text-yellow-300' : 'text-white/50'}`}>
          {choice.percentage}%
        </span>
      </div>
      <div
        className="relative h-2 rounded-full overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.08)' }}
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${width}%`,
            background: isWinner
              ? 'linear-gradient(90deg, #f59e0b, #fbbf24)'
              : 'linear-gradient(90deg, rgba(139,92,246,0.8), rgba(236,72,153,0.8))',
          }}
        />
      </div>
      <p className="text-[10px] text-white/35">{choice.voteCount.toLocaleString()}票</p>
    </div>
  );
}

// ── 投票カード ──
function PollCard({
  poll,
  onVoted,
}: {
  poll: Poll;
  onVoted: (pollId: string, choiceId: string, choices: PollChoice[], totalVotes: number) => void;
}) {
  const countdown = useCountdown(poll.endsAt);
  const isExpired = countdown.isExpired;
  const hasVoted = !!poll.myVote;
  const [voting, setVoting] = useState<string | null>(null);
  const isUrgent = countdown.isUrgent;

  const handleVote = async (choiceId: string) => {
    if (hasVoted || isExpired || voting) return;
    setVoting(choiceId);
    try {
      const res = await fetch(`/api/polls/${poll.id}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ choiceId }),
      });
      if (res.ok) {
        const data = await res.json();
        onVoted(poll.id, choiceId, data.choices, data.totalVotes);
      }
    } catch {
      // ignore
    } finally {
      setVoting(null);
    }
  };

  const showResults = hasVoted || isExpired;
  const winnerChoiceId = isExpired
    ? (poll.resultChoiceId ?? poll.choices.reduce((a, b) => (b.voteCount > a.voteCount ? b : a), poll.choices[0])?.id)
    : null;

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: isExpired
          ? 'rgba(255,255,255,0.04)'
          : 'linear-gradient(135deg, rgba(139,92,246,0.1), rgba(236,72,153,0.08))',
        border: isExpired
          ? '1px solid rgba(255,255,255,0.08)'
          : isUrgent
          ? '1px solid rgba(239,68,68,0.4)'
          : '1px solid rgba(139,92,246,0.25)',
        boxShadow: isExpired
          ? 'none'
          : '0 2px 20px rgba(139,92,246,0.1)',
      }}
    >
      {/* ヘッダー */}
      <div className="px-4 pt-4 pb-3 flex items-start gap-3">
        {/* キャラアバター */}
        <div className="flex-shrink-0">
          {poll.character.avatarUrl ? (
            <img
              src={poll.character.avatarUrl}
              alt={poll.character.name}
              className="w-12 h-12 rounded-full object-cover"
              style={{ boxShadow: '0 0 0 2px rgba(139,92,246,0.4)' }}
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-white font-bold text-base">
              {poll.character.name.charAt(0)}
            </div>
          )}
        </div>

        {/* タイトルエリア */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <span className="text-[10px] font-bold text-purple-300/80 tracking-widest uppercase">
              {poll.character.franchise}
            </span>
            {isExpired ? (
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-gray-700/50 text-gray-400 font-medium border border-gray-600/30">
                投票終了
              </span>
            ) : isUrgent ? (
              <span className="text-xs px-1.5 py-0.5 rounded-full font-bold"
                style={{ background: 'rgba(239,68,68,0.2)', color: 'rgba(252,165,165,0.9)', border: '1px solid rgba(239,68,68,0.3)' }}
              >
                🔥 まもなく終了
              </span>
            ) : (
              <span className="text-xs px-1.5 py-0.5 rounded-full font-bold"
                style={{ background: 'rgba(139,92,246,0.2)', color: 'rgba(196,181,253,0.9)', border: '1px solid rgba(139,92,246,0.25)' }}
              >
                🗳 投票受付中
              </span>
            )}
          </div>
          <p className="text-white font-bold text-sm leading-tight">{poll.title}</p>
          {poll.description && (
            <p className="text-white/50 text-xs mt-1 leading-relaxed">{poll.description}</p>
          )}
        </div>
      </div>

      {/* カウントダウンタイマー */}
      <div className="px-4 pb-3">
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${
          isExpired
            ? 'bg-gray-900/50 border-gray-700/30 text-gray-500'
            : isUrgent
              ? 'bg-red-950/40 border-red-700/40 text-red-400'
              : 'bg-purple-950/30 border-purple-700/30 text-purple-300'
        }`}>
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span className="font-mono text-sm font-bold tracking-wider">{countdown.label}</span>
        </div>
        <p className="text-[10px] text-white/30 mt-1.5">
          合計 {poll.totalVotes.toLocaleString()}票
        </p>
      </div>

      {/* 選択肢 */}
      <div className="px-4 pb-4 space-y-3">
        {showResults ? (
          /* 結果表示モード */
          <div className="space-y-3 pt-1">
            {poll.choices.map((choice) => (
              <div key={choice.id}>
                <VoteBar
                  choice={choice}
                  isWinner={choice.id === winnerChoiceId}
                />
                {/* 自分の投票マーク */}
                {poll.myVote === choice.id && (
                  <p className="text-[10px] text-purple-400 mt-0.5">✓ あなたの選択</p>
                )}
              </div>
            ))}
            {isExpired && winnerChoiceId && (
              <div
                className="mt-3 px-3 py-2 rounded-xl text-center text-xs font-bold"
                style={{
                  background: 'rgba(251,191,36,0.12)',
                  border: '1px solid rgba(251,191,36,0.25)',
                  color: 'rgba(253,224,71,0.9)',
                }}
              >
                🏆 決定！「{poll.choices.find(c => c.id === winnerChoiceId)?.text}」
              </div>
            )}
          </div>
        ) : (
          /* 投票ボタンモード */
          <div className="space-y-2 pt-1">
            {poll.choices.map((choice) => (
              <button
                key={choice.id}
                onClick={() => handleVote(choice.id)}
                disabled={!!voting}
                className="w-full text-left px-4 py-3 rounded-xl font-medium text-sm transition-all active:scale-[0.98] disabled:opacity-60"
                style={{
                  background: voting === choice.id
                    ? 'linear-gradient(135deg, rgba(139,92,246,0.6), rgba(236,72,153,0.6))'
                    : 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.85)',
                  cursor: voting ? 'wait' : 'pointer',
                }}
                onMouseEnter={(e) => {
                  if (!voting) {
                    (e.currentTarget as HTMLButtonElement).style.background = 'rgba(139,92,246,0.2)';
                    (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(139,92,246,0.4)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!voting) {
                    (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.06)';
                    (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.1)';
                  }
                }}
              >
                {voting === choice.id ? '投票中…' : choice.text}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 投票者数フッター */}
      <div
        className="px-4 py-2 border-t text-[10px] text-center"
        style={{
          borderColor: 'rgba(255,255,255,0.06)',
          color: 'rgba(255,255,255,0.3)',
        }}
      >
        {poll.character.name} の未来はあなたが決める
      </div>
    </div>
  );
}

// ── Fade-in hook ──
function useFadeIn() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.05 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, visible };
}

function FadeSection({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const { ref, visible } = useFadeIn();
  return (
    <div
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(24px)',
        transition: `opacity 0.5s ease ${delay}ms, transform 0.5s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

// ── メインページ ──
export default function PollsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    fetch('/api/polls/active')
      .then((r) => r.json())
      .then((data) => {
        setPolls(data.polls ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [status]);

  const handleVoted = useCallback(
    (pollId: string, choiceId: string, choices: PollChoice[], totalVotes: number) => {
      setPolls((prev) =>
        prev.map((p) =>
          p.id === pollId ? { ...p, myVote: choiceId, choices, totalVotes } : p
        )
      );
    },
    []
  );

  const activePolls = polls.filter((p) => !p.isExpired && new Date(p.endsAt).getTime() > Date.now());
  const expiredPolls = polls.filter((p) => p.isExpired || new Date(p.endsAt).getTime() <= Date.now());

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-950 pb-24">
        <div className="max-w-lg mx-auto px-4 pt-6 space-y-4">
          <div className="h-8 w-48 bg-white/8 rounded-full animate-pulse" />
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-56 rounded-2xl bg-white/5 animate-pulse" style={{ animationDelay: `${i * 100}ms` }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 pb-24">
      {/* 背景blur */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-20 w-96 h-96 rounded-full bg-purple-600/10 blur-3xl" />
        <div className="absolute top-1/2 right-0 w-72 h-72 rounded-full bg-pink-600/8 blur-3xl" />
      </div>

      {/* ヘッダー */}
      <header className="sticky top-0 z-30 border-b border-white/5" style={{ background: 'rgb(3,7,18)' }}>
        <div className="max-w-lg mx-auto px-4 pt-4 pb-4 flex items-center gap-3">
          <button onClick={() => router.back()} className="text-white/60 hover:text-white transition-colors p-1">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', boxShadow: '0 2px 12px rgba(139,92,246,0.5)' }}
          >
            🗳
          </div>
          <div>
            <h1 className="text-white font-black text-base leading-tight">ストーリー投票</h1>
            <p className="text-white/40 text-[10px]">推しの未来をあなたが決める</p>
          </div>
          {activePolls.length > 0 && (
            <div className="ml-auto flex-shrink-0">
              <span
                className="text-xs px-2.5 py-1 rounded-full font-bold"
                style={{
                  background: 'linear-gradient(135deg, rgba(139,92,246,0.3), rgba(236,72,153,0.3))',
                  color: 'rgba(216,180,254,0.9)',
                  border: '1px solid rgba(139,92,246,0.3)',
                }}
              >
                {activePolls.length}件受付中
              </span>
            </div>
          )}
        </div>
      </header>

      <main className="relative z-10 max-w-lg mx-auto px-4 py-5 space-y-6">
        {/* アクティブ投票 */}
        {activePolls.length > 0 ? (
          <FadeSection>
            <div>
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-white font-bold text-base">🗳 投票受付中</h2>
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                  style={{
                    background: 'rgba(139,92,246,0.2)',
                    color: 'rgba(196,181,253,0.9)',
                    border: '1px solid rgba(139,92,246,0.25)',
                  }}
                >
                  {activePolls.length}件
                </span>
              </div>
              <div className="space-y-4">
                {activePolls.map((poll, i) => (
                  <FadeSection key={poll.id} delay={i * 60}>
                    <PollCard poll={poll} onVoted={handleVoted} />
                  </FadeSection>
                ))}
              </div>
            </div>
          </FadeSection>
        ) : (
          <FadeSection>
            <div
              className="rounded-2xl px-6 py-10 text-center"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <div className="text-5xl mb-4">🗳️</div>
              <p className="text-white/70 font-bold text-base mb-1">現在受付中の投票はありません</p>
              <p className="text-white/35 text-sm">次の投票をお楽しみに！</p>
            </div>
          </FadeSection>
        )}

        {/* 終了済み投票 */}
        {expiredPolls.length > 0 && (
          <FadeSection delay={200}>
            <div>
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-white/70 font-bold text-base">📋 終了した投票</h2>
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    color: 'rgba(255,255,255,0.4)',
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}
                >
                  {expiredPolls.length}件
                </span>
              </div>
              <div className="space-y-4">
                {expiredPolls.map((poll, i) => (
                  <FadeSection key={poll.id} delay={i * 60}>
                    <PollCard
                      poll={{ ...poll, isExpired: true }}
                      onVoted={handleVoted}
                    />
                  </FadeSection>
                ))}
              </div>
            </div>
          </FadeSection>
        )}

        {/* 説明 */}
        <FadeSection delay={300}>
          <div
            className="rounded-2xl px-4 py-4 text-xs text-white/35 leading-relaxed text-center"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
          >
            <p>🌟 投票結果はストーリーの展開に反映されます</p>
            <p className="mt-1">みんなの声で推しの未来を一緒に作ろう！</p>
          </div>
        </FadeSection>
      </main>
    </div>
  );
}
