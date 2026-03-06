'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

// ─── 型定義 ───────────────────────────────────────────────────

interface PollChoice {
  id: string;
  text: string;
  voteCount: number;
  percentage: number;
}

interface ActivePoll {
  id: string;
  characterId: string;
  title: string;
  description: string | null;
  choices: PollChoice[];
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  remainingHours: number;
  myVote: string | null;
  totalVotes: number;
  character: {
    id: string;
    name: string;
    slug: string;
    avatarUrl: string | null;
    franchise: string;
  };
}

interface StoryCharacter {
  id: string;
  name: string;
  slug: string;
  franchise: string;
  avatarUrl: string | null;
  catchphrase: string | null;
  totalChapters: number;
  completedChapters: number;
  userLevel: number;
}

// ─── カウントダウンフック ──────────────────────────────────────

function useCountdown(endsAt: string): string {
  const [label, setLabel] = useState('');

  useEffect(() => {
    function update() {
      const diff = new Date(endsAt).getTime() - Date.now();
      if (diff <= 0) {
        setLabel('終了');
        return;
      }
      const totalSecs = Math.floor(diff / 1000);
      const days = Math.floor(totalSecs / 86400);
      const hours = Math.floor((totalSecs % 86400) / 3600);
      const mins = Math.floor((totalSecs % 3600) / 60);
      const secs = totalSecs % 60;
      if (days > 0) {
        setLabel(`残り${days}日${hours}時間`);
      } else if (hours > 0) {
        setLabel(`残り${hours}時間${mins}分`);
      } else if (mins > 0) {
        setLabel(`残り${mins}分${secs}秒`);
      } else {
        setLabel(`残り${secs}秒！`);
      }
    }
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [endsAt]);

  return label;
}

// ─── 投票カード ───────────────────────────────────────────────

function PollCard({
  poll,
  onVote,
}: {
  poll: ActivePoll;
  onVote: (pollId: string, choiceId: string, updatedChoices: PollChoice[], totalVotes: number, myVote: string) => void;
}) {
  const countdown = useCountdown(poll.endsAt);
  const [voting, setVoting] = useState(false);
  const [optimisticVote, setOptimisticVote] = useState<string | null>(poll.myVote);
  const isUrgent = poll.remainingHours <= 6;
  const hasVoted = optimisticVote !== null;

  const handleVote = useCallback(
    async (choiceId: string) => {
      if (voting) return;
      setVoting(true);
      setOptimisticVote(choiceId);
      try {
        const res = await fetch(`/api/polls/${poll.id}/vote`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ choiceId }),
        });
        if (!res.ok) throw new Error('vote failed');
        const data = await res.json();
        onVote(poll.id, choiceId, data.choices, data.totalVotes, choiceId);
      } catch {
        setOptimisticVote(poll.myVote);
      } finally {
        setVoting(false);
      }
    },
    [poll.id, poll.myVote, voting, onVote],
  );

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: isUrgent
          ? 'linear-gradient(135deg, rgba(239,68,68,0.1), rgba(88,28,135,0.15))'
          : 'linear-gradient(135deg, rgba(88,28,135,0.15), rgba(30,27,75,0.2))',
        border: isUrgent
          ? '1px solid rgba(239,68,68,0.3)'
          : '1px solid rgba(139,92,246,0.25)',
        boxShadow: isUrgent
          ? '0 4px 24px rgba(239,68,68,0.12)'
          : '0 4px 24px rgba(139,92,246,0.12)',
      }}
    >
      {/* キャラ情報ヘッダー */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        {poll.character.avatarUrl ? (
          <img
            src={poll.character.avatarUrl}
            alt={poll.character.name}
            className="w-10 h-10 rounded-full object-cover flex-shrink-0"
            style={{ boxShadow: '0 0 0 2px rgba(139,92,246,0.5)' }}
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            {poll.character.name.charAt(0)}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-white font-bold text-sm">{poll.character.name}</span>
            <span
              className="text-[9px] px-2 py-0.5 rounded-full font-bold"
              style={{ background: 'rgba(139,92,246,0.2)', color: 'rgba(196,181,254,0.9)', border: '1px solid rgba(139,92,246,0.3)' }}
            >
              {poll.character.franchise}
            </span>
          </div>
          {/* カウントダウン */}
          <div className={`flex items-center gap-1 mt-0.5 text-xs font-semibold ${isUrgent ? 'text-red-400' : 'text-purple-400'}`}>
            <span>⏰</span>
            <span>{countdown}</span>
            {isUrgent && <span className="text-red-300 font-bold">🔥</span>}
          </div>
        </div>
        <div className="text-gray-500 text-xs flex-shrink-0">
          {poll.totalVotes.toLocaleString()}票
        </div>
      </div>

      {/* タイトル・説明 */}
      <div className="px-4 mb-4">
        <h3 className="text-white font-bold text-base leading-tight mb-1">{poll.title}</h3>
        {poll.description && (
          <p className="text-gray-400 text-xs leading-relaxed">{poll.description}</p>
        )}
      </div>

      {/* 選択肢 */}
      <div className="px-4 pb-4 space-y-2.5">
        {poll.choices.map((choice) => {
          const isMyChoice = optimisticVote === choice.id;
          const showResult = hasVoted;

          return (
            <div key={choice.id}>
              <button
                onClick={() => !hasVoted && handleVote(choice.id)}
                disabled={voting || hasVoted}
                className={`w-full text-left rounded-xl overflow-hidden transition-all duration-200 active:scale-[0.99] ${
                  hasVoted ? 'cursor-default' : 'hover:scale-[1.01]'
                }`}
                style={{
                  border: isMyChoice
                    ? '1.5px solid rgba(139,92,246,0.8)'
                    : showResult
                    ? '1px solid rgba(255,255,255,0.08)'
                    : '1px solid rgba(255,255,255,0.12)',
                  background: isMyChoice
                    ? 'rgba(139,92,246,0.15)'
                    : showResult
                    ? 'rgba(255,255,255,0.03)'
                    : 'rgba(255,255,255,0.06)',
                }}
              >
                {/* 投票バー（投票後表示） */}
                {showResult && (
                  <div
                    className="absolute top-0 left-0 h-full rounded-xl transition-all duration-700"
                    style={{
                      width: `${choice.percentage}%`,
                      background: isMyChoice
                        ? 'linear-gradient(90deg, rgba(139,92,246,0.3), rgba(236,72,153,0.2))'
                        : 'rgba(255,255,255,0.04)',
                      pointerEvents: 'none',
                    }}
                  />
                )}

                <div className="relative flex items-center gap-3 px-3 py-3">
                  {/* 選択マーク */}
                  <div
                    className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                      isMyChoice
                        ? 'border-purple-500 bg-purple-500'
                        : 'border-gray-600'
                    }`}
                  >
                    {isMyChoice && <span className="text-white text-[10px]">✓</span>}
                  </div>

                  {/* テキスト */}
                  <span
                    className={`flex-1 text-sm font-medium leading-tight ${
                      isMyChoice ? 'text-white' : 'text-gray-300'
                    }`}
                  >
                    {choice.text}
                  </span>

                  {/* 投票後: パーセンテージ */}
                  {showResult && (
                    <span
                      className={`flex-shrink-0 text-xs font-bold ${
                        isMyChoice ? 'text-purple-300' : 'text-gray-500'
                      }`}
                    >
                      {choice.percentage}%
                    </span>
                  )}
                </div>
              </button>
            </div>
          );
        })}
      </div>

      {/* 投票後メッセージ */}
      {hasVoted && (
        <div
          className="mx-4 mb-4 px-3 py-2 rounded-xl text-center text-xs font-semibold"
          style={{
            background: 'rgba(139,92,246,0.12)',
            border: '1px solid rgba(139,92,246,0.2)',
            color: 'rgba(196,181,254,0.9)',
          }}
        >
          ✨ あなたの一票がストーリーを動かす！
        </div>
      )}
    </div>
  );
}

// ─── ストーリーキャラカード ────────────────────────────────────

function StoryCharacterCard({
  character,
  onClick,
}: {
  character: StoryCharacter;
  onClick: () => void;
}) {
  const { completedChapters, totalChapters } = character;
  const pct = totalChapters > 0 ? Math.round((completedChapters / totalChapters) * 100) : 0;
  const isCompleted = completedChapters >= totalChapters && totalChapters > 0;
  const isStarted = completedChapters > 0;

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-2xl p-4 hover:border-purple-500/40 hover:bg-gray-800/70 transition-all duration-200 active:scale-[0.99]"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
      }}
    >
      <div className="flex items-center gap-4">
        {/* アバター */}
        <div className="relative flex-shrink-0">
          {character.avatarUrl ? (
            <Image
              src={character.avatarUrl}
              alt={character.name}
              width={52}
              height={52}
              className="w-13 h-13 rounded-full object-cover border-2 border-gray-700"
            />
          ) : (
            <div className="w-13 h-13 rounded-full bg-gray-800 border-2 border-gray-700 flex items-center justify-center text-xl">
              📖
            </div>
          )}
          {isCompleted && <span className="absolute -top-1 -right-1 text-sm">⭐</span>}
        </div>

        {/* 情報 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-white font-bold text-base">{character.name}</span>
            <span className="text-xs text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded-md">{character.franchise}</span>
            {isCompleted && <span className="text-xs text-yellow-400 font-bold">COMPLETE</span>}
          </div>
          {character.catchphrase && (
            <p className="text-gray-400 text-xs mb-2 truncate">「{character.catchphrase}」</p>
          )}
          {/* 進捗バー */}
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isCompleted ? 'bg-yellow-400' : isStarted ? 'bg-gradient-to-r from-purple-500 to-pink-500' : 'bg-gray-700'
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-xs text-gray-500 flex-shrink-0">{completedChapters}/{totalChapters}</span>
          </div>
          {!isStarted && (
            <p className="text-gray-600 text-xs mt-1.5">
              {character.userLevel < 2 ? `Lv${character.userLevel} · チャットしてストーリーを解放` : '続きが待っている…'}
            </p>
          )}
        </div>

        <div className="text-gray-600 flex-shrink-0">›</div>
      </div>
    </button>
  );
}

// ─── 進捗サマリー ─────────────────────────────────────────────

function ProgressSummary({ characters }: { characters: StoryCharacter[] }) {
  const totalChapters = characters.reduce((s, c) => s + c.totalChapters, 0);
  const completedChapters = characters.reduce((s, c) => s + c.completedChapters, 0);
  const startedCharacters = characters.filter((c) => c.completedChapters > 0).length;
  const completedCharacters = characters.filter((c) => c.completedChapters > 0 && c.completedChapters >= c.totalChapters).length;
  const pct = totalChapters > 0 ? Math.round((completedChapters / totalChapters) * 100) : 0;

  return (
    <div className="rounded-2xl p-4 mb-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-gray-300 text-sm font-medium">全体の進捗</span>
        <span className="text-purple-400 text-sm font-bold">{pct}%</span>
      </div>
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden mb-3">
        <div
          className="h-full bg-gradient-to-r from-purple-600 to-pink-500 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex gap-4 text-xs text-gray-500 flex-wrap">
        <span>{completedChapters}/{totalChapters} 章 クリア</span>
        <span>{startedCharacters} キャラ 開始済み</span>
        {completedCharacters > 0 && <span className="text-yellow-400">{completedCharacters} キャラ 完了 ⭐</span>}
      </div>
    </div>
  );
}

// ─── メインページ ─────────────────────────────────────────────

export default function StoryIndexPage() {
  const router = useRouter();
  const [characters, setCharacters] = useState<StoryCharacter[]>([]);
  const [polls, setPolls] = useState<ActivePoll[]>([]);
  const [storyLoading, setStoryLoading] = useState(true);
  const [pollsLoading, setPollsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ストーリーキャラ取得
  useEffect(() => {
    fetch('/api/story')
      .then((res) => {
        if (res.status === 401) {
          router.push('/login');
          return null;
        }
        return res.json() as Promise<{ characters: StoryCharacter[] }>;
      })
      .then((data) => {
        if (data) setCharacters(data.characters);
      })
      .catch(() => setError('読み込みに失敗しました'))
      .finally(() => setStoryLoading(false));
  }, [router]);

  // アクティブ投票取得
  useEffect(() => {
    fetch('/api/polls/active')
      .then((r) => {
        if (!r.ok) return null;
        return r.json();
      })
      .then((data) => {
        if (data?.polls) setPolls(data.polls);
      })
      .catch(() => {})
      .finally(() => setPollsLoading(false));
  }, []);

  // 投票後にローカル状態を更新
  const handleVote = useCallback(
    (pollId: string, _choiceId: string, updatedChoices: PollChoice[], totalVotes: number, myVote: string) => {
      setPolls((prev) =>
        prev.map((p) =>
          p.id === pollId ? { ...p, choices: updatedChoices, totalVotes, myVote } : p,
        ),
      );
    },
    [],
  );

  const isLoading = storyLoading || pollsLoading;

  return (
    <div className="min-h-screen" style={{ background: 'rgb(3,7,18)' }}>
      {/* 背景 */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          style={{
            background:
              'radial-gradient(ellipse at top-left, rgba(168,85,247,0.12) 0%, transparent 55%), radial-gradient(ellipse at bottom-right, rgba(236,72,153,0.1) 0%, transparent 50%)',
          }}
          className="absolute inset-0"
        />
      </div>

      {/* ヘッダー */}
      <header className="relative z-10 border-b border-gray-800 sticky top-0" style={{ background: 'rgba(3,7,18,0.95)', backdropFilter: 'blur(12px)' }}>
        <div className="max-w-2xl mx-auto flex items-center gap-3 px-4 py-4">
          <button
            onClick={() => router.back()}
            className="text-gray-400 hover:text-white transition-colors p-1"
            aria-label="戻る"
          >
            ←
          </button>
          <div>
            <h1 className="text-white font-bold text-xl">📖 ストーリー</h1>
            <p className="text-gray-400 text-xs">キャラクターとの物語を解き明かそう</p>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-2xl mx-auto px-4 pb-24">
        {/* ヒーローテキスト */}
        <div
          className="mt-6 mb-6 rounded-3xl overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(88,28,135,0.5), rgba(157,23,77,0.4), rgba(30,27,75,0.6))',
            border: '1px solid rgba(139,92,246,0.3)',
            boxShadow: '0 8px 40px rgba(139,92,246,0.2)',
          }}
        >
          <div className="px-5 py-6">
            <p className="text-purple-300 text-[11px] font-black tracking-widest uppercase mb-2">
              ✦ Interactive Story
            </p>
            <h2 className="text-white font-black text-2xl leading-tight mb-2">
              あなたの選択が<br />ストーリーを変える
            </h2>
            <p className="text-white/60 text-sm leading-relaxed">
              投票に参加して推しの未来を決めよう。
              あなたの一票が物語を動かす。
            </p>
            {polls.length > 0 && (
              <div
                className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-full text-xs font-bold"
                style={{
                  background: 'linear-gradient(135deg, rgba(139,92,246,0.8), rgba(236,72,153,0.8))',
                  boxShadow: '0 2px 12px rgba(139,92,246,0.4)',
                  color: 'white',
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                {polls.length}件の投票受付中！
              </div>
            )}
          </div>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-gray-400 animate-pulse">読み込み中...</div>
          </div>
        )}

        {!isLoading && error && (
          <div className="text-center py-12 text-gray-400">{error}</div>
        )}

        {!isLoading && !error && (
          <>
            {/* ─ 進行中の投票 ─ */}
            <section className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-white font-bold text-lg">🗳 進行中の投票</h2>
                {polls.length > 0 && (
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-bold"
                    style={{
                      background: 'linear-gradient(135deg, rgba(139,92,246,0.3), rgba(236,72,153,0.3))',
                      color: 'rgba(216,180,254,0.9)',
                      border: '1px solid rgba(139,92,246,0.3)',
                    }}
                  >
                    {polls.length}件
                  </span>
                )}
              </div>

              {polls.length === 0 ? (
                <div
                  className="text-center py-8 rounded-2xl"
                  style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <div className="text-3xl mb-2">🗳</div>
                  <p className="text-gray-400 text-sm">現在受付中の投票はありません</p>
                  <p className="text-gray-600 text-xs mt-1">次の投票をお楽しみに！</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {polls.map((poll) => (
                    <PollCard key={poll.id} poll={poll} onVote={handleVote} />
                  ))}
                </div>
              )}
            </section>

            {/* ─ 過去の投票結果 ─ */}
            <section className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-white font-bold text-lg">📜 過去の投票結果</h2>
              </div>
              <div
                className="text-center py-8 rounded-2xl"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <div className="text-3xl mb-2">📜</div>
                <p className="text-gray-400 text-sm">過去の投票結果が蓄積されます</p>
                <p className="text-gray-600 text-xs mt-1">投票に参加すると履歴が残ります</p>
              </div>
            </section>

            {/* ─ キャラクターストーリー ─ */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-white font-bold text-lg">📚 キャラクターストーリー</h2>
              </div>

              {characters.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-4xl mb-3">📖</div>
                  <p className="text-gray-400">ストーリーはまだありません</p>
                  <p className="text-gray-500 text-sm mt-1">キャラクターとチャットしてストーリーを解放しよう</p>
                  <button
                    onClick={() => router.push('/explore')}
                    className="mt-4 px-5 py-2.5 rounded-full text-white text-sm font-bold active:scale-95 transition-all"
                    style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.8), rgba(236,72,153,0.8))' }}
                  >
                    推しを探す →
                  </button>
                </div>
              ) : (
                <>
                  <ProgressSummary characters={characters} />
                  <div className="grid grid-cols-1 gap-3">
                    {characters.map((char) => (
                      <StoryCharacterCard
                        key={char.id}
                        character={char}
                        onClick={() => router.push(`/story/${char.id}`)}
                      />
                    ))}
                  </div>
                </>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
