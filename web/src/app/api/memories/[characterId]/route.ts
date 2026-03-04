import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/** エピソード記憶エントリの型 */
interface EpisodeEntry {
  summary: string;
  date: string;
  emotion: string;
  importance: number;
}

/** memorySummary JSONの型（必要フィールドのみ） */
interface MemorySummaryData {
  episodeMemory?: EpisodeEntry[];
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ characterId: string }> }
) {
  try {
    // 認証チェック
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as { id?: string }).id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { characterId } = await params;

    // Relationship取得（locale: 'ja' で検索）
    const relationship = await prisma.relationship.findUnique({
      where: { userId_characterId_locale: { userId, characterId, locale: 'ja' } },
      select: {
        id: true,
        level: true,
        totalMessages: true,
        firstMessageAt: true,
        memorySummary: true,
      },
    });

    if (!relationship) {
      return NextResponse.json({ error: 'Relationship not found' }, { status: 404 });
    }

    const memo = (relationship.memorySummary ?? {}) as MemorySummaryData;

    // episodeMemoryを時系列降順で返す
    const episodes: EpisodeEntry[] = (memo.episodeMemory ?? [])
      .slice()
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json({
      memories: episodes,
      totalMessages: relationship.totalMessages,
      bondLevel: relationship.level,
      firstMessageAt: relationship.firstMessageAt?.toISOString() ?? null,
    });
  } catch (error) {
    console.error('[memories API] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
