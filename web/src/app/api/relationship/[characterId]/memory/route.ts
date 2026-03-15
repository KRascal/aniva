import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { resolveCharacterId } from '@/lib/resolve-character';

interface FactEntry {
  fact: string;
  source: string;
  confidence: number;
  updatedAt: string;
}

interface EpisodeEntry {
  summary: string;
  date: string;
  emotion: string;
  importance: number;
}

interface EmotionEntry {
  topic: string;
  userEmotion: string;
  characterReaction: string;
  date: string;
}

interface MemorySummaryData {
  userName?: string;
  factMemory?: FactEntry[];
  episodeMemory?: EpisodeEntry[];
  emotionMemory?: EmotionEntry[];
  preferences?: {
    likes?: string[];
    dislikes?: string[];
  };
  importantFacts?: string[];
}

/**
 * GET /api/relationship/[characterId]/memory
 * キャラクターがユーザーについて覚えていることを返す
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ characterId: string }> }
) {
  const session = await auth();
  const userId = (session?.user as { id?: string })?.id;
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { characterId: rawCharacterId } = await params;
  const characterId = await resolveCharacterId(rawCharacterId) ?? rawCharacterId;

  const relationship = await prisma.relationship.findUnique({
    where: { userId_characterId_locale: { userId, characterId, locale: 'ja' } },
    select: {
      memorySummary: true,
      level: true,
      totalMessages: true,
      firstMessageAt: true,
    },
  });

  if (!relationship) {
    return NextResponse.json({
      factMemory: [],
      episodeMemory: [],
      emotionMemory: [],
      preferences: { likes: [], dislikes: [] },
      level: 1,
      totalMessages: 0,
      firstMessageAt: null,
    });
  }

  const memo = (relationship.memorySummary ?? {}) as MemorySummaryData;

  // confidenceで降順ソート（確信度高い順）
  const sortedFacts = [...(memo.factMemory ?? [])]
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 15);

  // importanceで降順ソート（重要度高い順）
  const sortedEpisodes = [...(memo.episodeMemory ?? [])]
    .sort((a, b) => b.importance - a.importance)
    .slice(0, 5);

  // 最新5件の感情記憶
  const sortedEmotions = [...(memo.emotionMemory ?? [])]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  return NextResponse.json({
    factMemory: sortedFacts,
    episodeMemory: sortedEpisodes,
    emotionMemory: sortedEmotions,
    preferences: {
      likes: memo.preferences?.likes ?? [],
      dislikes: memo.preferences?.dislikes ?? [],
    },
    userName: memo.userName,
    level: relationship.level,
    totalMessages: relationship.totalMessages,
    firstMessageAt: relationship.firstMessageAt,
  });
}
