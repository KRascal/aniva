'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { RELATIONSHIP_LEVELS } from '@/types/character';
import { FanStatsPanel } from '@/components/character/FanStatsPanel';
import { MOMENT_CARD_STYLES } from '@/components/moments/MomentCard';
import type { Moment as SharedMoment } from '@/components/moments/MomentCard';
import {
  type Character,
  type RelationshipData,
  type MilestonesData,
  type MomentItem,
  type DiaryItem,
  type DlContent,
  type RankingEntry,
} from '@/components/profile/profileTypes';
import { PostsTab } from '@/components/profile/tabs/PostsTab';
import { DiaryTab } from '@/components/profile/tabs/DiaryTab';
import { FcTab } from '@/components/profile/tabs/FcTab';
import { DlTab } from '@/components/profile/tabs/DlTab';
import { ProfileTab } from '@/components/profile/tabs/ProfileTab';
import { logger } from '@/lib/logger';

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
  const [activeTab, setActiveTab] = useState<'posts' | 'fc' | 'dl' | 'profile' | 'diary'>('posts');
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
      .catch((err) => logger.error('characters/id fetch error', { error: err }));
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
        logger.error('Failed to load profile data', { error: err });
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
      logger.error('Customize save error', { error: err });
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
      logger.error('Follow error', { error: err });
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
      logger.error('Fanclub error', { error: err });
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
      .catch((err) => logger.error('content fetch error', { error: err }))
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
      .catch((err) => logger.error('diary fetch error', { error: err }))
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
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0118 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
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
              { id: 'dl' as const, label: 'DL' },
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

        {/* ══════════════ タブコンテンツ ══════════════ */}
        {activeTab === 'posts' && (
          <PostsTab
            moments={moments}
            isFanclub={isFanclub}
            relationship={relationship}
            level={level}
            characterId={characterId}
            userId={userId}
            toSharedMoment={toSharedMoment}
            onLike={handleLike}
          />
        )}

        {activeTab === 'diary' && (
          <DiaryTab
            diaries={diaries}
            diaryLoading={diaryLoading}
            diaryPage={diaryPage}
            diaryTotalPages={diaryTotalPages}
            hasSession={!!session?.user}
            onDiaryLike={handleDiaryLike}
            onLoadMore={() => setDiaryPage((p) => p + 1)}
          />
        )}

        {activeTab === 'fc' && (
          <FcTab
            character={character}
            characterId={characterId}
            isFanclub={isFanclub}
            moments={moments}
            userId={userId}
            toSharedMoment={toSharedMoment}
            onLike={handleLike}
            onJoinFC={handleFanclub}
            dlContents={dlContents}
          />
        )}

        {activeTab === 'dl' && (
          <DlTab
            dlContents={dlContents}
            dlLoading={dlLoading}
            onFcClick={() => setActiveTab('fc')}
          />
        )}

        {activeTab === 'profile' && (
          <ProfileTab
            character={character}
            relationship={relationship}
            milestonesData={milestonesData}
            level={level}
            levelInfo={levelInfo}
            xp={xp}
            nextLevelXp={nextLevelXp ?? null}
            xpPercent={xpPercent}
            xpAnimated={xpAnimated}
            maxStars={maxStars}
            filledStars={filledStars}
            catchphrases={catchphrases}
            ranking={ranking}
            myRank={myRank}
            rankingLoading={rankingLoading}
            nickname={nickname}
            setNickname={setNickname}
            interests={interests}
            customInterest={customInterest}
            setCustomInterest={setCustomInterest}
            saveLoading={saveLoading}
            saveSuccess={saveSuccess}
            onSaveCustomization={handleSaveCustomization}
            onToggleInterest={toggleInterest}
            onAddCustomInterest={addCustomInterest}
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
