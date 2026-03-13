'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { RELATIONSHIP_LEVELS } from '@/types/character';
import { FcMembershipSection } from '@/components/FcMembershipSection';
import { MomentCard as SharedMomentCard, MOMENT_CARD_STYLES, type Moment as SharedMoment } from '@/components/moments/MomentCard';
import { FanStatsPanel } from '@/components/character/FanStatsPanel';
import { FcContentList } from '@/components/fc/FcContentList';

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
  preferences?: { 呼び名?: string; 趣味?: string[] };
}

const PRESET_INTERESTS = ['アニメ', 'ゲーム', '音楽', 'スポーツ', '料理', '旅行', '読書', '映画', 'テクノロジー', 'アート'] as const;

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
  birthday?: string | null;
}

interface DiaryItem {
  id: string;
  characterId: string;
  date: string;
  content: string;
  mood: string;
  imageUrl: string | null;
  likes: number;
  createdAt: string;
  isLiked: boolean;
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

interface DlContent {
  id: string;
  title: string;
  description: string | null;
  type: string;
  thumbnailUrl: string | null;
  fcOnly: boolean;
  downloadCount: number;
  createdAt: string;
  locked: boolean;
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

/* MomentCard is now imported from shared component */

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
  const searchParams = useSearchParams();
  const initialTab = (['posts', 'fc', 'dl', 'profile', 'diary'] as const).includes(
    searchParams.get('tab') as 'posts' | 'fc' | 'dl' | 'profile' | 'diary'
  )
    ? (searchParams.get('tab') as 'posts' | 'fc' | 'dl' | 'profile' | 'diary')
    : 'posts';
  const [activeTab, setActiveTab] = useState<'posts' | 'fc' | 'dl' | 'profile' | 'diary'>(initialTab);
  const [dlContents, setDlContents] = useState<DlContent[]>([]);
  const [dlLoading, setDlLoading] = useState(false);
  const [diaries, setDiaries] = useState<DiaryItem[]>([]);
  const [diaryLoading, setDiaryLoading] = useState(false);
  const [diaryPage, setDiaryPage] = useState(1);
  const [diaryTotalPages, setDiaryTotalPages] = useState(1);

  // IKEA効果: ユーザーカスタマイズ
  const [nickname, setNickname] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [customInterest, setCustomInterest] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // 嫉妬メカニクス: ランキングデータ
  interface RankingEntry {
    rank: number;
    maskedName: string;
    totalMessages: number;
    level: number;
    isMe: boolean;
  }
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [rankingLoading, setRankingLoading] = useState(false);

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

  // プリファレンスをrelationshipデータから読み込み
  useEffect(() => {
    if (relationship?.preferences) {
      setNickname(relationship.preferences['呼び名'] ?? '');
      setInterests(relationship.preferences['趣味'] ?? []);
    }
  }, [relationship]);

  // カスタマイズ保存
  const handleSaveCustomization = async () => {
    if (saveLoading) return;
    setSaveLoading(true);
    try {
      await fetch(`/api/relationship/${characterId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname, interests }),
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Customize save error:', err);
    } finally {
      setSaveLoading(false);
    }
  };

  const toggleInterest = (interest: string) => {
    setInterests((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]
    );
  };

  const addCustomInterest = () => {
    const trimmed = customInterest.trim();
    if (!trimmed || interests.includes(trimmed)) return;
    setInterests((prev) => [...prev, trimmed]);
    setCustomInterest('');
  };

  const handleFollow = async () => {
    if (followLoading) return;
    setFollowLoading(true);
    try {
      const res = await fetch(`/api/relationship/${characterId}/follow`, { method: 'POST' });
      const data = await res.json();
      setIsFollowing(data.isFollowing);
      if (data.followerCount !== undefined) setFollowerCount(data.followerCount);
      // フォロー時にウェルカムメッセージ送信
      if (data.isFollowing) {
        fetch(`/api/relationship/${characterId}/follow-welcome`, { method: 'POST' }).catch(() => {});
      }
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
      // Stripe Checkout経由でFC加入
      const stripeRes = await fetch('/api/fc/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterId, returnUrl: `/profile/${characterId}` }),
      });
      const stripeData = await stripeRes.json() as { checkoutUrl?: string; error?: string };

      if (stripeData.checkoutUrl) {
        window.location.href = stripeData.checkoutUrl;
        return;
      }
      if (stripeData.error === 'Already subscribed') {
        setIsFanclub(true);
        return;
      }

      // フォールバック: DEMOモードAPI
      const res = await fetch(`/api/relationship/${characterId}/fanclub`, { method: 'POST' });
      const data = await res.json();
      if (data.requiresPayment) {
        router.push(`/chat/${characterId}?openFc=1`);
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

  // 限定DLコンテンツ取得
  useEffect(() => {
    if (!characterId) return;
    setDlLoading(true);
    fetch(`/api/content?characterId=${characterId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.contents) setDlContents(data.contents as DlContent[]);
      })
      .catch(console.error)
      .finally(() => setDlLoading(false));
  }, [characterId]);

  // ランキングフェッチ（嫉妬メカニクス）
  useEffect(() => {
    if (!characterId || !userId) return;
    setRankingLoading(true);

    // 匿名マスク用のキャラクター職業リスト
    const maskNames = ['海賊A', '剣士B', '航海士C', '料理人D', '船医E', '考古学者F', '大工G', '音楽家H', '操舵手I', '狙撃手J'];

    fetch(`/api/ranking/${characterId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.ranking) {
          // ランキングエントリをマスク済み形式に変換
          const masked = (data.ranking as {
            rank: number;
            isMe: boolean;
            totalMessages: number;
            level: number;
            displayName: string;
          }[]).map((entry) => ({
            rank: entry.rank,
            maskedName: entry.isMe ? (userId ? 'あなた' : maskNames[(entry.rank - 1) % maskNames.length]) : maskNames[(entry.rank - 1) % maskNames.length],
            totalMessages: entry.totalMessages,
            level: entry.level,
            isMe: entry.isMe,
          }));
          setRanking(masked);
        }
        // myRankはオブジェクトまたはnullで返る
        if (data.myRank && typeof data.myRank === 'object') {
          setMyRank((data.myRank as { rank: number }).rank);
        } else if (typeof data.myRank === 'number') {
          setMyRank(data.myRank);
        }
      })
      .catch(() => {})
      .finally(() => setRankingLoading(false));
  }, [characterId, userId]);

  // 日記フェッチ
  useEffect(() => {
    if (!characterId) return;
    setDiaryLoading(true);
    fetch(`/api/diary/${characterId}?page=${diaryPage}&limit=10`)
      .then((res) => res.json())
      .then((data) => {
        if (data.diaries) {
          setDiaries((prev) => (diaryPage === 1 ? data.diaries : [...prev, ...data.diaries]));
        }
        if (data.pagination) {
          setDiaryTotalPages(data.pagination.totalPages);
        }
      })
      .catch(console.error)
      .finally(() => setDiaryLoading(false));
  }, [characterId, diaryPage]);

  // 日記いいね
  const handleDiaryLike = useCallback(async (diaryId: string) => {
    if (!session?.user) return;
    setDiaries((prev) =>
      prev.map((d) => {
        if (d.id !== diaryId) return d;
        const liked = !d.isLiked;
        return { ...d, isLiked: liked, likes: liked ? d.likes + 1 : Math.max(0, d.likes - 1) };
      })
    );
    try {
      const res = await fetch(`/api/diary/${characterId}/${diaryId}/like`, { method: 'POST' });
      if (res.ok) {
        const { liked, likes } = await res.json();
        setDiaries((prev) => prev.map((d) => (d.id === diaryId ? { ...d, isLiked: liked, likes } : d)));
      }
    } catch {
      // revert
      setDiaries((prev) =>
        prev.map((d) => {
          if (d.id !== diaryId) return d;
          const liked = !d.isLiked;
          return { ...d, isLiked: liked, likes: liked ? d.likes + 1 : Math.max(0, d.likes - 1) };
        })
      );
    }
  }, [characterId, session]);

  // いいね機能（タイムラインと同じ楽観的更新+API）
  const handleLike = useCallback(async (momentId: string) => {
    if (!session?.user) return;
    setMoments((prev) =>
      prev.map((m) => {
        if (m.id !== momentId) return m;
        const liked = !m.userHasLiked;
        return { ...m, userHasLiked: liked, reactionCount: liked ? m.reactionCount + 1 : m.reactionCount - 1 };
      })
    );
    try {
      const res = await fetch(`/api/moments/${momentId}/react`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'like' }),
      });
      if (res.ok) {
        const { liked, reactionCount } = await res.json();
        setMoments((prev) =>
          prev.map((m) => (m.id === momentId ? { ...m, userHasLiked: liked, reactionCount } : m))
        );
      }
    } catch {
      // revert on error
      setMoments((prev) =>
        prev.map((m) => {
          if (m.id !== momentId) return m;
          const liked = !m.userHasLiked;
          return { ...m, userHasLiked: liked, reactionCount: liked ? m.reactionCount + 1 : m.reactionCount - 1 };
        })
      );
    }
  }, [session]);

  // MomentItem → SharedMoment 変換（character情報を付与）
  const toSharedMoment = useCallback((m: MomentItem): SharedMoment => ({
    ...m,
    characterId: characterId,
    character: {
      name: character?.name ?? '',
      avatarUrl: character?.avatarUrl ?? null,
    },
    visibility: m.visibility ?? 'PUBLIC',
    levelRequired: 0,
  }), [characterId, character]);

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
    <div className="min-h-screen bg-gray-950 max-w-lg mx-auto pb-24">

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
            {/* オンラインステータス */}
            <span className="absolute top-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-gray-950 shadow-[0_0_6px_rgba(74,222,128,0.6)]" />
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

        {/* キャラクター紹介文 */}
        {character?.description && (
          <div className="bg-gray-900/60 rounded-2xl p-4 border border-white/5">
            <p className="text-gray-300 text-sm leading-relaxed">{character.description}</p>
          </div>
        )}

        {/* ファン統計パネル — 嫉妬メカニクス */}
        {character?.slug && <FanStatsPanel characterSlug={character.slug} />}

        {/* ══════════════ アクションボタン ══════════════ */}
        {/* 思い出ブックボタン */}
        <button
          onClick={() => router.push(`/memory-book/${characterId}`)}
          className="w-full py-2.5 rounded-2xl font-semibold text-sm active:scale-[0.97] transition-all flex items-center justify-center gap-2 bg-amber-900/40 border border-amber-700/40 text-amber-300 hover:bg-amber-900/60 mb-3"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
          </svg>
          思い出ブック
        </button>

        {/* ファン掲示板リンク */}
        <button
          onClick={() => router.push(`/community/${character?.slug || characterId}`)}
          className="w-full py-2.5 rounded-2xl font-semibold text-sm active:scale-[0.97] transition-all flex items-center justify-center gap-2 bg-indigo-900/30 border border-indigo-700/30 text-indigo-300 hover:bg-indigo-900/50 mb-3"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
          </svg>
          ファン掲示板
        </button>

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
        <div className="sticky top-0 z-30 -mx-4 px-4 bg-gray-950 border-b border-white/5">
          <div className="flex">
            {[
              { id: 'posts' as const, label: '投稿' },
              { id: 'fc' as const, label: 'FC限定' },
              { id: 'dl' as const, label: 'ショップ' },
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
          <div className="space-y-3 pt-2 pb-24">
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
                <SharedMomentCard key={moment.id} moment={toSharedMoment(moment)} onLike={handleLike} currentUserId={userId} />
              ))
            )}

            {/* 🔒 親密度ゲート ティーザー */}
            {relationship && level < 5 && (
              <div className="mt-2 bg-gray-900/60 border border-white/8 rounded-2xl p-4 text-center space-y-3">
                <div className="flex items-center justify-center gap-2">
                  <span className="text-xl">{level >= 3 ? '⭐' : '🔒'}</span>
                  <p className="text-white/70 text-sm font-medium">
                    {level < 3
                      ? `Lv3で特別な投稿が解放されます`
                      : `Lv5でFC限定投稿が全解放されます`}
                  </p>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, ((level - 1) / 4) * 100)}%` }}
                  />
                </div>
                <p className="text-white/30 text-xs">
                  現在 Lv{level} — もっと話しかけて親密度を上げよう
                </p>
                <a
                  href={`/chat/${characterId}`}
                  className="inline-flex items-center gap-1.5 bg-purple-700/50 hover:bg-purple-700/70 text-purple-200 text-xs font-medium py-2 px-4 rounded-xl transition-colors border border-purple-600/30"
                >
                  <span>💬</span>
                  話しかける
                </a>
              </div>
            )}
          </div>
        )}

        {/* ══════════════ タブコンテンツ: 日記 ══════════════ */}
        {activeTab === 'diary' && (
          <div className="space-y-3 pt-2 pb-24">
            {diaryLoading && diaries.length === 0 ? (
              <div className="text-center py-12 text-white/30 text-sm">読み込み中...</div>
            ) : diaries.length === 0 ? (
              <div className="text-center py-12">
                <div className="flex justify-center mb-3">
                  <svg className="w-12 h-12 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                  </svg>
                </div>
                <p className="text-white/40 text-sm">まだ日記がありません</p>
              </div>
            ) : (
              <>
                {diaries.map((diary) => {
                  const moodConfig: Record<string, { label: string; gradient: string; badge: string; accent: string }> = {
                    happy:      { label: 'Happy', gradient: 'from-yellow-900/30 to-orange-900/20', badge: 'bg-yellow-500/15 text-yellow-400/80', accent: 'border-yellow-500/20' },
                    sad:        { label: 'Melancholy', gradient: 'from-blue-900/30 to-indigo-900/20', badge: 'bg-blue-500/15 text-blue-400/80', accent: 'border-blue-500/20' },
                    excited:    { label: 'Excited', gradient: 'from-pink-900/30 to-red-900/20', badge: 'bg-pink-500/15 text-pink-400/80', accent: 'border-pink-500/20' },
                    tired:      { label: 'Tired', gradient: 'from-gray-800/40 to-gray-900/30', badge: 'bg-gray-500/15 text-gray-400/80', accent: 'border-gray-500/20' },
                    neutral:    { label: 'Calm', gradient: 'from-gray-800/30 to-gray-900/20', badge: 'bg-gray-500/15 text-gray-400/80', accent: 'border-gray-500/20' },
                    nostalgic:  { label: 'Nostalgic', gradient: 'from-purple-900/30 to-violet-900/20', badge: 'bg-purple-500/15 text-purple-400/80', accent: 'border-purple-500/20' },
                    mysterious: { label: 'Mysterious', gradient: 'from-indigo-900/30 to-purple-900/20', badge: 'bg-indigo-500/15 text-indigo-400/80', accent: 'border-indigo-500/20' },
                    playful:    { label: 'Playful', gradient: 'from-green-900/30 to-teal-900/20', badge: 'bg-green-500/15 text-green-400/80', accent: 'border-green-500/20' },
                  };
                  const cfg = moodConfig[diary.mood] ?? moodConfig['neutral'];
                  return (
                    <div
                      key={diary.id}
                      className={`rounded-2xl p-5 bg-gradient-to-br ${cfg.gradient} border ${cfg.accent}`}
                    >
                      {/* ヘッダー */}
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-white/40 text-xs tracking-wider">{diary.date}</span>
                        <span className={`text-[10px] px-2.5 py-1 rounded-full font-medium tracking-wide ${cfg.badge}`}>
                          {cfg.label}
                        </span>
                      </div>
                      {/* 本文 */}
                      <p className="text-white/90 text-sm leading-relaxed">{diary.content}</p>
                      {/* いいねボタン */}
                      <div className="flex items-center gap-1 mt-3">
                        <button
                          onClick={() => handleDiaryLike(diary.id)}
                          className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-full transition-all border ${
                            diary.isLiked
                              ? 'bg-pink-600/30 border-pink-500/50 text-pink-300'
                              : 'bg-white/5 border-white/10 text-white/40 hover:text-white/70'
                          }`}
                        >
                          <svg className="w-3.5 h-3.5" fill={diary.isLiked ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                          </svg>
                          <span>{diary.likes}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
                {/* もっと見るボタン */}
                {diaryPage < diaryTotalPages && (
                  <button
                    onClick={() => setDiaryPage((p) => p + 1)}
                    disabled={diaryLoading}
                    className="w-full py-3 text-sm text-white/50 hover:text-white/80 border border-white/10 rounded-2xl transition-colors"
                  >
                    {diaryLoading ? '読み込み中...' : 'もっと見る'}
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {/* ══════════════ タブコンテンツ: FC限定 ══════════════ */}
        {activeTab === 'fc' && (
          <div className="space-y-4 pt-2 pb-24">
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
              <FcContentList characterId={characterId} />
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

        {/* ══════════════ タブコンテンツ: ショップ ══════════════ */}
        {activeTab === 'dl' && (
          <div className="space-y-4 pt-2 pb-24">
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-widest px-1">
              ショップ
            </p>
            {dlLoading ? (
              <div className="text-center py-10 text-white/30 text-sm">読み込み中...</div>
            ) : dlContents.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-white/40 text-sm">ダウンロードコンテンツはまだありません</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {dlContents.map((item) => (
                  <div
                    key={item.id}
                    className={`relative rounded-2xl overflow-hidden border ${
                      item.locked
                        ? 'border-gray-700/50 bg-gray-900/60'
                        : 'border-purple-500/30 bg-gray-900/80'
                    }`}
                  >
                    {/* サムネイル */}
                    {item.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.thumbnailUrl}
                        alt={item.title}
                        className={`w-full h-28 object-cover ${item.locked ? 'filter blur-sm opacity-50' : ''}`}
                      />
                    ) : (
                      <div className={`w-full h-28 flex items-center justify-center ${item.locked ? 'opacity-30 bg-gray-800/30' : 'bg-gray-800/50'}`}>
                        <svg className="w-8 h-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                          {item.type === 'wallpaper' || item.type === 'special_art' ? (
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                          ) : item.type === 'voice_clip' ? (
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
                          ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.75 7.5h16.5M12 3h.008v.008H12V3zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                          )}
                        </svg>
                      </div>
                    )}

                    {/* ロックオーバーレイ */}
                    {item.locked && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                        <svg className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                        </svg>
                        <span className="text-gray-300 text-xs font-semibold text-center px-2">FC加入で解放</span>
                      </div>
                    )}

                    {/* 情報 */}
                    <div className="p-3">
                      <p className={`text-xs font-semibold truncate ${item.locked ? 'text-gray-500' : 'text-white'}`}>
                        {item.title}
                      </p>
                      {item.description && (
                        <p className="text-gray-500 text-xs mt-0.5 line-clamp-1">{item.description}</p>
                      )}
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-gray-600 text-xs">{item.downloadCount.toLocaleString()}DL</span>
                        {!item.locked ? (
                          <a
                            href={`/api/content/${item.id}/download`}
                            className="inline-flex items-center gap-1 text-xs bg-purple-700/60 hover:bg-purple-700/80 text-purple-200 px-2.5 py-1 rounded-lg transition-colors border border-purple-600/30"
                          >
                            <span>↓</span>DL
                          </a>
                        ) : (
                          <button
                            onClick={() => setActiveTab('fc')}
                            className="text-xs bg-gray-800/60 text-gray-500 px-2.5 py-1 rounded-lg border border-gray-700/30"
                          >
                            FC限定
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══════════════ タブコンテンツ: プロフィール ══════════════ */}
        {activeTab === 'profile' && (
        <div className="space-y-5 pt-2 pb-24">

        {/* ══════════════ 絆レベル表示（目立つ位置） ══════════════ */}
        <div className="flex items-center justify-between gap-3 bg-gradient-to-r from-purple-900/50 to-pink-900/30 border border-purple-500/30 rounded-2xl px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-purple-600/40 border border-purple-500/40 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-purple-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-purple-300 font-semibold">あなたの絆レベル</p>
              <p className="text-white font-black text-lg leading-tight">Lv.{level} <span className="text-purple-300 text-sm font-semibold">「{levelInfo?.name ?? '—'}」</span></p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">{(relationship?.totalMessages ?? 0).toLocaleString()} 通</p>
            <p className="text-xs text-purple-400 mt-0.5">会話回数</p>
          </div>
        </div>

        {/* ══════════════ あなただけの設定（IKEA効果） ══════════════ */}
        <div className="bg-gray-900/60 rounded-2xl p-4 border border-white/5 space-y-4">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
            </svg>
            <p className="text-white font-semibold text-sm">あなただけの設定</p>
          </div>

          {/* 呼び名 */}
          <div className="space-y-1.5">
            <label className="text-gray-400 text-xs">呼び名（キャラがあなたをどう呼ぶか）</label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="例: 太郎くん"
              className="w-full bg-gray-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/60 transition-colors"
              maxLength={20}
            />
          </div>

          {/* 共通の趣味 */}
          <div className="space-y-2">
            <label className="text-gray-400 text-xs">共通の趣味（会話の話題に影響します）</label>
            <div className="flex flex-wrap gap-2">
              {PRESET_INTERESTS.map((interest) => (
                <button
                  key={interest}
                  onClick={() => toggleInterest(interest)}
                  className={`text-sm px-3 py-1 rounded-full border transition-all ${
                    interests.includes(interest)
                      ? 'bg-purple-600 text-white border-purple-500'
                      : 'bg-purple-600/20 text-purple-300 border-purple-500/30 hover:bg-purple-600/30'
                  }`}
                >
                  {interest}
                </button>
              ))}
            </div>
            {/* カスタム入力 */}
            <div className="flex gap-2">
              <input
                type="text"
                value={customInterest}
                onChange={(e) => setCustomInterest(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') addCustomInterest(); }}
                placeholder="カスタム追加..."
                className="flex-1 bg-gray-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/60 transition-colors"
                maxLength={15}
              />
              <button
                onClick={addCustomInterest}
                disabled={!customInterest.trim()}
                className="px-3 py-2 rounded-xl bg-gray-700 text-gray-300 text-sm hover:bg-gray-600 disabled:opacity-40 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </button>
            </div>
            {/* カスタムタグ（プリセット外） */}
            {interests.filter((i) => !(PRESET_INTERESTS as readonly string[]).includes(i)).length > 0 && (
              <div className="flex flex-wrap gap-2">
                {interests.filter((i) => !(PRESET_INTERESTS as readonly string[]).includes(i)).map((interest) => (
                  <button
                    key={interest}
                    onClick={() => toggleInterest(interest)}
                    className="text-sm px-3 py-1 rounded-full border bg-purple-600 text-white border-purple-500 flex items-center gap-1"
                  >
                    {interest}
                    <svg className="w-3 h-3 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 保存ボタン */}
          <button
            onClick={handleSaveCustomization}
            disabled={saveLoading}
            className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
              saveSuccess
                ? 'bg-green-600/80 text-white'
                : 'bg-purple-600 hover:bg-purple-700 text-white'
            } ${saveLoading ? 'opacity-60' : ''}`}
          >
            {saveLoading ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : saveSuccess ? (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                設定を保存しました
              </>
            ) : (
              '保存する'
            )}
          </button>
        </div>

        {/* ══════════════ 今週のTOP3ランキング（嫉妬メカニクス） ══════════════ */}
        <div>
          <div className="flex items-center gap-1.5 mb-3 px-1">
            <svg className="w-3.5 h-3.5 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
            </svg>
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-widest">今週の親密度TOP3</p>
          </div>
          <div className="bg-gray-900/80 rounded-2xl border border-white/8 overflow-hidden">
            {rankingLoading ? (
              <div className="py-8 text-center text-white/30 text-sm">読み込み中…</div>
            ) : ranking.length === 0 ? (
              <div className="py-8 text-center text-white/30 text-sm">ランキングデータなし</div>
            ) : (
              <>
                {ranking.slice(0, 3).map((entry) => {
                  const medalColors = ['text-yellow-400', 'text-gray-300', 'text-amber-600'];
                  return (
                    <div
                      key={entry.rank}
                      className={`flex items-center gap-3 px-4 py-3 border-b border-white/5 last:border-0 ${
                        entry.isMe ? 'bg-purple-900/30' : ''
                      }`}
                    >
                      <span className={`text-sm font-black w-6 text-center flex-shrink-0 ${medalColors[entry.rank - 1] ?? 'text-white/40'}`}>
                        {entry.rank <= 3 ? `#${entry.rank}` : `#${entry.rank}`}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold truncate ${entry.isMe ? 'text-purple-200' : 'text-white/80'}`}>
                          {entry.maskedName}
                          {entry.isMe && <span className="ml-2 text-xs text-purple-400 bg-purple-900/50 px-1.5 py-0.5 rounded-full">あなた</span>}
                        </p>
                        <p className="text-xs text-gray-500">{entry.totalMessages.toLocaleString()} 通</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs text-yellow-400 font-bold">Lv.{entry.level}</p>
                      </div>
                    </div>
                  );
                })}

                {/* 自分が4位以下の場合の嫉妬トリガー表示 */}
                {myRank !== null && myRank > 3 && (
                  <div className="px-4 py-3 bg-orange-950/20 border-t border-orange-500/20">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                        <svg className="w-3 h-3 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-orange-300 text-xs font-semibold">あなたは現在 {myRank}位</p>
                        <p className="text-gray-400 text-xs mt-0.5">
                          まだ{character?.name ?? 'キャラ'}に追いつけるかも…もっと話しかけてみよう！
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 自分が1位の場合の特別表示 */}
                {myRank === 1 && (
                  <div className="px-4 py-2 bg-yellow-950/20 border-t border-yellow-500/20 text-center">
                    <p className="text-yellow-300 text-xs font-semibold">あなたが最も親しい存在です</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* ══════════════ 基本情報カード（全キャラ対応） ══════════════ */}
        {character && (() => {
          // ハードコードプロフィール（テスト用IPキャラ）
          const hardcoded = CHARACTER_PROFILES[character.slug];
          // DB駆動プロフィール（全キャラ対応）
          const dbProfile: Record<string, string> = {};
          if (character.birthday) dbProfile['誕生日'] = character.birthday;
          if (character.franchise) dbProfile['作品'] = character.franchise;
          if (character.catchphrases?.length) dbProfile['口癖'] = character.catchphrases.slice(0, 2).join(' / ');
          if (character.personalityTraits?.length) {
            const traits = Array.isArray(character.personalityTraits) ? character.personalityTraits : [];
            if (traits.length) dbProfile['性格'] = traits.slice(0, 3).join('、');
          }

          const profileEntries = hardcoded
            ? (Object.entries(hardcoded) as [keyof CharacterProfile, string][])
                .filter(([, v]) => !!v)
                .map(([key, value]) => ({ label: PROFILE_LABELS[key], value }))
            : Object.entries(dbProfile).map(([label, value]) => ({ label, value }));

          if (profileEntries.length === 0) return null;

          return (
            <div className="bg-gray-900/80 rounded-2xl p-5 border border-white/10 shadow-lg">
              <p className="text-purple-400 text-xs font-semibold uppercase tracking-widest mb-4">
                プロフィール
              </p>
              <div className="space-y-0">
                {profileEntries.map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between gap-3 py-2.5 border-b border-white/5 last:border-0">
                    <span className="text-gray-400 text-xs flex-shrink-0">{label}</span>
                    <span className="text-white text-sm font-medium text-right">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

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
        {character?.personalityTraits && Array.isArray(character.personalityTraits) && character.personalityTraits.length > 0 && (() => {
          // DB: string[] → PersonalityTrait[] に変換（valueは順序ベースで自動割り当て）
          const rawTraits = character.personalityTraits as (string | PersonalityTrait)[];
          const converted: PersonalityTrait[] = rawTraits.map((t, i) => {
            if (typeof t === 'object' && t !== null && 'trait' in t && 'value' in t) {
              return t as PersonalityTrait;
            }
            // 文字列 → trait+value形式に変換。最初の特性ほど強い（90→60のグラデーション）
            const value = Math.max(55, 95 - i * 8);
            return { trait: String(t), value };
          });
          return <PersonalityTraitsSection traits={converted} />;
        })()}

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

        {/* ギャラリー・最新Moments: 投稿タブに統合済みのため関係値タブからは除去 */}

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

      <style>{MOMENT_CARD_STYLES}</style>
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
