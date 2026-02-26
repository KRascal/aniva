'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { RELATIONSHIP_LEVELS } from '@/types/character';
import { FcMembershipSection } from '@/components/FcMembershipSection';

/* ───────────────────────── Luffy 固定データ ───────────────────────── */
/* ───────────────────────── キャラクター情報データ ───────────────────────── */
interface CharacterProfile {
  birthday: string;
  age: string;
  height: string;
  origin: string;
  affiliation: string;
  ability?: string;
  likes: string;
  dream: string;
  bloodType?: string;
  bounty?: string;
}

const CHARACTER_PROFILES: Record<string, CharacterProfile> = {
  luffy: {
    birthday: '5月5日',
    age: '19歳',
    height: '174cm',
    origin: '東の海 フーシャ村',
    affiliation: '麦わらの一味（船長）',
    ability: 'ゴムゴムの実（超人系）',
    likes: '肉（とにかく肉！）',
    dream: '海賊王になること',
    bloodType: 'F型',
    bounty: '30億ベリー',
  },
  zoro: {
    birthday: '11月11日',
    age: '21歳',
    height: '181cm',
    origin: '東の海 シモツキ村',
    affiliation: '麦わらの一味（戦闘員）',
    ability: '三刀流',
    likes: '酒、筋トレ',
    dream: '世界一の剣豪になること',
    bloodType: 'XF型',
    bounty: '11億1100万ベリー',
  },
  nami: {
    birthday: '7月3日',
    age: '20歳',
    height: '170cm',
    origin: '東の海 ココヤシ村',
    affiliation: '麦わらの一味（航海士）',
    ability: '天候棒（クリマ・タクト）',
    likes: 'お金、みかん',
    dream: '世界地図を描くこと',
    bloodType: 'X型',
    bounty: '3億6600万ベリー',
  },
  sanji: {
    birthday: '3月2日',
    age: '21歳',
    height: '180cm',
    origin: '北の海 ジェルマ王国',
    affiliation: '麦わらの一味（コック）',
    ability: '黒足（悪魔風脚）',
    likes: '料理、女性',
    dream: 'オールブルーを見つけること',
    bloodType: 'S型',
    bounty: '10億3200万ベリー',
  },
  chopper: {
    birthday: '12月24日',
    age: '17歳',
    height: '90cm（通常時）',
    origin: '偉大なる航路 ドラム島',
    affiliation: '麦わらの一味（船医）',
    ability: 'ヒトヒトの実（動物系）',
    likes: 'わたあめ、Dr.くれは',
    dream: '万能薬になること',
    bloodType: 'X型',
    bounty: '1000ベリー',
  },
  ace: {
    birthday: '1月1日',
    age: '20歳（享年）',
    height: '185cm',
    origin: '南の海 バテリラ',
    affiliation: '白ひげ海賊団（2番隊隊長）',
    ability: 'メラメラの実（自然系）',
    likes: '冒険、弟たち',
    dream: '白ひげを海賊王にすること',
    bloodType: 'S型',
    bounty: '5億5000万ベリー',
  },
};

const PROFILE_LABELS: Record<keyof CharacterProfile, string> = {
  birthday: '誕生日',
  age: '年齢',
  height: '身長',
  origin: '出身',
  affiliation: '所属',
  ability: '能力',
  likes: '好きなもの',
  dream: '夢',
  bloodType: '血液型',
  bounty: '懸賞金',
};

const CREW_MEMBERS: Record<string, { name: string; role: string }[]> = {
  luffy: [
    { name: 'ロロノア・ゾロ', role: '剣豪' },
    { name: 'ナミ', role: '航海士' },
    { name: 'ウソップ', role: '狙撃手' },
    { name: 'サンジ', role: 'コック' },
    { name: 'チョッパー', role: '船医' },
    { name: 'ロビン', role: '考古学者' },
    { name: 'フランキー', role: '船大工' },
    { name: 'ブルック', role: '音楽家' },
    { name: 'ジンベエ', role: '操舵手' },
  ],
  zoro: [
    { name: 'くいな', role: '幼馴染・ライバル' },
    { name: 'コウシロウ', role: '師匠' },
    { name: 'ミホーク', role: '目標の剣士' },
  ],
  nami: [
    { name: 'ベルメール', role: '育ての母' },
    { name: 'ノジコ', role: '義姉' },
    { name: 'ゲンゾウ', role: '村長' },
  ],
  sanji: [
    { name: 'ゼフ', role: '育ての親・料理の師匠' },
    { name: 'ヴィンスモーク・ジャッジ', role: '実父' },
    { name: 'レイジュ', role: '姉' },
  ],
  chopper: [
    { name: 'Dr.ヒルルク', role: '恩人' },
    { name: 'Dr.くれは', role: '師匠' },
  ],
  ace: [
    { name: 'モンキー・D・ルフィ', role: '義弟' },
    { name: 'サボ', role: '義兄弟' },
    { name: 'エドワード・ニューゲート', role: '白ひげ（親父）' },
  ],
};

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

interface PersonalityTrait {
  trait: string;
  value: number;
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
  personalityTraits?: PersonalityTrait[];
  fcMonthlyPriceJpy: number;
  fcIncludedCallMin: number;
  fcOverageCallCoinPerMin: number;
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
  visibility?: string;
}

/* ───────────────────────── サブコンポーネント ───────────────────────── */

function SparkStar({ filled, delay }: { filled: boolean; delay: number }) {
  return (
    <span
      className={`inline-block transition-all duration-300 ${
        filled ? 'animate-[sparkle_1.5s_ease-in-out_infinite]' : 'opacity-25'
      }`}
      style={{ animationDelay: `${delay}s` }}
    >
      <svg
        className={`w-6 h-6 ${filled ? 'text-yellow-400' : 'text-gray-600'}`}
        viewBox="0 0 24 24"
        fill={filled ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth={filled ? 0 : 1.5}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
      </svg>
    </span>
  );
}

/* ── 日本語トレイト名マップ ── */
const TRAIT_LABELS: Record<string, string> = {
  adventurous: '冒険心',
  loyal: '仲間への忠誠',
  simple: '純粋さ',
  brave: '勇気',
  hungry: '食欲',
  cheerful: '明るさ',
  stoic: '寡黙',
  disciplined: '鍛錬',
  directional_sense: '方向感覚',
  kind: '優しさ',
  smart: '知性',
  funny: 'お茶目',
  serious: '真剣さ',
  emotional: '感情豊か',
};

const TRAIT_COLORS: Record<string, string> = {
  adventurous: 'from-orange-500 to-red-500',
  loyal: 'from-yellow-400 to-amber-500',
  simple: 'from-cyan-400 to-blue-500',
  brave: 'from-red-500 to-rose-600',
  hungry: 'from-orange-400 to-yellow-500',
  cheerful: 'from-pink-400 to-rose-500',
  stoic: 'from-gray-500 to-slate-600',
  disciplined: 'from-emerald-500 to-green-600',
  directional_sense: 'from-indigo-400 to-purple-500',
};

function PersonalityTraitsSection({ traits }: { traits: PersonalityTrait[] }) {
  if (!traits || traits.length === 0) return null;
  return (
    <div>
      <p className="text-gray-400 text-xs font-semibold uppercase tracking-widest mb-3 px-1">
        パーソナリティ
      </p>
      <div className="bg-gray-900/80 rounded-2xl p-5 border border-white/5 space-y-3">
        {traits.map((t) => {
          const label = TRAIT_LABELS[t.trait] ?? t.trait;
          const color = TRAIT_COLORS[t.trait] ?? 'from-purple-500 to-pink-500';
          const pct = Math.min(100, t.value);
          return (
            <div key={t.trait}>
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-sm text-gray-300 font-medium">{label}</span>
                <span className="text-xs text-gray-500 font-mono">{pct}</span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${color}`}
                  style={{ width: `${pct}%`, transition: 'width 1s ease-out' }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MomentCard({ moment }: { moment: MomentItem }) {
  if (moment.isLocked) {
    return (
      <div className="bg-gray-900/60 rounded-xl p-4 border border-gray-800/60 flex items-center gap-3">
        <div className="opacity-40">
          <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
        </div>
        <div>
          <p className="text-gray-500 text-sm">ロックされたMoment</p>
          <p className="text-gray-600 text-xs mt-0.5">プランをアップグレードして解放</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900/70 rounded-xl p-4 border border-white/5 shadow-sm">
      <div className="flex items-start gap-3">
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
            <span className="text-xs text-gray-600 flex items-center gap-0.5">
                <svg className="w-3 h-3 text-gray-500" fill="currentColor" viewBox="0 0 24 24"><path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" /></svg>
                {moment.reactionCount}
              </span>
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
  const [followerCount, setFollowerCount] = useState(0);
  const [followLoading, setFollowLoading] = useState(false);
  const [fanclubLoading, setFanclubLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'posts' | 'fc' | 'profile'>('posts');

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

  // Moments（最近20件）
  useEffect(() => {
    if (!characterId) return;
    fetch(`/api/moments?characterId=${characterId}&limit=20`)
      .then((res) => res.json())
      .then((data) => { if (data.moments) setMoments(data.moments); })
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
        setFollowerCount(followData.followerCount ?? 0);
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
      if (data.followerCount !== undefined) setFollowerCount(data.followerCount);
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
      if (data.requiresPayment) {
        // 課金が必要（DEMO_MODE=false の本番環境）
        alert(`月額¥${data.monthlyPrice.toLocaleString()}の課金が必要です（現在デモのため無料で開放中）`);
        return;
      }
      setIsFanclub(data.isFanclub);
      setIsFollowing(data.isFollowing);
    } catch (err) {
      console.error('Fanclub error:', err);
    } finally {
      setFanclubLoading(false);
    }
  };

  const handleChat = () => {
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
  // Character profile data is now dynamic for all characters
  const catchphrases: string[] = character?.catchphrases ?? [];

  return (
    <div className="min-h-screen bg-gray-950 max-w-lg mx-auto pb-8">

      {/* ══════════════ ヒーローセクション ══════════════ */}
      <div className="relative">
        {/* カバー画像（ヒーロー） */}
        <div className="relative h-56 overflow-hidden">
          {character?.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={character.coverUrl}
              alt="cover"
              className="w-full h-full object-cover scale-105 hover:scale-100 transition-transform duration-700"
            />
          ) : character?.avatarUrl ? (
            /* フォールバック：アバターをぼかしてカバーに */
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={character.avatarUrl}
                alt=""
                className="w-full h-full object-cover scale-110"
                style={{ filter: 'blur(20px) brightness(0.4) saturate(1.8)' }}
              />
              <div className="absolute inset-0 bg-gradient-to-br from-orange-900/60 via-red-900/40 to-purple-950/60" />
            </>
          ) : (
            /* 完全フォールバック：グラデーション背景 */
            <div className="w-full h-full bg-gradient-to-br from-orange-900 via-red-900 to-purple-950" />
          )}
          {/* オーバーレイ */}
          <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/30 to-transparent" />
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
                  <span className="text-4xl font-black text-white">{character?.name?.charAt(0) ?? '?'}</span>
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
            {followerCount > 0 && (
              <p className="text-gray-400 text-xs mt-0.5">
                {followerCount.toLocaleString()} フォロワー
              </p>
            )}
            {catchphrases.length > 0 && (
              <p className="text-gray-300 text-xs mt-1 italic leading-relaxed line-clamp-2">
                「{catchphrases[0]}」
              </p>
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

          {/* チャットボタン（常時オープン） */}
          <button
            onClick={handleChat}
            className="flex-1 relative py-3 rounded-2xl font-bold text-sm active:scale-[0.97] transition-all flex items-center justify-center gap-2 overflow-hidden text-white"
            style={{ background: 'linear-gradient(135deg, #ea580c, #dc2626, #7c3aed)' }}
          >
            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-[shimmer_3s_linear_infinite]" />
            <span className="relative z-10 flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
              </svg>
              チャット
            </span>
          </button>
        </div>

        {/* ══════════════ タブナビゲーション ══════════════ */}
        <div className="sticky top-[57px] z-10 -mx-4 px-4 bg-gray-950/90 backdrop-blur-xl border-b border-white/5">
          <div className="flex">
            {[
              { id: 'posts' as const, label: '投稿' },
              { id: 'fc' as const, label: 'FC限定' },
              { id: 'profile' as const, label: '関係値' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-3 text-sm font-semibold transition-colors flex items-center justify-center border-b-2 ${
                  activeTab === tab.id
                    ? 'border-purple-500 text-white'
                    : 'border-transparent text-white/40 hover:text-white/60'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ══════════════ タブコンテンツ: 投稿 ══════════════ */}
        {activeTab === 'posts' && (
          <div className="space-y-3 pt-2">
            {moments.filter(m => m.visibility !== 'PREMIUM' || isFanclub || !m.isLocked).length === 0 ? (
              <div className="text-center py-12">
                <div className="flex justify-center mb-3">
                  <svg className="w-12 h-12 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 9v.906a2.25 2.25 0 01-1.183 1.981l-6.478 3.488M2.25 9v.906a2.25 2.25 0 001.183 1.981l6.478 3.488m8.839 2.51l-4.66-2.51m0 0l-1.023-.55a2.25 2.25 0 00-2.134 0l-1.022.55m0 0l-4.661 2.51m16.5 1.615a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V8.844a2.25 2.25 0 011.183-1.98l7.5-4.04a2.25 2.25 0 012.134 0l7.5 4.04a2.25 2.25 0 011.183 1.98V19.5z" />
                  </svg>
                </div>
                <p className="text-white/40 text-sm">まだ投稿がありません</p>
              </div>
            ) : (
              moments.map((moment) => (
                <MomentCard key={moment.id} moment={moment} />
              ))
            )}
          </div>
        )}

        {/* ══════════════ タブコンテンツ: FC限定 ══════════════ */}
        {activeTab === 'fc' && (
          <div className="space-y-4 pt-2">
            {character && (
              <FcMembershipSection
                characterId={characterId}
                characterName={character.name}
                isFanclub={isFanclub}
                fcMonthlyPriceJpy={character.fcMonthlyPriceJpy}
                fcIncludedCallMin={character.fcIncludedCallMin}
                fcOverageCallCoinPerMin={character.fcOverageCallCoinPerMin}
                onJoinFC={handleFanclub}
                onCancel={isFanclub ? handleFanclub : undefined}
              />
            )}
            {isFanclub ? (
              <>
                <p className="text-gray-400 text-xs font-semibold uppercase tracking-widest px-1">FC限定コンテンツ</p>
                {moments.filter(m => m.visibility === 'PREMIUM' || m.visibility === 'STANDARD').length === 0 ? (
                  <div className="text-center py-10">
                    <div className="flex justify-center mb-3">
                      <svg className="w-10 h-10 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                      </svg>
                    </div>
                    <p className="text-white/40 text-sm">FC限定コンテンツは準備中です</p>
                  </div>
                ) : (
                  moments.filter(m => m.visibility === 'PREMIUM' || m.visibility === 'STANDARD').map((moment) => (
                    <MomentCard key={moment.id} moment={moment} />
                  ))
                )}
              </>
            ) : (
              <div className="bg-gray-900/70 rounded-2xl p-5 border border-purple-900/30 text-center">
                <div className="flex justify-center mb-2">
                  <svg className="w-8 h-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                </div>
                <p className="text-white font-bold text-sm mb-1">FC限定コンテンツ</p>
                <p className="text-white/40 text-xs">ファンクラブに加入するとここに限定投稿が表示されます</p>
              </div>
            )}
          </div>
        )}

        {/* ══════════════ タブコンテンツ: プロフィール ══════════════ */}
        {activeTab === 'profile' && (
        <div className="space-y-5 pt-2">

        {/* ══════════════ 基本情報カード（全キャラ対応） ══════════════ */}
        {character && CHARACTER_PROFILES[character.slug] && (
          <div className="bg-gray-900/80 rounded-2xl p-5 border border-white/10 shadow-lg">
            <p className="text-purple-400 text-xs font-semibold uppercase tracking-widest mb-4">
              プロフィール
            </p>
            <div className="space-y-0">
              {(Object.entries(CHARACTER_PROFILES[character.slug]) as [keyof CharacterProfile, string][]).map(([key, value]) => {
                if (!value) return null;
                return (
                  <div key={key} className="flex items-center justify-between gap-3 py-2.5 border-b border-white/5 last:border-0">
                    <span className="text-gray-400 text-xs flex-shrink-0">{PROFILE_LABELS[key]}</span>
                    <span className="text-white text-sm font-medium text-right">{value}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ══════════════ 紹介文 ══════════════ */}
        {character?.description && (
          <div className="bg-gray-900/80 rounded-2xl p-5 border border-white/10 shadow-lg">
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-widest mb-3">
              紹介
            </p>
            <p className="text-gray-300 text-sm leading-relaxed">{character.description}</p>
          </div>
        )}

        {/* ══════════════ 関連キャラ（横スクロール） ══════════════ */}
        {character && CREW_MEMBERS[character.slug] && (
          <div>
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-widest mb-3 px-1">
              関連キャラクター
            </p>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide"
              style={{ scrollbarWidth: 'none' }}>
              {CREW_MEMBERS[character.slug].map((member) => (
                <div
                  key={member.name}
                  className="flex-shrink-0 bg-gray-900/80 rounded-xl p-3 border border-white/5 text-center w-24"
                >
                  <div className="w-8 h-8 rounded-full bg-gray-700/80 flex items-center justify-center mx-auto mb-1.5">
                    <span className="text-white text-xs font-bold">{member.name.charAt(0)}</span>
                  </div>
                  <p className="text-white text-xs font-semibold leading-tight line-clamp-2">{member.name}</p>
                  <p className="text-gray-500 text-[10px] mt-1">{member.role}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══════════════ パーソナリティトレイト ══════════════ */}
        {character?.personalityTraits && Array.isArray(character.personalityTraits) && character.personalityTraits.length > 0 && (
          <PersonalityTraitsSection traits={character.personalityTraits as PersonalityTrait[]} />
        )}

        {/* ══════════════ 名言セクション ══════════════ */}
        {catchphrases.length > 0 && (
          <div>
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-widest mb-3 px-1">
              名言
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
              <div className="flex justify-center mb-1.5">
                <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                </svg>
              </div>
              <div className="text-white font-black text-xl leading-none">
                {(relationship?.totalMessages ?? 0).toLocaleString()}
              </div>
              <div className="text-gray-500 text-xs mt-1">メッセージ</div>
            </div>
            <div className="bg-gray-900/80 rounded-2xl p-4 border border-white/5 text-center">
              <div className="flex justify-center mb-1.5">
                <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                </svg>
              </div>
              <div className="text-white font-bold text-sm leading-tight">
                {relationship?.firstMessageAt
                  ? new Date(relationship.firstMessageAt).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })
                  : '—'}
              </div>
              <div className="text-gray-500 text-xs mt-1">最初の会話</div>
            </div>
            <div className="bg-gray-900/80 rounded-2xl p-4 border border-white/5 text-center">
              <div className="flex justify-center mb-1.5">
                <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
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
        )}
        {/* ══ profile tab end ══ */}

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
