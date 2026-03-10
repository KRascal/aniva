import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/prisma';

/**
 * メモリーブックAPI — 二人の思い出アルバム
 * エンドウメント効果: 「これが消えるのか」で退会を阻止
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ characterId: string }> },
) {
  const token = await getToken({ req });
  if (!token?.sub) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { characterId: rawId } = await params;

  // slug→id解決
  let characterId = rawId;
  const charBySlug = await prisma.character.findFirst({
    where: { OR: [{ id: rawId }, { slug: rawId }] },
    select: { id: true },
  });
  if (charBySlug) characterId = charBySlug.id;

  // Relationship取得
  const relationship = await prisma.relationship.findFirst({
    where: { userId: token.sub, characterId },
    select: {
      id: true,
      level: true,
      totalMessages: true,
      streakDays: true,
      experiencePoints: true,
      firstMessageAt: true,
      lastMessageAt: true,
      memorySummary: true,
      character: { select: { name: true, slug: true } },
    },
  });

  if (!relationship) {
    return NextResponse.json({ error: 'No relationship found' }, { status: 404 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const memo = (relationship.memorySummary ?? {}) as any;

  // 思い出ハイライト（感情スコアが高いエピソード記憶）
  const episodes = (memo.episodeMemory ?? []) as Array<{
    summary: string;
    date: string;
    emotion: string;
    importance: number;
  }>;
  const highlights = [...episodes]
    .sort((a, b) => (b.importance ?? 0) - (a.importance ?? 0))
    .slice(0, 10);

  // 事実記憶（キャラが知っていること）
  const facts = (memo.factMemory ?? []) as Array<{
    fact: string;
    confidence: number;
    updatedAt: string;
  }>;
  const topFacts = [...facts]
    .sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0))
    .slice(0, 15);

  // マイルストーン計算
  const milestones: Array<{ type: string; label: string; date?: string; achieved: boolean }> = [];
  if (relationship.firstMessageAt) {
    milestones.push({ type: 'first_chat', label: '初めての会話', date: relationship.firstMessageAt.toISOString(), achieved: true });
  }
  if (relationship.totalMessages >= 10) {
    milestones.push({ type: 'messages_10', label: '10回目の会話', achieved: true });
  }
  if (relationship.totalMessages >= 100) {
    milestones.push({ type: 'messages_100', label: '100回目の会話 💯', achieved: true });
  }
  if (relationship.totalMessages >= 500) {
    milestones.push({ type: 'messages_500', label: '500回目の会話 🌟', achieved: true });
  }
  if (relationship.totalMessages >= 1000) {
    milestones.push({ type: 'messages_1000', label: '1000回目の会話 👑', achieved: true });
  }
  if (relationship.level >= 2) {
    milestones.push({ type: 'level_2', label: '友達になった', achieved: true });
  }
  if (relationship.level >= 3) {
    milestones.push({ type: 'level_3', label: '仲間になった', achieved: true });
  }
  if (relationship.level >= 4) {
    milestones.push({ type: 'level_4', label: '親友になった ✨', achieved: true });
  }
  if (relationship.level >= 5) {
    milestones.push({ type: 'level_5', label: '特別な存在 💕', achieved: true });
  }
  if (relationship.streakDays >= 7) {
    milestones.push({ type: 'streak_7', label: '7日連続会話 🔥', achieved: true });
  }
  if (relationship.streakDays >= 30) {
    milestones.push({ type: 'streak_30', label: '30日連続会話 🔥🔥', achieved: true });
  }

  // 出会いからの日数
  const daysSinceFirst = relationship.firstMessageAt
    ? Math.floor((Date.now() - relationship.firstMessageAt.getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  return NextResponse.json({
    characterName: relationship.character.name,
    characterSlug: relationship.character.slug,
    stats: {
      level: relationship.level,
      totalMessages: relationship.totalMessages,
      streakDays: relationship.streakDays,
      xp: relationship.experiencePoints,
      daysTogether: daysSinceFirst,
      firstChatDate: relationship.firstMessageAt?.toISOString() ?? null,
    },
    highlights,
    facts: topFacts,
    milestones,
    emotionalSummary: memo.conversationSummary ?? null,
    emotionalTrend: memo.emotionalTrend ?? null,
  });
}
