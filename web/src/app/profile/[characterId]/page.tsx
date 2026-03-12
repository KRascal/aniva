'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { RELATIONSHIP_LEVELS } from '@/types/character';
import { MOMENT_CARD_STYLES, type Moment as SharedMoment } from '@/components/moments/MomentCard';
import { FanStatsPanel } from '@/components/character/FanStatsPanel';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { ProfileTabs, type ProfileTabId } from '@/components/profile/ProfileTabs';
import { ProfileMoments } from '@/components/profile/ProfileMoments';
import { ProfileDiary } from '@/components/profile/ProfileDiary';
import { ProfileFCTab } from '@/components/profile/ProfileFCTab';
import { ProfileDLTab } from '@/components/profile/ProfileDLTab';
import { ProfileRelationship } from '@/components/profile/ProfileRelationship';
import type {
  Character,
  RelationshipData,
  MilestonesData,
  MomentItem,
  DlContent,
  DiaryItem,
  RankingEntry,
} from './profile-data';

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
  const [activeTab, setActiveTab] = useState<ProfileTabId>('posts');
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
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [rankingLoading, setRankingLoading] = useState(false);

  // URLハッシュから自動タブ切替
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hash = window.location.hash;
    if (hash === '#relationship' || hash === '#profile') {
      setActiveTab('profile');
    } else if (hash === '#fc') {
      setActiveTab('fc');
    } else if (hash === '#posts') {
      setActiveTab('posts');
    }
  }, []);

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
      const stripeRes = await fetch('/api/fc/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterId }),
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

    const maskNames = ['海賊A', '剣士B', '航海士C', '料理人D', '船医E', '考古学者F', '大工G', '音楽家H', '操舵手I', '狙撃手J'];

    fetch(`/api/ranking/${characterId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.ranking) {
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
      setDiaries((prev) =>
        prev.map((d) => {
          if (d.id !== diaryId) return d;
          const liked = !d.isLiked;
          return { ...d, isLiked: liked, likes: liked ? d.likes + 1 : Math.max(0, d.likes - 1) };
        })
      );
    }
  }, [characterId, session]);

  // いいね機能
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
      setMoments((prev) =>
        prev.map((m) => {
          if (m.id !== momentId) return m;
          const liked = !m.userHasLiked;
          return { ...m, userHasLiked: liked, reactionCount: liked ? m.reactionCount + 1 : m.reactionCount - 1 };
        })
      );
    }
  }, [session]);

  // MomentItem → SharedMoment 変換
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
  const catchphrases: string[] = character?.catchphrases ?? [];

  return (
    <div className="min-h-screen bg-gray-950 max-w-lg mx-auto pb-24">

      <ProfileHeader
        character={character}
        level={level}
        followerCount={followerCount}
        catchphrases={catchphrases}
        isFollowing={isFollowing}
        followLoading={followLoading}
        characterId={characterId}
        onFollow={handleFollow}
        onChat={handleChat}
        onBack={() => router.back()}
        onMemoryBook={() => router.push(`/memory-book/${characterId}`)}
        onCommunity={() => router.push(`/community/${character?.slug || characterId}`)}
      />

      <div className="px-4 mt-5 space-y-5">
        {/* キャラクター紹介文 (header内で表示済み) は重複を避けるため省略 */}

        {/* ファン統計パネル */}
        {character?.slug && <FanStatsPanel characterSlug={character.slug} />}

        <ProfileTabs activeTab={activeTab} onTabChange={setActiveTab} />

        {activeTab === 'posts' && (
          <ProfileMoments
            moments={moments}
            isFanclub={isFanclub}
            relationship={relationship}
            level={level}
            characterId={characterId}
            toSharedMoment={toSharedMoment}
            onLike={handleLike}
            userId={userId}
          />
        )}

        {activeTab === 'diary' && (
          <ProfileDiary
            diaries={diaries}
            diaryLoading={diaryLoading}
            diaryPage={diaryPage}
            diaryTotalPages={diaryTotalPages}
            onPageChange={setDiaryPage}
            onDiaryLike={handleDiaryLike}
          />
        )}

        {activeTab === 'fc' && (
          <ProfileFCTab
            character={character}
            characterId={characterId}
            isFanclub={isFanclub}
            onJoinFC={handleFanclub}
            onCancelFC={isFanclub ? handleFanclub : undefined}
            moments={moments}
            toSharedMoment={toSharedMoment}
            onLike={handleLike}
            userId={userId}
          />
        )}

        {activeTab === 'dl' && (
          <ProfileDLTab
            dlContents={dlContents}
            dlLoading={dlLoading}
            onTabChange={setActiveTab}
          />
        )}

        {activeTab === 'profile' && (
          <ProfileRelationship
            character={character}
            characterId={characterId}
            relationship={relationship}
            level={level}
            xp={xp}
            nextLevelXp={nextLevelXp ?? null}
            xpAnimated={xpAnimated}
            xpPercent={xpPercent}
            maxStars={maxStars}
            filledStars={filledStars}
            levelInfo={levelInfo}
            catchphrases={catchphrases}
            milestonesData={milestonesData}
            ranking={ranking}
            rankingLoading={rankingLoading}
            myRank={myRank}
            nickname={nickname}
            onNicknameChange={setNickname}
            interests={interests}
            onToggleInterest={toggleInterest}
            customInterest={customInterest}
            onCustomInterestChange={setCustomInterest}
            onAddCustomInterest={addCustomInterest}
            saveLoading={saveLoading}
            saveSuccess={saveSuccess}
            onSaveCustomization={handleSaveCustomization}
          />
        )}
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
