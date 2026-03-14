/**
 * UserStateCollector — ユーザー×キャラの現在状態を収集
 * 既存エンジンから読み取り専用で活用
 */

import { prisma } from '../prisma';
import { logger } from '@/lib/logger';
import type { UserStateSnapshot } from './types';

/**
 * 1つのRelationshipに対してユーザー状態スナップショットを収集
 */
export async function collectUserState(relationshipId: string): Promise<UserStateSnapshot | null> {
  try {
    const relationship = await prisma.relationship.findUnique({
      where: { id: relationshipId },
      include: {
        user: { select: { id: true, nickname: true, displayName: true, email: true, updatedAt: true } },
        character: { select: { id: true, name: true, slug: true } },
      },
    });
    if (!relationship || !relationship.user) return null;

    const now = new Date();
    const jstHour = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' })).getHours();

    // 最終ログインからの日数（User.updatedAtを近似値として使用）
    const daysSinceLastLogin = Math.floor(
      (now.getTime() - relationship.user.updatedAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    // 最終メッセージからの日数
    const daysSinceLastMessage = relationship.lastMessageAt
      ? Math.floor((now.getTime() - relationship.lastMessageAt.getTime()) / (1000 * 60 * 60 * 24))
      : 999;

    // このキャラからの未読メッセージ数（直近24h、role=CHARACTER でユーザーが見ていないもの）
    const conversation = await prisma.conversation.findFirst({
      where: { relationshipId },
      orderBy: { updatedAt: 'desc' },
    });
    let unreadMessageCount = 0;
    if (conversation) {
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      unreadMessageCount = await prisma.message.count({
        where: {
          conversationId: conversation.id,
          role: 'CHARACTER',
          createdAt: { gte: oneDayAgo },
          // isReadはMsgモデルにない → 代わりにcharacter送信数を数える
        },
      });
    }

    // 直近7日の感情履歴（memorySummary.emotionMemoryから）
    const memo = (relationship.memorySummary ?? {}) as Record<string, unknown>;
    const emotionMemory = (memo.emotionMemory ?? []) as Array<{ emotion: string; date: string }>;
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const recentEmotions = emotionMemory
      .filter(e => new Date(e.date) > sevenDaysAgo)
      .map(e => e.emotion);

    // ユーザープロファイルからconcerns
    let activeConcerns: string[] = [];
    let recentTopics: string[] = [];
    try {
      const { userProfileEngine } = await import('../engine/user-profile-engine');
      const profile = await userProfileEngine.getOrCreateProfile(relationship.userId);
      if (profile) {
        const concerns = (profile.concerns ?? []) as Array<{ status: string; topic: string }>;
        activeConcerns = concerns
          .filter(c => c.status === 'active')
          .map(c => c.topic);
        const interests = (profile.interests ?? []) as Array<{ topic: string }>;
        recentTopics = interests
          .slice(0, 5)
          .map(i => i.topic);
      }
    } catch {
      // プロファイル取得失敗は無視
    }

    // キャラの感情状態
    const characterEmotionContext = relationship.characterEmotion
      ? `${relationship.characterEmotion}: ${relationship.characterEmotionNote ?? ''}`
      : 'neutral';

    // 今日のエージェント接触数
    const todayStart = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
    todayStart.setHours(0, 0, 0, 0);
    const agentContactCountToday = await prisma.characterAgentDecision?.count({
      where: {
        relationshipId,
        wasExecuted: true,
        executedAt: { gte: todayStart },
      },
    }).catch(() => 0) ?? 0;

    // 生活パターン（簡易: 直近メッセージの時間帯分布）
    const recentMsgs = conversation ? await prisma.message.findMany({
      where: { conversationId: conversation.id, role: 'USER' },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { createdAt: true },
    }) : [];
    const hourCounts = new Map<number, number>();
    for (const msg of recentMsgs) {
      const h = new Date(msg.createdAt.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' })).getHours();
      hourCounts.set(h, (hourCounts.get(h) ?? 0) + 1);
    }
    const peakHours = [...hourCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([h]) => h);

    const userName = relationship.user.nickname ?? relationship.user.displayName ?? 'ユーザー';

    return {
      userId: relationship.userId,
      characterId: relationship.characterId,
      relationshipId,
      daysSinceLastLogin,
      daysSinceLastMessage,
      unreadMessageCount,
      recentEmotions,
      activeConcerns,
      lifePattern: { peakHours },
      currentHourJST: jstHour,
      recentTopics,
      characterEmotionContext,
      agentContactCountToday,
      userName,
      relationshipLevel: relationship.level,
      totalMessages: relationship.totalMessages,
      streakDays: relationship.streakDays,
    };
  } catch (error) {
    logger.error('[UserStateCollector] Failed to collect state:', error);
    return null;
  }
}

/**
 * エージェントループ対象のRelationshipを優先度順で取得
 * 優先度: 長期不在 > 悩みあり > 通常
 */
export async function getTargetRelationships(limit: number): Promise<string[]> {
  const relationships = await prisma.relationship.findMany({
    where: {
      isFollowing: true,
      totalMessages: { gte: 1 }, // 1回以上会話したことがある
    },
    orderBy: [
      { lastMessageAt: 'asc' }, // 最も長く会話していないものを優先
    ],
    take: limit * 2, // TimingGuardで弾かれる分を見越して多めに取得
    select: { id: true },
  });

  return relationships.map(r => r.id);
}
