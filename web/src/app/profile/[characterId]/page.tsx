'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { RELATIONSHIP_LEVELS } from '@/types/character';

/* ───────────────────────── Luffy 固定データ ───────────────────────── */
const LUFFY_SLUG = 'luffy';

const LUFFY_INFO = {
  affiliation: '麦わらの一味（船長）',
  devilFruit: 'ゴムゴムの実（超人系）',
  hometown: '東の海　フーシャ村',
  birthday: '5月5日（こどもの日）',
  likes: '肉（とにかく肉！）',
  dream: '海賊王になること',
} as const;

const LUFFY_CREW = [
  { name: 'ロロノア・ゾロ', role: '剣豪', emoji: '⚔️' },
  { name: 'ナミ', role: '航海士', emoji: '🗺️' },
  { name: 'ウソップ', role: '狙撃手', emoji: '🎯' },
  { name: 'サンジ', role: 'コック', emoji: '🍳' },
  { name: 'チョッパー', role: '船医', emoji: '🦌' },
  { name: 'ロビン', role: '考古学者', emoji: '📖' },
  { name: 'フランキー', role: '船大工', emoji: '🔧' },
  { name: 'ブルック', role: '音楽家', emoji: '🎻' },
  { name: 'ジンベエ', role: '操舵手', emoji: '🐋' },
] as const;

/* ───────────────────────── 型定義 ───────────────────────── */
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
  slug: string;
  franchise: string;
  franchiseEn?: string;
  description?: string;
  avatarUrl: string | null;
  coverUrl: string | null;
  catchphrases: string[];
}

interface MomentItem {
  id: string;
  type: string;
  content: string | null;
  mediaUrl: string | null;
  publishedAt: string;
  reactionCount: number;
  userHasLiked: boolean;
  isLocked: boolean;
}

/* ───────────────────────── サブコンポーネント ───────────────────────── */

function SparkStar({ filled, delay }: { filled: boolean; delay: number }) {
  return (
    <span
      className={`inline-block text-2xl transition-all duration-300 ${
        filled ? 'animate-[sparkle_1.5s_ease-in-out_infinite]' : 'opacity-25'
      }`}
      style={{ animationDelay: `${delay}s` }}
    >
      {filled ? '⭐' : '☆'}
    </span>
  );
}

function MomentCard({ moment }: { moment: MomentItem }) {
  if (moment.isLocked) {
    return (
      <div className="bg-gray-900/60 rounded-xl p-4 border border-gray-800/60 flex items-center gap-3">
        <div className="text-2xl opacity-40">🔒</div>
        <div>
          <p className="text-gray-500 text-sm">ロックされたMoment</p>
          <p className="text-gray-600 text-xs mt-0.5">プランをアップグレードして解放</p>
        </div>
      </div>
    );
  }

  const typeEmoji: Record<string, string> = {
    TEXT: '💬', IMAGE: '🖼️', AUDIO: '🎵', VIDEO: '🎬',
  };

  return (
    <div className="bg-gray-900/70 rounded-xl p-4 border border-white/5 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="text-xl flex-shrink-0 mt-0.5">{typeEmoji[moment.type] ?? '💬'}</span>
        <div className="flex-1 min-w-0">
          {moment.content && (
            <p className="text-gray-200 text-sm leading-relaxed line-clamp-3">{moment.content}</p>
          )}
          {moment.mediaUrl && moment.type === 'IMAGE' && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={moment.mediaUrl}
              alt="Moment"
              className="mt-2 rounded-lg max-h-40 object-cover w-full"
            />
          )}
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-gray-600">
              {new Date(moment.publishedAt).toLocaleDateString('ja-JP', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
            <span className="text-xs text-gray-600">·</span>
            <span className="text-xs text-gray-600">❤️ {moment.reactionCount}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── メインページ ───────────────────────── */
export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const characterId = params.characterId as string;

  const [userId, setUserId] = useState<string | null>(null);
  const [character, setCharacter] = useState<Character | null>(null);
  const [relationship, setRelationship] = useState<RelationshipData | null>(null);
  const [milestonesData, setMilestonesData] = useState<MilestonesData | null>(null);
  const [moments, setMoments] = useState<MomentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [xpAnimated, setXpAnimated] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFanclub, setIsFanclub] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [fanclubLoading, setFanclubLoading] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status, router]);

  useEffect(() => {
    if (session?.user) {
      const user = session.user as { id?: string };
      if (user.id) setUserId(user.id);
    }
  }, [session]);

  // キャラ情報
  useEffect(() => {
    if (!characterId) return;
    fetch(`/api/characters/id/${characterId}`)
      .then((res) => res.json())
      .then((data) => { if (data.character) setCharacter(data.character); })
      .catch(console.error);
  }, [characterId]);

  // Moments（最近5件）
  useEffect(() => {
    if (!characterId) return;
    fetch(`/api/moments?characterId=${characterId}&limit=5`)
      .then((res) => res.json())
      .then((data) => { if (data.moments) setMoments(data.moments.slice(0, 5)); })
      .catch(() => {});
  }, [characterId]);

  // Relationship + Milestones + Follow状態
  useEffect(() => {
    if (!userId || !characterId) return;
    const load = async () => {
      try {
        const [relRes, msRes, followRes] = await Promise.all([
          fetch(`/api/relationship/${characterId}`),
          fetch(`/api/relationship/${characterId}/milestones`),
          fetch(`/api/relationship/${characterId}/follow`),
        ]);
        const [relData, msData, followData] = await Promise.all([
          relRes.json(), msRes.json(), followRes.json(),
        ]);
        setRelationship(relData);
        setMilestonesData(msData);
        setIsFollowing(followData.isFollowing ?? false);
        setIsFanclub(followData.isFanclub ?? false);
      } catch (err) {
        console.error('Failed to load profile data:', err);
      } finally {
        setIsLoading(false);
        setTimeout(() => setXpAnimated(true), 300);
      }
    };
    load();
  }, [userId, characterId]);

  const handleFollow = async () => {
    if (followLoading) return;
    setFollowLoading(true);
    try {
      const res = await fetch(`/api/relationship/${characterId}/follow`, { method: 'POST' });
      const data = await res.json();
      setIsFollowing(data.isFollowing);
    } catch (err) {
      console.error('Follow error:', err);
    } finally {
      setFollowLoading(false);
    }
  };

  const handleFanclub = async () => {
    if (fanclubLoading) return;
    setFanclubLoading(true);
    try {
      const res = await fetch(`/api/relationship/${characterId}/fanclub`, { method: 'POST' });
      const data = await res.json();
      setIsFanclub(data.isFanclub);
      setIsFollowing(data.isFollowing);
    } catch (err) {
      console.error('Fanclub error:', err);
    } finally {
      setFanclubLoading(false);
    }
  };

  const handleChat = () => {
    if (!isFanclub) {
      router.push('/pricing');
      return;
    }
    router.push(`/chat/${characterId}`);
  };

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

  const prevLevelXp = levelInfo?.xpRequired ?? 0;
  const xpInLevel = xp - prevLevelXp;
  const xpNeeded = nextLevelXp ? nextLevelXp - prevLevelXp : 1;
  const xpPercent = nextLevelXp
    ? Math.min(100, Math.round((xpInLevel / xpNeeded) * 100))
    : 100;

  const maxStars = 5;
  const filledStars = Math.min(level, maxStars);
  const isLuffy = character?.slug === LUFFY_SLUG;
  const catchphrases: string[] = character?.catchphrases ?? [];

  return (
    <div className="min-h-screen bg-gray-950 max-w-lg mx-auto pb-8">

      {/* ══════════════ ヒーローセクション ══════════════ */}
      <div className="relative">
        {/* カバー画像 */}
        <div className="relative h-44 overflow-hidden">
          {character?.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={character.coverUrl}
              alt="cover"
              className="w-full h-full object-cover"
            />
          ) : (
            /* フォールバック：グラデーション背景 */
            <div className="w-full h-full bg-gradient-to-br from-orange-900 via-red-900 to-purple-950" />
          )}
          {/* オーバーレイ */}
          <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/40 to-transparent" />
          {/* 海賊モチーフ装飾 */}
          <div className="absolute inset-0 flex items-center justify-center opacity-10 select-none pointer-events-none">
            <span className="text-[120px] leading-none">🏴‍☠️</span>
          </div>
        </div>

        {/* ナビゲーション（カバー上に重ねる） */}
        <div className="absolute top-4 left-4 z-20">
          <button
            onClick={() => router.back()}
            className="flex items-center justify-center w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm text-white/80 hover:text-white transition-colors border border-white/15"
            aria-label="戻る"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>

        {/* アバター + 名前エリア */}
        <div className="relative z-10 px-5 -mt-14 flex items-end gap-4">
          {/* アバター */}
          <div className="relative flex-shrink-0">
            <div className="w-24 h-24 rounded-2xl overflow-hidden ring-2 ring-gray-950 shadow-[0_0_32px_rgba(234,88,12,0.4)]">
              {character?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={character.avatarUrl} alt={character.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                  <span className="text-5xl">🏴‍☠️</span>
                </div>
              )}
            </div>
            {/* レベルバッジ */}
            <div className="absolute -bottom-2 -right-2 bg-gradient-to-br from-yellow-400 to-orange-500 text-black text-xs font-black rounded-full w-7 h-7 flex items-center justify-center shadow-lg border-2 border-gray-950">
              {level}
            </div>
          </div>

          {/* 名前 + フランチャイズ */}
          <div className="flex-1 min-w-0 pb-2">
            <h1 className="text-white font-black text-2xl leading-tight truncate">
              {character?.name ?? '—'}
            </h1>
            <p className="text-orange-400 text-sm font-medium">{character?.franchise ?? '—'}</p>
            {isLuffy && (
              <p className="text-gray-400 text-xs mt-0.5 italic">「海賊王に、おれはなる！」</p>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 mt-5 space-y-5">

        {/* ══════════════ アクションボタン ══════════════ */}
        <div className="flex gap-3">
          {/* フォローボタン */}
          <button
            onClick={handleFollow}
            disabled={followLoading}
            className={`flex-1 py-3 rounded-2xl font-bold text-sm active:scale-[0.97] transition-all flex items-center justify-center gap-2 border ${
              isFollowing
                ? 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-750'
                : 'bg-purple-600 border-purple-500 text-white hover:bg-purple-500'
            } ${followLoading ? 'opacity-60' : ''}`}
          >
            {followLoading ? (
              <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : isFollowing ? (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                フォロー中
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                フォローする
              </>
            )}
          </button>

          {/* ファンクラブボタン */}
          <button
            onClick={handleFanclub}
            disabled={fanclubLoading}
            className={`flex-1 py-3 rounded-2xl font-bold text-sm active:scale-[0.97] transition-all flex items-center justify-center gap-2 border relative overflow-hidden ${
              isFanclub
                ? 'bg-yellow-900/40 border-yellow-600/50 text-yellow-300'
                : 'bg-gradient-to-r from-pink-600 to-orange-500 border-transparent text-white hover:from-pink-500 hover:to-orange-400'
            } ${fanclubLoading ? 'opacity-60' : ''}`}
          >
            {!isFanclub && (
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-[shimmer_3s_linear_infinite]" />
            )}
            {fanclubLoading ? (
              <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : isFanclub ? (
              <>⭐ FC加入済み</>
            ) : (
              <>🌟 ファンクラブに入る</>
            )}
          </button>
        </div>

        {/* チャットボタン */}
        <button
          onClick={handleChat}
          className={`relative w-full py-4 rounded-2xl font-bold text-base active:scale-[0.98] transition-transform overflow-hidden ${
            isFanclub
              ? 'text-white'
              : 'bg-gray-800 text-gray-500 cursor-pointer'
          }`}
          style={isFanclub ? { background: 'linear-gradient(135deg, #ea580c, #dc2626, #7c3aed)' } : {}}
        >
          {isFanclub && (
            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-[shimmer_3s_linear_infinite]" />
          )}
          <span className="relative z-10 flex items-center justify-center gap-2">
            <span className="text-xl">{isFanclub ? '💬' : '🔒'}</span>
            {isFanclub
              ? `${character?.name ?? 'キャラクター'}とチャットする`
              : 'ファンクラブ加入でチャット解放'}
          </span>
          {!isFanclub && (
            <span className="relative z-10 block text-xs text-gray-600 mt-1">
              ファンクラブに入ってチャットを始めよう →
            </span>
          )}
        </button>

        {/* ══════════════ 基本情報カード（ルフィ限定） ══════════════ */}
        {isLuffy && (
          <div className="bg-gray-900/80 rounded-2xl p-5 border border-orange-900/30 shadow-lg">
            <p className="text-orange-400 text-xs font-semibold uppercase tracking-widest mb-4 flex items-center gap-2">
              <span>📋</span> キャラクター情報
            </p>
            <div className="space-y-3">
              {(Object.entries(LUFFY_INFO) as [keyof typeof LUFFY_INFO, string][]).map(([key, value]) => {
                const labelMap: Record<keyof typeof LUFFY_INFO, string> = {
                  affiliation: '所属',
                  devilFruit:  '悪魔の実',
                  hometown:    '出身',
                  birthday:    '誕生日',
                  likes:       '好きなもの',
                  dream:       '夢',
                };
                const emojiMap: Record<keyof typeof LUFFY_INFO, string> = {
                  affiliation: '🏴‍☠️',
                  devilFruit:  '🍎',
                  hometown:    '🌊',
                  birthday:    '🎂',
                  likes:       '🍖',
                  dream:       '👑',
                };
                return (
                  <div key={key} className="flex items-start gap-3">
                    <span className="text-lg flex-shrink-0 w-7 text-center">{emojiMap[key]}</span>
                    <div className="flex-1 min-w-0">
                      <span className="text-gray-500 text-xs block">{labelMap[key]}</span>
                      <span className="text-white text-sm font-medium">{value}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ══════════════ 仲間一覧（ルフィ限定・横スクロール） ══════════════ */}
        {isLuffy && (
          <div>
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-widest mb-3 flex items-center gap-2 px-1">
              <span>⚓</span> 麦わらの一味
            </p>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide"
              style={{ scrollbarWidth: 'none' }}>
              {LUFFY_CREW.map((member) => (
                <div
                  key={member.name}
                  className="flex-shrink-0 bg-gray-900/80 rounded-xl p-3 border border-white/5 text-center w-24"
                >
                  <div className="text-2xl mb-1.5">{member.emoji}</div>
                  <p className="text-white text-xs font-semibold leading-tight line-clamp-2">{member.name}</p>
                  <p className="text-gray-500 text-[10px] mt-1">{member.role}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══════════════ 名言セクション ══════════════ */}
        {catchphrases.length > 0 && (
          <div>
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-widest mb-3 flex items-center gap-2 px-1">
              <span>💬</span> 名言
            </p>
            <div className="space-y-3">
              {catchphrases.map((phrase, i) => (
                <div
                  key={i}
                  className="bg-gray-900/70 rounded-xl p-4 border border-purple-900/30 relative overflow-hidden"
                >
                  {/* 引用符装飾 */}
                  <span className="absolute top-2 left-3 text-3xl text-purple-800/30 font-serif leading-none select-none">"</span>
                  <p className="text-gray-200 text-sm leading-relaxed pl-4 italic">{phrase}</p>
                  <span className="absolute bottom-1 right-3 text-3xl text-purple-800/30 font-serif leading-none select-none">"</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══════════════ 最新Moments ══════════════ */}
        {moments.length > 0 && (
          <div>
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-widest mb-3 flex items-center gap-2 px-1">
              <span>📸</span> 最新Moments
            </p>
            <div className="space-y-3">
              {moments.map((moment) => (
                <MomentCard key={moment.id} moment={moment} />
              ))}
            </div>
          </div>
        )}

        {/* ══════════════ レベル & 星 ══════════════ */}
        <div className="bg-gray-900/80 rounded-2xl p-5 border border-white/5 shadow-lg">
          <p className="text-gray-500 text-xs font-semibold uppercase tracking-widest mb-3">絆レベル</p>

          <div className="flex items-center gap-1 mb-4">
            {Array.from({ length: maxStars }).map((_, i) => (
              <SparkStar key={i} filled={i < filledStars} delay={i * 0.15} />
            ))}
            <span className="ml-2 text-white font-bold text-lg">Level {level}</span>
            <span className="ml-1 text-gray-400 text-sm">「{levelInfo?.name ?? '—'}」</span>
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
              <div className="absolute inset-0 rounded-full bg-purple-500/10" />
              <div
                className="h-full rounded-full transition-all duration-1000 ease-out relative overflow-hidden"
                style={{
                  width: xpAnimated ? `${xpPercent}%` : '0%',
                  background: 'linear-gradient(90deg, #7c3aed, #db2777)',
                  boxShadow: '0 0 12px rgba(168,85,247,0.8)',
                }}
              >
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

        {/* ══════════════ 統計カード ══════════════ */}
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

        {/* ══════════════ マイルストーン タイムライン ══════════════ */}
        <div>
          <p className="text-gray-500 text-xs font-semibold uppercase tracking-widest mb-4 px-1">マイルストーン</p>
          <div className="relative">
            <div className="absolute left-[22px] top-0 bottom-0 w-0.5 bg-gradient-to-b from-purple-600/60 via-gray-700/40 to-transparent" />
            <div className="space-y-3">
              {milestonesData?.milestones.map((m, idx) => (
                <div key={m.id} className="relative flex items-start gap-4 pl-2">
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
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
