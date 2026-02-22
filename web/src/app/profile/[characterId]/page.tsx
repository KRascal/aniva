'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { RELATIONSHIP_LEVELS } from '@/types/character';

interface RelationshipData {
  level: number;
  levelName: string;
  xp: number;
  nextLevelXp: number | null;
  totalMessages: number;
  firstMessageAt?: string;
  lastMessageAt?: string;
  character?: { name: string; slug: string };
}

interface MilestoneWithAchieved {
  id: string;
  level: number;
  title: string;
  description: string;
  characterMessage: string;
  emoji: string;
  achieved: boolean;
}

interface MilestonesData {
  milestones: MilestoneWithAchieved[];
  currentLevel: number;
}

interface Character {
  id: string;
  name: string;
  nameEn: string;
  franchise: string;
  avatarUrl: string | null;
}

// ── キラキラ星コンポーネント ──
function SparkStar({ filled, delay }: { filled: boolean; delay: number }) {
  return (
    <span
      className={`inline-block text-2xl transition-all duration-300 ${
        filled
          ? 'animate-[sparkle_1.5s_ease-in-out_infinite]'
          : 'opacity-25'
      }`}
      style={{ animationDelay: `${delay}s` }}
    >
      {filled ? '⭐' : '☆'}
    </span>
  );
}

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const characterId = params.characterId as string;

  const [userId, setUserId] = useState<string | null>(null);
  const [character, setCharacter] = useState<Character | null>(null);
  const [relationship, setRelationship] = useState<RelationshipData | null>(null);
  const [milestonesData, setMilestonesData] = useState<MilestonesData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [xpAnimated, setXpAnimated] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  // Get userId from session
  useEffect(() => {
    if (session?.user) {
      const user = session.user as { id?: string };
      if (user.id) {
        setUserId(user.id);
      }
    }
  }, [session]);

  // Load character info
  useEffect(() => {
    if (!characterId) return;
    fetch(`/api/characters/id/${characterId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.character) setCharacter(data.character);
      })
      .catch(console.error);
  }, [characterId]);

  // Load relationship + milestones
  useEffect(() => {
    if (!userId || !characterId) return;

    const load = async () => {
      try {
        const [relRes, msRes] = await Promise.all([
          fetch(`/api/relationship/${characterId}`),
          fetch(`/api/relationship/${characterId}/milestones`),
        ]);
        const [relData, msData] = await Promise.all([relRes.json(), msRes.json()]);
        setRelationship(relData);
        setMilestonesData(msData);
      } catch (err) {
        console.error('Failed to load profile data:', err);
      } finally {
        setIsLoading(false);
        // XPバーのアニメーション遅延
        setTimeout(() => setXpAnimated(true), 300);
      }
    };

    load();
  }, [userId, characterId]);

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
          <p className="text-purple-300 text-sm animate-pulse">読み込み中...</p>
        </div>
      </div>
    );
  }

  const level = relationship?.level ?? 1;
  const xp = relationship?.xp ?? 0;
  const nextLevelXp = relationship?.nextLevelXp;
  const levelInfo = RELATIONSHIP_LEVELS[Math.min(level - 1, RELATIONSHIP_LEVELS.length - 1)];

  // XPバー計算
  const prevLevelXp = levelInfo?.xpRequired ?? 0;
  const xpInLevel = xp - prevLevelXp;
  const xpNeeded = nextLevelXp ? nextLevelXp - prevLevelXp : 1;
  const xpPercent = nextLevelXp
    ? Math.min(100, Math.round((xpInLevel / xpNeeded) * 100))
    : 100;

  // 星表示
  const maxStars = 5;
  const filledStars = Math.min(level, maxStars);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-gray-950 max-w-lg mx-auto">

      {/* ── グラデーションヘッダー ── */}
      <div className="relative overflow-hidden">
        {/* 背景グラデーション */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-[#2d0b5e] to-pink-950" />
        {/* グロー装飾 */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-40 bg-purple-500/20 rounded-full blur-[60px]" />
        <div className="absolute bottom-0 right-0 w-40 h-40 bg-pink-500/20 rounded-full blur-[50px]" />

        {/* ナビゲーション */}
        <div className="relative z-10 px-4 pt-4 pb-0 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="text-white/70 hover:text-white transition-colors p-1 -ml-1"
            aria-label="戻る"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-white/90 font-semibold text-base">絆プロフィール</h1>
        </div>

        {/* キャラクター情報 */}
        <div className="relative z-10 px-6 pt-6 pb-8 flex items-end gap-5">
          {/* アバター */}
          <div className="relative flex-shrink-0">
            <div className="w-20 h-20 rounded-2xl overflow-hidden ring-2 ring-white/20 shadow-[0_0_30px_rgba(168,85,247,0.5)]">
              {character?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={character.avatarUrl} alt={character.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
                  <span className="text-4xl">🏴‍☠️</span>
                </div>
              )}
            </div>
            {/* レベルバッジ */}
            <div className="absolute -bottom-2 -right-2 bg-gradient-to-br from-yellow-400 to-orange-500 text-black text-xs font-black rounded-full w-7 h-7 flex items-center justify-center shadow-lg">
              {level}
            </div>
          </div>

          <div className="flex-1 min-w-0 pb-1">
            <h2 className="text-white font-black text-2xl leading-tight">{character?.name ?? '—'}</h2>
            <p className="text-purple-300 text-sm mt-0.5">{character?.franchise ?? '—'}</p>
            <div className="mt-2 inline-flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1">
              <span className="text-yellow-300 text-xs font-bold">「{levelInfo?.name ?? '—'}」</span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-5 space-y-4">

        {/* ── レベル & 星 ── */}
        <div className="bg-gray-900/80 rounded-2xl p-5 border border-white/5 shadow-lg">
          <p className="text-gray-500 text-xs font-semibold uppercase tracking-widest mb-3">現在のレベル</p>

          {/* 星アニメーション */}
          <div className="flex items-center gap-1 mb-4">
            {Array.from({ length: maxStars }).map((_, i) => (
              <SparkStar key={i} filled={i < filledStars} delay={i * 0.15} />
            ))}
            <span className="ml-2 text-white font-bold text-lg">Level {level}</span>
          </div>

          {/* XPバー */}
          <div>
            <div className="flex justify-between text-xs mb-2">
              <span className="text-gray-400">経験値</span>
              <span className="text-purple-300 font-semibold">
                {xp.toLocaleString()}{nextLevelXp ? ` / ${nextLevelXp.toLocaleString()} XP` : ' XP (MAX)'}
              </span>
            </div>
            <div className="relative w-full bg-gray-800 rounded-full h-3 overflow-hidden">
              {/* グロー背景 */}
              <div className="absolute inset-0 rounded-full bg-purple-500/10" />
              {/* バー本体 */}
              <div
                className="h-full rounded-full transition-all duration-1000 ease-out relative overflow-hidden"
                style={{
                  width: xpAnimated ? `${xpPercent}%` : '0%',
                  background: 'linear-gradient(90deg, #7c3aed, #db2777)',
                  boxShadow: '0 0 12px rgba(168,85,247,0.8), 0 0 24px rgba(168,85,247,0.4)',
                }}
              >
                {/* シマーエフェクト */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[shimmer_2s_linear_infinite]" />
              </div>
            </div>
            {nextLevelXp && (
              <p className="text-xs text-gray-500 mt-1.5 text-right">
                あと {(nextLevelXp - xp).toLocaleString()} XP で次のレベル
              </p>
            )}
          </div>
        </div>

        {/* ── 統計カード ── */}
        <div>
          <p className="text-gray-500 text-xs font-semibold uppercase tracking-widest mb-3 px-1">統計</p>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gray-900/80 rounded-2xl p-4 border border-white/5 text-center">
              <div className="text-2xl mb-1">💬</div>
              <div className="text-white font-black text-xl leading-none">
                {(relationship?.totalMessages ?? 0).toLocaleString()}
              </div>
              <div className="text-gray-500 text-xs mt-1">メッセージ</div>
            </div>

            <div className="bg-gray-900/80 rounded-2xl p-4 border border-white/5 text-center">
              <div className="text-2xl mb-1">📅</div>
              <div className="text-white font-bold text-sm leading-tight">
                {relationship?.firstMessageAt
                  ? new Date(relationship.firstMessageAt).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })
                  : '—'}
              </div>
              <div className="text-gray-500 text-xs mt-1">最初の会話</div>
            </div>

            <div className="bg-gray-900/80 rounded-2xl p-4 border border-white/5 text-center">
              <div className="text-2xl mb-1">⏰</div>
              <div className="text-white font-bold text-sm leading-tight">
                {relationship?.lastMessageAt
                  ? new Date(relationship.lastMessageAt).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })
                  : '—'}
              </div>
              <div className="text-gray-500 text-xs mt-1">最後の会話</div>
            </div>
          </div>
        </div>

        {/* ── マイルストーン タイムライン ── */}
        <div>
          <p className="text-gray-500 text-xs font-semibold uppercase tracking-widest mb-4 px-1">マイルストーン</p>

          <div className="relative">
            {/* タイムライン縦線 */}
            <div className="absolute left-[22px] top-0 bottom-0 w-0.5 bg-gradient-to-b from-purple-600/60 via-gray-700/40 to-transparent" />

            <div className="space-y-3">
              {milestonesData?.milestones.map((m, idx) => (
                <div key={m.id} className="relative flex items-start gap-4 pl-2">
                  {/* タイムライン丸 */}
                  <div
                    className={`relative z-10 flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-lg border-2 transition-all ${
                      m.achieved
                        ? 'bg-gradient-to-br from-purple-600 to-pink-600 border-purple-500/80 shadow-[0_0_12px_rgba(168,85,247,0.5)]'
                        : 'bg-gray-900 border-gray-700'
                    }`}
                    style={m.achieved ? { animationDelay: `${idx * 0.1}s` } : {}}
                  >
                    {m.achieved ? (
                      <span>{m.emoji}</span>
                    ) : (
                      <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    )}
                  </div>

                  {/* コンテンツ */}
                  <div
                    className={`flex-1 min-w-0 rounded-xl p-3.5 border transition-all ${
                      m.achieved
                        ? 'bg-purple-900/20 border-purple-500/30'
                        : 'bg-gray-900/40 border-gray-800/50 opacity-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-semibold text-sm ${m.achieved ? 'text-white' : 'text-gray-500'}`}>
                        {m.title}
                      </span>
                      {m.achieved ? (
                        <span className="text-xs text-purple-300 bg-purple-900/60 px-2 py-0.5 rounded-full">
                          ✓ 達成
                        </span>
                      ) : (
                        <span className="text-xs text-gray-600 bg-gray-800/60 px-2 py-0.5 rounded-full">
                          Lv.{m.level}で解放
                        </span>
                      )}
                    </div>
                    <p className={`text-xs mt-1 ${m.achieved ? 'text-gray-400' : 'text-gray-600'}`}>
                      {m.achieved ? m.description : `Level ${m.level} に到達すると解放されます`}
                    </p>
                    {m.achieved && m.characterMessage && (
                      <p className="text-xs text-purple-300/80 italic mt-1.5 border-l-2 border-purple-500/40 pl-2">
                        「{m.characterMessage}」
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── CTA ── */}
        <div className="pt-2 pb-6">
          <button
            onClick={() => router.push(`/chat/${characterId}`)}
            className="relative w-full py-4 rounded-2xl text-white font-bold text-base active:scale-[0.98] transition-transform overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #7c3aed, #db2777)',
            }}
          >
            {/* pulse glow リング */}
            <span className="absolute inset-0 rounded-2xl animate-[pulseGlow_2s_ease-in-out_infinite]" />
            {/* シマーライン */}
            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-[shimmer_3s_linear_infinite]" />
            <span className="relative z-10 flex items-center justify-center gap-2">
              <span className="text-xl">💬</span>
              チャットを続ける
            </span>
          </button>
        </div>
      </div>

      <style>{`
        @keyframes sparkle {
          0%, 100% { transform: scale(1) rotate(0deg); filter: brightness(1); }
          25%       { transform: scale(1.2) rotate(-8deg); filter: brightness(1.5) drop-shadow(0 0 6px #fde68a); }
          50%       { transform: scale(0.95) rotate(5deg); filter: brightness(1.3); }
          75%       { transform: scale(1.1) rotate(-3deg); filter: brightness(1.6) drop-shadow(0 0 8px #fde68a); }
        }
        @keyframes shimmer {
          from { transform: translateX(-100%); }
          to   { transform: translateX(100%); }
        }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(168,85,247,0); }
          50%       { box-shadow: 0 0 0 8px rgba(168,85,247,0.25), 0 0 30px rgba(219,39,119,0.3); }
        }
      `}</style>
    </div>
  );
}
