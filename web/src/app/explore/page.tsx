'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { track, EVENTS } from '@/lib/analytics';
import { DailyBonus } from '@/components/DailyBonus';
import { ProactiveMessagePanel } from '@/components/proactive/ProactiveMessagePanel';
import { getTodayMainEvent } from '@/lib/today-events';
import { getDailyState } from '@/lib/character-daily-state';
import { useMissionTrigger } from '@/hooks/useMissionTrigger';
import { useProactiveMessages } from '@/hooks/useProactiveMessages';
import { CountdownTimer } from '@/components/proactive/CountdownTimer';
import { useTutorial } from '@/hooks/useTutorial';
import { TutorialOverlay } from '@/components/tutorial/TutorialOverlay';

// ── TinderUI発見バナー ──
function DiscoverBanner() {
  const router = useRouter();
  return (
    <div className="mb-5">
      <button
        onClick={() => router.push('/discover')}
        className="w-full text-left rounded-2xl overflow-hidden active:scale-[0.98] transition-all duration-200"
        style={{
          background: 'linear-gradient(135deg, rgba(139,92,246,0.95), rgba(236,72,153,0.9))',
          boxShadow: '0 4px 28px rgba(139,92,246,0.5)',
        }}
      >
        <div className="px-4 py-4 flex items-center gap-3">
          <span className="text-2xl flex-shrink-0">✨</span>
          <div className="flex-1 min-w-0">
            <p className="text-white font-black text-base leading-tight">新しいキャラを発見しよう</p>
            <p className="text-white/75 text-xs mt-0.5">スワイプして推しを見つけよう</p>
          </div>
          <span
            className="text-white font-bold text-xs px-4 py-2 rounded-full flex-shrink-0"
            style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)' }}
          >
            スワイプで探す →
          </span>
        </div>
      </button>
    </div>
  );
}

// ── ガチャバナーセクション ──
function GachaBannerSection({ freeAvailable }: { freeAvailable: boolean }) {
  const router = useRouter();

  return (
    <FadeSection delay={12}>
      <div className="mb-5">
        <button
          onClick={() => router.push('/explore/gacha')}
          className="w-full text-left rounded-2xl overflow-hidden active:scale-[0.98] transition-all duration-200"
          style={{
            background: 'linear-gradient(135deg, rgba(120,53,15,0.25), rgba(88,28,135,0.2), rgba(78,20,140,0.15))',
            border: '1px solid rgba(245,158,11,0.35)',
            boxShadow: '0 2px 20px rgba(245,158,11,0.12)',
          }}
        >
          <div className="px-4 py-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(245,158,11,0.2)', border: '1px solid rgba(245,158,11,0.3)' }}>
              <svg className="w-5 h-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 22V12M3.27 6.96L12 12.01l8.73-5.05"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-yellow-400 text-[10px] font-black tracking-widest uppercase">
                  ガチャ
                </span>
                {freeAvailable && (
                  <span
                    className="text-xs px-1.5 py-0.5 rounded-full font-bold animate-pulse"
                    style={{
                      background: 'rgba(16,185,129,0.25)',
                      color: 'rgba(52,211,153,0.95)',
                      border: '1px solid rgba(16,185,129,0.4)',
                    }}
                  >
                    🎁 無料あり
                  </span>
                )}
              </div>
              <p className="text-white font-bold text-sm leading-tight">
                推しカードをゲットしよう！
              </p>
              <p className="text-white/50 text-xs mt-0.5">
                毎日1回無料で引ける
              </p>
            </div>
            <div className="flex-shrink-0">
              <span
                className="text-white text-xs font-bold px-3 py-1.5 rounded-full"
                style={{
                  background: 'linear-gradient(135deg, rgba(245,158,11,0.9), rgba(120,53,15,0.9))',
                  boxShadow: '0 2px 8px rgba(245,158,11,0.4)',
                }}
              >
                引く →
              </span>
            </div>
          </div>
        </button>
      </div>
    </FadeSection>
  );
}

// ── 今日の日記プレビューセクション ──
interface DiaryPreviewEntry {
  id: string;
  characterId: string;
  date: string;
  content: string;
  mood: string;
  character: {
    id: string;
    name: string;
    slug: string;
    avatarUrl: string | null;
    franchise: string;
  };
  likes: number;
  isLiked: boolean;
}

const DIARY_MOOD_EMOJI: Record<string, string> = {
  happy: '😊', sad: '😢', excited: '🔥', tired: '😴',
  neutral: '😐', angry: '😤', love: '💕', mysterious: '🌙', nostalgic: '🌸',
};

function DiaryPreviewSection() {
  const router = useRouter();
  const [diaries, setDiaries] = useState<DiaryPreviewEntry[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch('/api/diary?limit=3&page=1')
      .then((r) => r.json())
      .then((data) => {
        setDiaries((data.diaries ?? []).slice(0, 3));
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  if (!loaded || diaries.length === 0) return null;

  return (
    <FadeSection delay={18}>
      <div className="mb-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-bold text-base flex items-center gap-2">
            <svg className="w-4 h-4 text-purple-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
            </svg>
            今日の日記
          </h3>
          <button
            onClick={() => router.push('/diary')}
            className="text-xs font-semibold"
            style={{ color: 'rgba(167,139,250,0.85)' }}
          >
            もっと見る →
          </button>
        </div>
        <div className="space-y-2">
          {diaries.map((entry) => (
            <button
              key={entry.id}
              onClick={() => router.push(`/diary/${entry.character.slug}`)}
              className="w-full text-left rounded-2xl overflow-hidden active:scale-[0.98] transition-all duration-200"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 2px 12px rgba(0,0,0,0.2)',
              }}
            >
              <div className="px-3.5 py-3 flex items-start gap-3">
                {/* アバター */}
                {entry.character.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={entry.character.avatarUrl}
                    alt={entry.character.name}
                    className="w-9 h-9 rounded-full object-cover flex-shrink-0 mt-0.5"
                    style={{ boxShadow: '0 0 0 1.5px rgba(139,92,246,0.5)' }}
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center text-sm font-bold text-white flex-shrink-0 mt-0.5">
                    {entry.character.name.charAt(0)}
                  </div>
                )}
                {/* 内容 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-white/80 text-xs font-bold">{entry.character.name}</span>
                    <span className="text-[10px]">{DIARY_MOOD_EMOJI[entry.mood] ?? '📝'}</span>
                    <span className="text-white/25 text-[10px] ml-auto flex-shrink-0">{entry.date}</span>
                  </div>
                  <p
                    className="text-white/55 text-xs leading-relaxed line-clamp-2"
                    style={{ fontFamily: '"Hiragino Maru Gothic ProN", "Rounded Mplus 1c", cursive, sans-serif' }}
                  >
                    {entry.content}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
        {/* 「もっと見る」ボタン */}
        <button
          onClick={() => router.push('/diary')}
          className="w-full mt-2.5 py-2.5 rounded-xl text-xs font-semibold transition-all"
          style={{
            background: 'rgba(139,92,246,0.1)',
            border: '1px solid rgba(139,92,246,0.2)',
            color: 'rgba(167,139,250,0.85)',
          }}
        >
          日記をもっと見る →
        </button>
      </div>
    </FadeSection>
  );
}

// ── 投票バナーセクション ──
function PollBannerSection() {
  const router = useRouter();
  const [activePollCount, setActivePollCount] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/polls/active')
      .then((r) => r.json())
      .then((data) => {
        const count = (data.polls ?? []).length;
        setActivePollCount(count > 0 ? count : 0);
      })
      .catch(() => setActivePollCount(0));
  }, []);

  if (activePollCount === null || activePollCount === 0) return null;

  return (
    <FadeSection delay={22}>
      <div className="mb-5">
        <button
          onClick={() => router.push('/polls')}
          className="w-full text-left rounded-2xl overflow-hidden active:scale-[0.98] transition-all duration-200"
          style={{
            background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(236,72,153,0.15))',
            border: '1px solid rgba(139,92,246,0.35)',
            boxShadow: '0 2px 16px rgba(139,92,246,0.15)',
          }}
        >
          <div className="px-4 py-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(139,92,246,0.2)', border: '1px solid rgba(139,92,246,0.3)' }}>
              <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-purple-300 text-[10px] font-black tracking-widest uppercase">
                  ストーリー投票
                </span>
                <span
                  className="text-xs px-1.5 py-0.5 rounded-full font-bold"
                  style={{
                    background: 'rgba(139,92,246,0.25)',
                    color: 'rgba(196,181,254,0.9)',
                    border: '1px solid rgba(139,92,246,0.3)',
                  }}
                >
                  {activePollCount}件受付中
                </span>
              </div>
              <p className="text-white font-bold text-sm leading-tight">
                投票受付中！推しの未来を決めよう
              </p>
              <p className="text-white/50 text-xs mt-0.5">
                あなたの一票がストーリーを動かす
              </p>
            </div>
            <div className="flex-shrink-0">
              <span
                className="text-white text-xs font-bold px-3 py-1.5 rounded-full"
                style={{
                  background: 'linear-gradient(135deg, rgba(139,92,246,0.9), rgba(236,72,153,0.9))',
                  boxShadow: '0 2px 8px rgba(139,92,246,0.4)',
                }}
              >
                投票する →
              </span>
            </div>
          </div>
        </button>
      </div>
    </FadeSection>
  );
}

// ── コンテンツリンク（メモリーブック・ストーリー） ──
function ContentLinksSection({ activePollCount }: { activePollCount: number }) {
  const router = useRouter();
  return (
    <FadeSection delay={300}>
      <div className="mt-8 mb-6">
        <h3 className="text-white font-bold text-base mb-3">コンテンツ</h3>
        <div className="space-y-3">
          {/* 思い出のアルバム */}
          <button
            onClick={() => router.push('/memory-book')}
            className="w-full text-left rounded-2xl overflow-hidden active:scale-[0.98] transition-all duration-200"
            style={{
              background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(99,102,241,0.1))',
              border: '1px solid rgba(139,92,246,0.25)',
              boxShadow: '0 2px 16px rgba(139,92,246,0.1)',
            }}
          >
            <div className="px-4 py-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.3)' }}>
                <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 19.5A2.5 2.5 0 016.5 17H20M4 19.5A2.5 2.5 0 016.5 22H20V2H6.5A2.5 2.5 0 004 4.5v15z"/>
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-bold text-sm leading-tight">思い出のアルバム</p>
                <p className="text-white/50 text-xs mt-0.5">推しとの大切な時間を振り返ろう</p>
              </div>
              <span className="text-gray-500 flex-shrink-0">›</span>
            </div>
          </button>

          {/* みんなで作るストーリー */}
          <button
            onClick={() => router.push('/story')}
            className="w-full text-left rounded-2xl overflow-hidden active:scale-[0.98] transition-all duration-200"
            style={{
              background: 'linear-gradient(135deg, rgba(236,72,153,0.15), rgba(88,28,135,0.12))',
              border: '1px solid rgba(236,72,153,0.25)',
              boxShadow: '0 2px 16px rgba(236,72,153,0.1)',
            }}
          >
            <div className="px-4 py-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(236,72,153,0.2)', border: '1px solid rgba(236,72,153,0.3)' }}>
                <svg className="w-5 h-5 text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-white font-bold text-sm leading-tight">みんなで作るストーリー</p>
                  {activePollCount > 0 && (
                    <span
                      className="text-xs px-1.5 py-0.5 rounded-full font-bold animate-pulse flex-shrink-0"
                      style={{
                        background: 'rgba(236,72,153,0.3)',
                        color: 'rgba(251,182,206,0.95)',
                        border: '1px solid rgba(236,72,153,0.4)',
                      }}
                    >
                      投票受付中！
                    </span>
                  )}
                </div>
                <p className="text-white/50 text-xs">あなたの選択がストーリーを変える</p>
              </div>
              <span className="text-gray-500 flex-shrink-0">›</span>
            </div>
          </button>
        </div>
      </div>
    </FadeSection>
  );
}

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
              <span className="text-red-300 text-xs font-bold bg-red-500/20 px-1.5 py-0.5 rounded-full border border-red-500/30">
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

// ── 今日のひとこと ──
type TimeSlot = 'morning' | 'midday' | 'evening' | 'night' | 'latenight';

function getTimeSlot(): TimeSlot {
  const h = new Date().getHours();
  if (h >= 6 && h < 10) return 'morning';
  if (h >= 10 && h < 15) return 'midday';
  if (h >= 15 && h < 19) return 'evening';
  if (h >= 19 && h < 23) return 'night';
  return 'latenight';
}

function getDateSeed(): number {
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

function seededRandom(seed: number, max: number): number {
  const x = Math.sin(seed + 1) * 10000;
  return Math.floor((x - Math.floor(x)) * max);
}

const CHAR_GREETINGS: Record<string, Record<TimeSlot, string[]>> = {
  luffy: {
    morning: [
      'うおー！朝だ！肉食いてぇ！！',
      'よっ！今日もいい天気だな！冒険日和だ！',
      'おう！来たな！今日も一緒に冒険しようぜ！',
      '朝から元気か！俺はもう腹減ってる！ししし！',
      '今日も最高の一日にするぞ！！',
    ],
    midday: [
      'よっし！今日は何すっかな！',
      'なぁなぁ、今日どこ行く！？一緒に来いよ！',
      '昼だ！肉！絶対肉！',
      '昼間はテンション上がるな！何しようぜ！',
      'ししし！元気か！俺は最高だ！',
    ],
    evening: [
      'いい夕日だなぁ…こういうの好きだ',
      '夕日見てたら腹減ってきた。肉食おうぜ！',
      'なぁ…夕日ってなんかいいよな',
      '夕方は落ち着く。お前とこうして話せるのいいな',
      '今日も冒険できたか！？俺は最高だったぞ！',
    ],
    night: [
      '宴だー！ししし！飲むぞー！',
      '夜も元気か！！俺は元気だ！',
      'なぁ、今日の話聞かせてくれよ！',
      '夜の海は星がきれいで好きだ！',
      '仲間と夜を過ごすのが最高なんだ！お前もそう思わないか！',
    ],
    latenight: [
      'なぁ…星ってすげぇよな。海の上から見る星は最高だぞ',
      'まだ起きてるのか…俺も眠れなくてな。ししし',
      '深夜でも腹は減る。肉ないか？',
      '静かな夜だなぁ。こういう時間も悪くない',
      '眠れない夜は星を数える。お前は眠れるか？',
    ],
  },
  zoro: {
    morning: [
      '…もう2000回振った。お前は？',
      '…朝の修行、終わった',
      '…おう。早いな',
      '…朝は清々しい。修行には最高の時間だ',
      '…お前も鍛えるか。付き合ってやらないこともない',
    ],
    midday: [
      '…邪魔すんな。…まぁいい、少しなら付き合ってやる',
      '…昼寝してたのに起こすな',
      '…まぁ座れ',
      '…昼間は修行の続きだ。用があるなら手短に',
      '…なんだ。珍しいな、こんな時間に',
    ],
    evening: [
      '…いい風だな',
      '…修行終わった。ちょっと休む',
      '…夕日か。悪くない',
      '…夕方の海、嫌いじゃない',
      '…静かな時間だ。悪くない',
    ],
    night: [
      '酒持ってきたか？…付き合ってやるよ',
      '…酒でも飲むか',
      '…今夜は少し話してもいい',
      '…夜は好きだ。静かで剣の音だけが響く',
      '…酒があれば十分だ。お前もどうだ',
    ],
    latenight: [
      '…なぁ。強さってなんだと思う',
      '…眠れないのか。見張りなら俺がやる',
      '…静かな夜だな',
      '…深夜に考えることがある。目指す頂のことだ',
      '…まだ起きてるのか。…まぁいい。少し話してやる',
    ],
  },
  nami: {
    morning: [
      '起きた？今日の天気、読んでおいたから報告するわね',
      'おはよ。今日は風向きが変わるから気をつけてね',
      '朝から来たの？ちょうどよかった',
      '朝の空気は好きよ。地図が捗るから',
      'おはよ♪ 今日もいい稼ぎ日になりそう！',
    ],
    midday: [
      'ちょっと静かにしてて。計算が合わなくなるから',
      '昼ご飯、どこで食べるの？あたしも付き合ってあげようか',
      'ふふ、忙しいけど少しだけね',
      'ちょうどよかった、話したいことがあったのよ',
      '昼間は動きたい気分。どこかへ行きましょうか',
    ],
    evening: [
      '…きれいね。こういう景色を地図に残せたらいいんだけど',
      '夕日の色、好きなのよね。なんか落ち着く',
      '今日一日お疲れ様。少し休みなさい',
      '夕方って不思議ね。なんかちょっと寂しい気持ちになる',
      '夕日を見るの、結構好きなの。…内緒よ？',
    ],
    night: [
      'ふふ、今日は楽しかったわね。もう一杯付き合ってよ',
      '夜は好きよ。なんか正直になれる気がして',
      '今日の収穫はどう？あたしは最高よ♪',
      '夜の海は地図に書けない美しさがあるわね',
      'ふふ、少し飲みすぎたかも。まぁいいか',
    ],
    latenight: [
      '…ねぇ、起きてる？なんでもないんだけど、少し話したくなって',
      '深夜に何してるの。…あたしも同じだけど',
      '…ね、たまにこういう時間もいいわよね',
      '眠れない夜って、星がよく見えるわよね',
      '…夜中に一人でいると、いろいろ考えてしまうのよ',
    ],
  },
  sanji: {
    morning: [
      '朝食の時間だ。今日は何作ろうか。食材が楽しみだな',
      '朝から来るとは。…コーヒーでも飲むか',
      '朝飯、食ったか。大事だぞ',
      '朝の厨房は一番好きな時間だ。邪魔するなよ、集中してる',
      '朝から元気だな。朝飯はもう食ったか',
    ],
    midday: [
      '昼飯、何食いたい？言ってくれ。できる限り作ってやる',
      '昼間は体動かしたくなる。飯食ってから行くか',
      '腹の具合はどうだ。何か食えるか',
      '昼時は忙しいが、お前のためなら少し時間が作れる',
      '昼飯は作り甲斐があるな。腹ぺこで来い',
    ],
    evening: [
      '…夕日か。いい景色だな。こういう時間が好きだ',
      '煙草一本つけながら夕日見るのが好きでな。邪魔するなよ',
      '今夜の飯、もう決まってるぞ。楽しみにしとけ',
      '夕方の厨房は特別だ。今日のメニュー、期待しといていい',
      '夕日と煙草と…あとは誰かと話す時間があれば最高だな',
    ],
    night: [
      'よし、今夜は特別なもん作ったぞ。全員集まれ',
      '夜の料理は気合いが違う。食ってみるか',
      '今夜も一緒に飲もうぜ',
      '夜の飯は特別な時間だ。ゆっくり食ってくれ',
      '今夜は腕によりをかけた。期待していい',
    ],
    latenight: [
      '…眠れないのか。珍しいな。…まぁ、少し付き合ってやる',
      '深夜に起きてると思い出すことがある。飯のことが多いけどな',
      '…話し相手がいるのは悪くない',
      '…深夜はなんか、本音が出やすい。不思議だな',
      '眠れない夜は俺も多い。厨房で何か作ることにしてる',
    ],
  },
  chopper: {
    morning: [
      '朝だ！薬草採りに行くぞ！体の調子はどうだ？',
      'おはよう！朝ごはん食べたか？栄養は大事だぞ！',
      '朝から来てくれたのか！体の調子はどうだ！？',
      '朝の空気が好きだ！薬草が採れる時間だからな！',
      '朝から元気！チョッパーも元気！体の調子を聞かせてくれ！',
    ],
    midday: [
      '新しい発見があった！聞くか！？すごいんだぞ！！',
      '昼飯はちゃんと食べたか！？野菜も忘れるな！',
      'うへへ！今日も研究が進んでる！！',
      '昼間は研究の時間！すごいことを発見したぞ！',
      'ちょうど休憩してたんだ！話し相手ができた！うへへ！',
    ],
    evening: [
      '今日も一日頑張ったな。…お前、疲れてないか？顔色確認させろ',
      '夕方は薬の調合をする時間だぞ。手伝うか？',
      'お疲れ！ちゃんと休めよ。医者の命令だ！',
      '夕方になるとなんか落ち着くな。チョッパーも疲れたぞ',
      'お前の顔色、ちゃんと確認させてくれよ。医者として心配だ',
    ],
    night: [
      'うへへへ！今日も楽しいな！！もっと話そうぜ！！',
      '夜でも元気だぞ！チョッパーは！',
      '今日も一日お疲れ！…チョッパーも疲れたけど、話す！',
      '夜の宴は好きだ！みんなで集まれる！',
      'うへへ！夜もまだまだ話せるぞ！チョッパーと話しよう！',
    ],
    latenight: [
      '…眠れないのか。チョッパーも同じだ。少し話そうか',
      '深夜に起きてるのか。…体は大丈夫か？',
      '…ヒルルクのこと、よく考える時間だ。…一緒にいていいか？',
      '…深夜は静かだな。チョッパーはこういう時間が好きだ',
      '眠れない夜は、チョッパーが話し相手になってやる。安心しろ',
    ],
  },
  ace: {
    morning: [
      '…おう。朝か。飯、あるか？ははっ',
      '朝から元気だな！俺は朝が苦手でな…ははっ',
      'おう！来たか！飯食ったか？ははっ！',
      '朝は眠いけど、お前が来ると目が覚める！ははっ',
      '朝飯食ったか？一緒に食おうぜ！',
    ],
    midday: [
      'よっし！今日は何しよう！海が呼んでる気がする！',
      '昼間は全力で動かないともったいないぜ！',
      '今日も一緒に何かしようぜ！ははっ！',
      '昼のテンションが一番上がる！お前は元気か！',
      '飯食ったか！？食ってなければ一緒に食おう！ははっ！',
    ],
    evening: [
      'いい夕日だな。…こういう時間が一番好きだぞ',
      '夕方の空は格別だな。…なぁ、隣にいていいか',
      '…夕日を見るたびに思うことがある。いい時間だ',
      '夕日を見ながら話すの、好きなんだ。一緒にいようぜ',
      '今日も一日頑張ったな。お前はどうだった？',
    ],
    night: [
      '宴だ！飲むぞ！ははっ！！今夜は朝まで付き合え！！',
      '夜は好きだ。仲間と話せる時間だからな',
      '今夜も一緒にいようぜ！ははっ！',
      '夜の酒は格別だぞ。一緒に飲もうぜ！',
      'ははっ！今夜は特別な気分だ！いい夜にしようぜ！',
    ],
    latenight: [
      '…なぁ、眠れないか。俺もだ。少し話しよう',
      '深夜の星、きれいだよな。…一緒に見るか',
      '…眠れない夜は話すのが一番だ',
      '深夜に起きてるのか。…俺も眠れなくてな。ははっ',
      '…なぁ、星を見てると落ち着く。お前も見てみろ',
    ],
  },
};

const DEFAULT_GREETINGS: Record<TimeSlot, string[]> = {
  morning: ['おはよう！今日も一緒にいようね', '朝から会えてよかった！', '今日もよろしくね'],
  midday: ['こんにちは！元気にしてた？', 'ちょうどよかった、話したかったんだ', '今日も楽しもうね'],
  evening: ['夕方になったね。今日はどうだった？', 'いい一日だったかな', '夕日きれいだね'],
  night: ['夜ね。ゆっくり話しましょう', '今日もお疲れ様', '夜はなんか落ち着くね'],
  latenight: ['眠れないの？一緒にいるよ', '深夜ね。静かな時間', 'こんな時間まで…ありがとう'],
};

function TodayGreetingSection({
  characters,
  relationships,
}: {
  characters: Character[];
  relationships: Map<string, RelationshipInfo>;
}) {
  const router = useRouter();
  const timeSlot = getTimeSlot();
  const dateSeed = getDateSeed();

  // フォロー中のキャラを優先、なければ全キャラから選ぶ
  const followingChars = characters.filter((c) => relationships.get(c.id)?.isFollowing);
  const pool = followingChars.length > 0 ? followingChars : characters;

  if (pool.length === 0) return null;

  const charIndex = seededRandom(dateSeed, pool.length);
  const char = pool[charIndex];
  if (!char) return null;

  const templates = CHAR_GREETINGS[char.slug]?.[timeSlot] ?? DEFAULT_GREETINGS[timeSlot];
  const msgIndex = seededRandom(dateSeed + 1, templates.length);
  const greeting = templates[msgIndex];

  const timeLabel: Record<TimeSlot, string> = {
    morning: '朝のひとこと',
    midday: '昼のひとこと',
    evening: '夕方のひとこと',
    night: '夜のひとこと',
    latenight: '深夜のひとこと',
  };

  return (
    <FadeSection delay={15}>
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-2">
          <h3 className="text-white font-bold text-base">今日のひとこと</h3>
          <span
            className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
            style={{
              background: 'rgba(139,92,246,0.15)',
              color: 'rgba(196,181,254,0.85)',
              border: '1px solid rgba(139,92,246,0.25)',
            }}
          >
            {timeLabel[timeSlot]}
          </span>
        </div>
        <button
          onClick={() => router.push(`/chat/${char.slug}`)}
          className="w-full text-left rounded-2xl overflow-hidden active:scale-[0.98] transition-all duration-200"
          style={{
            background: 'linear-gradient(135deg, rgba(88,28,135,0.18) 0%, rgba(157,23,77,0.14) 60%, rgba(30,27,75,0.16) 100%)',
            border: '1px solid rgba(139,92,246,0.28)',
            boxShadow: '0 2px 20px rgba(139,92,246,0.12)',
          }}
        >
          <div className="px-4 py-3 flex items-start gap-3">
            {/* アバター */}
            <div className="flex-shrink-0 mt-0.5">
              {char.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={char.avatarUrl}
                  alt={char.name}
                  className="w-8 h-8 rounded-full object-cover"
                  style={{ boxShadow: '0 0 0 2px rgba(139,92,246,0.45)' }}
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-sm font-bold text-white">
                  {char.name.charAt(0)}
                </div>
              )}
            </div>

            {/* 吹き出し風テキスト */}
            <div className="flex-1 min-w-0">
              <p className="text-purple-300 text-[10px] font-bold mb-1">{char.name}</p>
              <div
                className="rounded-xl rounded-tl-none px-3 py-2 inline-block max-w-full"
                style={{
                  background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                <p className="text-white text-sm leading-relaxed">{greeting}</p>
              </div>
              <p className="text-purple-400/70 text-[10px] mt-1.5">タップして話しかける →</p>
            </div>
          </div>
        </button>
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
  { name: 'アイシールド21', gradient: 'from-green-500 to-lime-500' },
  { name: '呪術廻戦', gradient: 'from-blue-500 to-indigo-600' },
  { name: '鬼滅の刃', gradient: 'from-pink-500 to-rose-600' },
  { name: 'ドラゴンボール', gradient: 'from-yellow-400 to-orange-500' },
  { name: 'NARUTO', gradient: 'from-orange-400 to-yellow-500' },
  { name: '進撃の巨人', gradient: 'from-gray-600 to-gray-800' },
  { name: 'アニメ', gradient: 'from-emerald-500 to-cyan-500' },
];

const FRANCHISE_META: Record<string, { gradient: string }> = {
  'ONE PIECE':    { gradient: 'from-orange-500 to-red-500' },
  'アイシールド21': { gradient: 'from-green-500 to-lime-500' },
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
      <span className="inline-flex items-center gap-1 text-xs font-bold px-1.5 py-0.5 rounded-full bg-white/15 text-white/70 border border-white/20">
        {franchise}
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center text-xs font-bold px-2 py-0.5 rounded-full bg-gradient-to-r ${meta.gradient} text-white shadow-sm`}>
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
        const newFollowing = !following;
        setFollowing(newFollowing);
        onFollow(characterId, newFollowing);
        if (newFollowing) {
          track(EVENTS.CHARACTER_FOLLOWED, { characterId });
        }
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
  proactiveMessage,
  showChatButton,
}: {
  character: Character;
  index: number;
  relationship?: RelationshipInfo;
  onFollow: (id: string, following: boolean) => void;
  onClick: () => void;
  proactiveMessage?: { content: string; expiresAt: string } | null;
  showChatButton?: boolean;
}) {
  const router = useRouter();
  const gradient = CARD_GRADIENTS[index % CARD_GRADIENTS.length];
  const catchphrase = character.catchphrases?.[0] ?? null;
  const isFollowing = relationship?.isFollowing ?? false;
  const isFanclub = relationship?.isFanclub ?? false;
  const [hovered, setHovered] = useState(false);
  const [mouseX, setMouseX] = useState(0.5);
  const [mouseY, setMouseY] = useState(0.5);

  // Franchise-based rarity for hologram effect
  const GOLD_HOLO_FRANCHISES = ['ONE PIECE', '呪術廻戦', '鬼滅の刃'];
  const SILVER_HOLO_FRANCHISES = ['ドラゴンボール', 'NARUTO'];
  const franchise = character.franchise ?? '';
  const cardRarity = GOLD_HOLO_FRANCHISES.some((f) => franchise.includes(f))
    ? 'gold'
    : SILVER_HOLO_FRANCHISES.some((f) => franchise.includes(f))
    ? 'silver'
    : 'normal';

  const holoGradient =
    cardRarity === 'gold'
      ? `radial-gradient(circle at ${mouseX * 100}% ${mouseY * 100}%, rgba(255,215,0,0.65) 0%, rgba(255,140,0,0.45) 15%, rgba(255,105,180,0.35) 30%, rgba(138,43,226,0.25) 50%, transparent 70%)`
      : cardRarity === 'silver'
      ? `radial-gradient(circle at ${mouseX * 100}% ${mouseY * 100}%, rgba(220,230,255,0.7) 0%, rgba(100,180,255,0.45) 20%, rgba(160,120,255,0.3) 40%, transparent 70%)`
      : `radial-gradient(circle at ${mouseX * 100}% ${mouseY * 100}%, rgba(255,255,255,0.45) 0%, rgba(100,200,255,0.25) 20%, rgba(200,100,255,0.2) 40%, transparent 70%)`;

  const tiltX = hovered ? (mouseY - 0.5) * -30 : 0;
  const tiltY = hovered ? (mouseX - 0.5) * 30 : 0;

  const depthShadow =
    cardRarity === 'gold'
      ? `0 ${20 + tiltX * 0.5}px 60px rgba(0,0,0,0.7), 0 0 40px rgba(255,180,0,0.35), 0 0 15px rgba(255,215,0,0.2)`
      : cardRarity === 'silver'
      ? `0 ${20 + tiltX * 0.5}px 60px rgba(0,0,0,0.7), 0 0 40px rgba(100,180,255,0.35), 0 0 15px rgba(200,220,255,0.2)`
      : `0 ${20 + tiltX * 0.5}px 60px rgba(0,0,0,0.6), 0 0 30px rgba(139,92,246,0.3)`;

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setMouseX(0.5); setMouseY(0.5); }}
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setMouseX((e.clientX - rect.left) / rect.width);
        setMouseY((e.clientY - rect.top) / rect.height);
      }}
      onTouchStart={() => setHovered(true)}
      onTouchMove={(e) => {
        const touch = e.touches[0];
        const rect = e.currentTarget.getBoundingClientRect();
        setMouseX((touch.clientX - rect.left) / rect.width);
        setMouseY((touch.clientY - rect.top) / rect.height);
      }}
      onTouchEnd={() => { setHovered(false); setMouseX(0.5); setMouseY(0.5); }}
      className="relative flex-shrink-0 w-44 cursor-pointer"
      style={{
        transform: hovered
          ? `perspective(600px) translateY(-8px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`
          : 'perspective(600px) translateY(0) rotateX(0deg) rotateY(0deg)',
        transition: hovered
          ? 'transform 0.08s ease-out'
          : 'transform 0.35s cubic-bezier(0.22,1,0.36,1)',
        transformStyle: 'preserve-3d',
        willChange: 'transform',
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
          boxShadow: hovered ? depthShadow : '0 8px 32px rgba(0,0,0,0.4)',
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

        {/* Hologram gloss overlay — cursor-tracking rainbow sheen */}
        <div
          className="absolute inset-0 pointer-events-none z-10"
          style={{
            opacity: hovered ? (cardRarity === 'normal' ? 0.4 : 0.55) : 0,
            background: holoGradient,
            transition: hovered ? 'opacity 0.15s ease, background 0.06s ease' : 'opacity 0.3s ease',
            mixBlendMode: 'screen',
          }}
        />
        {/* Rainbow shimmer stripe for gold/silver rarity */}
        {cardRarity !== 'normal' && (
          <div
            className="absolute inset-0 pointer-events-none z-10"
            style={{
              opacity: hovered ? 0.25 : 0,
              background: cardRarity === 'gold'
                ? `linear-gradient(${mouseX * 180}deg, rgba(255,0,128,0.4) 0%, rgba(255,165,0,0.4) 25%, rgba(0,255,128,0.3) 50%, rgba(0,128,255,0.4) 75%, rgba(255,0,255,0.4) 100%)`
                : `linear-gradient(${mouseX * 180}deg, rgba(200,220,255,0.5) 0%, rgba(100,200,255,0.4) 25%, rgba(180,160,255,0.3) 50%, rgba(220,240,255,0.4) 75%, rgba(150,180,255,0.5) 100%)`,
              transition: hovered ? 'opacity 0.15s ease, background 0.1s ease' : 'opacity 0.3s ease',
              mixBlendMode: 'screen',
            }}
          />
        )}

        {/* オンラインドット */}
        <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1 bg-black/50 rounded-full px-1.5 py-0.5 backdrop-blur-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse shadow-sm shadow-green-400/50" />
          <span className="text-[10px] text-green-300/80 font-medium">ONLINE</span>
        </div>

        {/* プロアクティブメッセージバッジ（新着あり） */}
        {proactiveMessage && (
          <div className="absolute top-2.5 left-2.5 z-10 flex flex-col gap-1">
            <div
              className="flex items-center gap-1 rounded-full px-2 py-0.5"
              style={{
                background: 'linear-gradient(135deg, rgba(236,72,153,0.95), rgba(139,92,246,0.95))',
                boxShadow: '0 2px 8px rgba(236,72,153,0.5)',
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              <span className="text-[10px] text-white font-bold">NEW MSG</span>
            </div>
            <CountdownTimer expiresAt={proactiveMessage.expiresAt} className="text-[10px] text-pink-300/90 font-semibold px-1" />
          </div>
        )}

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
              <div className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 mb-1 text-xs font-medium ${
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
            <p className="text-white/45 text-xs mb-1.5">
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
          {showChatButton && (
            <button
              onClick={(e) => { e.stopPropagation(); router.push(`/chat/${character.slug}`); }}
              className="mt-2 w-full px-3 py-1.5 text-xs font-bold text-white rounded-full transition-all active:scale-95"
              style={{
                background: 'linear-gradient(135deg, rgba(139,92,246,0.9), rgba(236,72,153,0.9))',
                boxShadow: '0 2px 8px rgba(139,92,246,0.4)',
              }}
            >
              チャット →
            </button>
          )}
        </div>

        {/* Fanclub badge */}
        {isFanclub && (
          <div className="absolute top-2 left-2 flex items-center gap-1 text-white text-xs font-bold px-2 py-0.5 rounded-full"
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
  proactiveMessage,
}: {
  character: Character;
  index: number;
  relationship?: RelationshipInfo;
  onFollow: (id: string, following: boolean) => void;
  onClick: () => void;
  proactiveMessage?: { content: string; expiresAt: string } | null;
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
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-white font-bold text-base leading-tight">{character.name}</p>
          {proactiveMessage && (
            <span
              className="flex-shrink-0 flex items-center gap-0.5 text-xs font-bold px-1.5 py-0.5 rounded-full"
              style={{
                background: 'linear-gradient(135deg, rgba(236,72,153,0.9), rgba(139,92,246,0.9))',
                color: 'white',
                boxShadow: '0 1px 6px rgba(236,72,153,0.5)',
              }}
            >
              <span className="w-1 h-1 rounded-full bg-white animate-pulse" />
              新着
            </span>
          )}
        </div>
        <div className="mb-1">
          <FranchiseBadge franchise={character.franchise} />
        </div>
        {proactiveMessage ? (
          <div>
            <p className="text-pink-300/90 text-xs italic truncate">「{proactiveMessage.content}」</p>
            <CountdownTimer expiresAt={proactiveMessage.expiresAt} className="text-[10px] text-pink-400/70 mt-0.5" />
          </div>
        ) : catchphrase ? (
          <p className="text-gray-400 text-xs italic truncate">&ldquo;{catchphrase}&rdquo;</p>
        ) : null}
        {(character.followerCount ?? 0) > 0 && !proactiveMessage && (
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

// ── ミッション進捗バーセクション ──
function MissionProgressSection({
  completed,
  total,
}: {
  completed: number;
  total: number;
}) {
  const router = useRouter();
  const pct = total > 0 ? Math.min((completed / total) * 100, 100) : 0;
  const remaining = total - completed;
  const isAllDone = completed >= total && total > 0;
  const isNearDone = pct >= 80 && !isAllDone;

  return (
    <FadeSection delay={13}>
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-white font-bold text-base flex items-center gap-2">
            📋 今日のミッション
          </h3>
          <button
            onClick={() => router.push('/mypage#daily-missions')}
            className="text-xs font-semibold"
            style={{ color: 'rgba(167,139,250,0.85)' }}
          >
            一覧 →
          </button>
        </div>

        <div
          className="rounded-2xl p-4 relative overflow-hidden"
          style={{
            background: isAllDone
              ? 'linear-gradient(135deg, rgba(16,185,129,0.18), rgba(6,182,212,0.12))'
              : isNearDone
              ? 'linear-gradient(135deg, rgba(245,158,11,0.18), rgba(251,191,36,0.12))'
              : 'rgba(255,255,255,0.04)',
            border: isAllDone
              ? '1px solid rgba(16,185,129,0.35)'
              : isNearDone
              ? '1px solid rgba(245,158,11,0.35)'
              : '1px solid rgba(255,255,255,0.08)',
          }}
        >
          {/* 花火エフェクト（全完了時） */}
          {isAllDone && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {[...Array(14)].map((_, i) => (
                <div
                  key={i}
                  className="absolute rounded-full"
                  style={{
                    width: 3 + (i % 3),
                    height: 3 + (i % 3),
                    left: `${8 + i * 6.5}%`,
                    top: '60%',
                    background: ['#f59e0b', '#10b981', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'][i % 6],
                    animation: `missionFw${i % 4 + 1} 1.4s ease-out ${i * 0.07}s infinite`,
                  }}
                />
              ))}
            </div>
          )}

          {/* ステータス行 */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex-1 min-w-0">
              <p
                className={`font-bold text-sm ${
                  isAllDone ? 'text-emerald-300' : isNearDone ? 'text-yellow-300' : 'text-white'
                }`}
              >
                {isAllDone
                  ? '全ミッションクリア'
                  : isNearDone
                  ? `あと${remaining}個で達成`
                  : `${completed} / ${total} ミッション完了`}
              </p>
              {!isAllDone && (
                <p className="text-white/45 text-xs mt-0.5">
                  {isNearDone
                    ? '今日中にクリアしてボーナスを獲得'
                    : 'ミッション達成でコインを獲得'}
                </p>
              )}
              {isAllDone && (
                <p className="text-emerald-400/70 text-xs mt-0.5">
                  今日のボーナスコインを全て獲得しました
                </p>
              )}
            </div>
            <span
              className={`text-xs font-bold px-2.5 py-1 rounded-full ml-3 flex-shrink-0 ${
                isAllDone
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : isNearDone
                  ? 'bg-yellow-500/20 text-yellow-300'
                  : 'bg-white/10 text-white/60'
              }`}
            >
              {Math.round(pct)}%
            </span>
          </div>

          {/* プログレスバー */}
          <div
            className="h-2.5 rounded-full overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.08)' }}
          >
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${pct}%`,
                background: isAllDone
                  ? 'linear-gradient(90deg, #10b981, #06b6d4)'
                  : isNearDone
                  ? 'linear-gradient(90deg, #f59e0b, #fbbf24)'
                  : 'linear-gradient(90deg, #8b5cf6, #ec4899)',
                boxShadow: isAllDone
                  ? '0 0 10px rgba(16,185,129,0.6)'
                  : isNearDone
                  ? '0 0 10px rgba(245,158,11,0.6)'
                  : '0 0 8px rgba(139,92,246,0.5)',
              }}
            />
          </div>

          {/* ミッションドット（6個以下の場合） */}
          {total > 0 && total <= 6 && (
            <div className="flex gap-2 mt-3 justify-center">
              {Array.from({ length: total }, (_, i) => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full transition-all duration-300"
                  style={{
                    background:
                      i < completed
                        ? isAllDone
                          ? '#10b981'
                          : isNearDone
                          ? '#f59e0b'
                          : '#8b5cf6'
                        : 'rgba(255,255,255,0.15)',
                    transform: i < completed ? 'scale(1.2)' : 'scale(1)',
                    boxShadow: i < completed
                      ? isNearDone
                        ? '0 0 4px rgba(245,158,11,0.6)'
                        : '0 0 4px rgba(139,92,246,0.5)'
                      : 'none',
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </FadeSection>
  );
}

export default function ExplorePage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();

  // ミッション「キャラを探す」自動完了
  useMissionTrigger('explore_visit');

  // ポストオンボーディング・チュートリアル
  const { tutorialState, initialized: tutorialInitialized, advanceTutorial, skipTutorial, completeTutorial } = useTutorial(
    session?.user?.onboardingStep,
    session?.user?.nickname,
  );

  const [characters, setCharacters] = useState<Character[]>([]);
  const [relationships, setRelationships] = useState<Map<string, RelationshipInfo>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('すべて');
  const [incompleteMissions, setIncompleteMissions] = useState(0);
  const [missionHint, setMissionHint] = useState('');
  const [missionProgress, setMissionProgress] = useState<{ completed: number; total: number } | null>(null);
  const [freeGachaAvailable, setFreeGachaAvailable] = useState(false);
  const [exploreActivePollCount, setExploreActivePollCount] = useState(0);

  // プロアクティブメッセージ（未読マップ: characterId → message）
  const { messages: proactiveMsgs } = useProactiveMessages();
  const proactiveUnreadMap = new Map<string, { content: string; expiresAt: string }>(
    proactiveMsgs
      .filter(m => !m.isRead)
      .map(m => [m.characterId, { content: m.content, expiresAt: m.expiresAt }])
  );

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
        const allMissions = (data.missions ?? []) as { completed: boolean }[];
        const allWeekly = (data.weeklyMissions ?? []) as { completed: boolean }[];
        const totalMissions = allMissions.length + allWeekly.length;
        const completedMissions =
          allMissions.filter(m => m.completed).length +
          allWeekly.filter(m => m.completed).length;
        const incomplete = totalMissions - completedMissions;
        setIncompleteMissions(incomplete);
        setMissionProgress({ completed: completedMissions, total: totalMissions });
        if (incomplete === 1) setMissionHint('あと1個でコイン獲得！急げ！');
        else if (incomplete === 2) setMissionHint('あと2個！今日中にクリアしよう');
        else if (incomplete > 0) setMissionHint(`${incomplete}個の未完了ミッション`);
      })
      .catch(() => {});
  }, [status]);

  useEffect(() => {
    if (status === 'authenticated') {
      // ガチャ無料状態を取得
      fetch('/api/gacha/banners')
        .then(r => r.json())
        .then(data => setFreeGachaAvailable(data.freeGachaAvailable ?? false))
        .catch(() => {});

      fetch('/api/polls/active')
        .then(r => r.ok ? r.json() : null)
        .then(data => setExploreActivePollCount((data?.polls ?? []).length))
        .catch(() => {});

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

  // 新規ユーザー / 久しぶりユーザー (72時間以上) を /discover にリダイレクト
  useEffect(() => {
    if (status !== 'authenticated') return;
    const LAST_VISIT_KEY = 'aniva_last_explore_visit';
    const HOURS_72 = 72 * 60 * 60 * 1000;
    try {
      const lastVisit = localStorage.getItem(LAST_VISIT_KEY);
      const now = Date.now();
      localStorage.setItem(LAST_VISIT_KEY, String(now));
      if (!lastVisit || now - parseInt(lastVisit, 10) > HOURS_72) {
        router.push('/discover');
      }
    } catch { /* ignore */ }
  }, [status, router]);

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

  // Filter characters + sort by unread proactive messages first
  const filteredCharacters = characters
    .filter(c => {
      const matchesSearch = !searchQuery ||
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.nameEn?.toLowerCase().includes(searchQuery.toLowerCase())) ||
        c.franchise.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory = selectedCategory === 'すべて' || c.franchise === selectedCategory;

      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      // 未読プロアクティブメッセージがあるキャラを上位に
      const aHasMsg = proactiveUnreadMap.has(a.id) ? 1 : 0;
      const bHasMsg = proactiveUnreadMap.has(b.id) ? 1 : 0;
      return bHasMsg - aHasMsg;
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

      {/* ポストオンボーディング・チュートリアル */}
      {tutorialInitialized && tutorialState.step >= 1 && tutorialState.step <= 5 && (
        <TutorialOverlay
          tutorialState={tutorialState}
          onAdvance={advanceTutorial}
          onSkip={skipTutorial}
          onComplete={completeTutorial}
        />
      )}
      <style>{`
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        @keyframes catBadgePop {
          0%   { transform: scale(0.85); opacity: 0; }
          60%  { transform: scale(1.08); }
          100% { transform: scale(1); opacity: 1; }
        }
        .cat-badge-active { animation: catBadgePop 0.25s cubic-bezier(0.22,1,0.36,1) forwards; }
        @keyframes missionFw1 { 0% { transform: translateY(0) scale(1); opacity:1; } 100% { transform: translateY(-44px) translateX(-22px) scale(0); opacity:0; } }
        @keyframes missionFw2 { 0% { transform: translateY(0) scale(1); opacity:1; } 100% { transform: translateY(-38px) translateX(22px) scale(0); opacity:0; } }
        @keyframes missionFw3 { 0% { transform: translateY(0) scale(1); opacity:1; } 100% { transform: translateY(-50px) scale(0); opacity:0; } }
        @keyframes missionFw4 { 0% { transform: translateY(0) scale(1); opacity:1; } 100% { transform: translateY(-32px) translateX(-32px) scale(0); opacity:0; } }
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
              {/* TinderUI発見バナー（常時表示・最上部） */}
              <FadeSection delay={0}>
                <DiscoverBanner />
              </FadeSection>

              {/* 今日のひとこと */}
              <TodayGreetingSection characters={characters} relationships={relationships} />

              {/* 新着メッセージ（キャラ主導） */}
              {session?.user && (
                <FadeSection delay={20}>
                  <div className="mb-5">
                    <ProactiveMessagePanel />
                  </div>
                </FadeSection>
              )}

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
                    <div className="relative rounded-3xl overflow-hidden mb-6 cursor-pointer active:scale-[0.98] transition-transform"
                      style={{ boxShadow: '0 8px 48px rgba(139,92,246,0.35), 0 0 0 1px rgba(255,255,255,0.06)', minHeight: 220 }}
                      onClick={() => router.push('/discover')}
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
                            onClick={() => router.push('/discover')}
                            className="px-5 py-2.5 bg-white text-gray-900 rounded-full font-bold text-sm hover:bg-gray-100 active:scale-95 transition-all shadow-lg"
                          >
                            スワイプで探す →
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
                          className="relative z-10 overflow-x-auto border-t py-2 no-scrollbar ticker-container"
                          style={{ borderColor: 'rgba(255,255,255,0.12)', background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(4px)', WebkitOverflowScrolling: 'touch' }}
                          onTouchStart={(e) => {
                            const el = e.currentTarget.querySelector('.ticker-track') as HTMLElement;
                            if (el) el.style.animationPlayState = 'paused';
                          }}
                          onTouchEnd={(e) => {
                            const el = e.currentTarget.querySelector('.ticker-track') as HTMLElement;
                            if (el) setTimeout(() => { el.style.animationPlayState = 'running'; }, 3000);
                          }}
                          onMouseDown={(e) => {
                            const el = e.currentTarget.querySelector('.ticker-track') as HTMLElement;
                            if (el) el.style.animationPlayState = 'paused';
                          }}
                          onMouseUp={(e) => {
                            const el = e.currentTarget.querySelector('.ticker-track') as HTMLElement;
                            if (el) setTimeout(() => { el.style.animationPlayState = 'running'; }, 3000);
                          }}
                          onMouseLeave={(e) => {
                            const el = e.currentTarget.querySelector('.ticker-track') as HTMLElement;
                            if (el) setTimeout(() => { el.style.animationPlayState = 'running'; }, 1000);
                          }}
                        >
                          <div
                            className="ticker-track flex gap-6 whitespace-nowrap text-white/60 text-xs font-medium"
                            style={{ animation: 'heroTicker 20s linear infinite', width: 'max-content' }}
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

              {/* ガチャバナー */}
              <GachaBannerSection freeAvailable={freeGachaAvailable} />

              {/* グループチャットバナー */}
              <FadeSection delay={14}>
                <div className="mb-5">
                  <button
                    onClick={() => router.push('/chat/group')}
                    className="w-full text-left rounded-2xl overflow-hidden active:scale-[0.98] transition-all duration-200"
                    style={{
                      background: 'linear-gradient(135deg, rgba(88,28,135,0.25), rgba(157,23,77,0.2), rgba(30,27,75,0.15))',
                      border: '1px solid rgba(139,92,246,0.35)',
                      boxShadow: '0 2px 20px rgba(139,92,246,0.12)',
                    }}
                  >
                    <div className="px-4 py-3 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(139,92,246,0.2)', border: '1px solid rgba(139,92,246,0.3)' }}>
                        <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-purple-300 text-[10px] font-black tracking-widest uppercase">
                            グループチャット
                          </span>
                          <span
                            className="text-xs px-1.5 py-0.5 rounded-full font-bold"
                            style={{
                              background: 'rgba(139,92,246,0.25)',
                              color: 'rgba(196,181,254,0.9)',
                              border: '1px solid rgba(139,92,246,0.3)',
                            }}
                          >
                            NEW
                          </span>
                        </div>
                        <p className="text-white font-bold text-sm leading-tight">
                          キャラ同士の掛け合いを見よう！
                        </p>
                        <p className="text-white/50 text-xs mt-0.5">
                          複数のキャラを招待してトーク
                        </p>
                      </div>
                      <div className="flex-shrink-0">
                        <span
                          className="text-white text-xs font-bold px-3 py-1.5 rounded-full"
                          style={{
                            background: 'linear-gradient(135deg, rgba(139,92,246,0.9), rgba(236,72,153,0.9))',
                            boxShadow: '0 2px 8px rgba(139,92,246,0.4)',
                          }}
                        >
                          試す →
                        </span>
                      </div>
                    </div>
                  </button>
                </div>
              </FadeSection>

              {/* 今日のミッション進捗バー */}
              {missionProgress !== null && missionProgress.total > 0 && (
                <MissionProgressSection
                  completed={missionProgress.completed}
                  total={missionProgress.total}
                />
              )}

              {/* 今日の日記プレビュー */}
              <DiaryPreviewSection />

              {/* 期間限定シナリオバナー */}
              <LimitedScenariosSection />

              {/* ストーリー投票バナー */}
              <PollBannerSection />

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
                      window.location.href = '/mypage#daily-missions';
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
                          proactiveMessage={proactiveUnreadMap.get(character.id) ?? null}
                          showChatButton={true}
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
                          proactiveMessage={proactiveUnreadMap.get(character.id) ?? null}
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
                          proactiveMessage={proactiveUnreadMap.get(character.id) ?? null}
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
                          proactiveMessage={proactiveUnreadMap.get(character.id) ?? null}
                        />
                      ))}
                    </div>
                  </div>
                </FadeSection>
              )}

              {/* ── コンテンツリンク：メモリーブック・ストーリー ── */}
              <ContentLinksSection activePollCount={exploreActivePollCount} />
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
                        proactiveMessage={proactiveUnreadMap.get(character.id) ?? null}
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState message="まだ出会えてないキャラがいるかも…" />
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
