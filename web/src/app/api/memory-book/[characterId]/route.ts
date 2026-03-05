import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

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
  episodeMemory?: EpisodeEntry[];
  emotionMemory?: EmotionEntry[];
}

const MILESTONE_DEFS = [
  { type: 'first_meet', days: 0, label: '出会いの日' },
  { type: '7days', days: 7, label: '1週間記念' },
  { type: '30days', days: 30, label: '1ヶ月記念' },
  { type: '50days', days: 50, label: '50日記念' },
  { type: '100days', days: 100, label: '100日記念' },
  { type: '200days', days: 200, label: '200日記念' },
  { type: '365days', days: 365, label: '1周年記念' },
];

// 感情ラベルを標準化
const EMOTION_LABELS: Record<string, string> = {
  嬉しい: 'happy',
  楽しい: 'excited',
  excited: 'excited',
  happy: 'happy',
  sad: 'sad',
  悲しい: 'sad',
  mysterious: 'mysterious',
  nostalgic: 'nostalgic',
  nervous: 'nervous',
  neutral: 'neutral',
};

function normalizeEmotion(e: string): string {
  return EMOTION_LABELS[e] ?? 'neutral';
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ characterId: string }> }
) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { characterId } = await params;

    // キャラ情報取得
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(characterId);
    const character = await prisma.character.findUnique({
      where: isUuid ? { id: characterId } : { slug: characterId },
      select: { id: true, name: true, avatarUrl: true },
    });

    if (!character) {
      return NextResponse.json({ error: 'Character not found' }, { status: 404 });
    }

    // Relationship 取得
    const relationship = await prisma.relationship.findUnique({
      where: {
        userId_characterId_locale: {
          userId,
          characterId: character.id,
          locale: 'ja',
        },
      },
    });

    if (!relationship) {
      return NextResponse.json({
        characterName: character.name,
        characterAvatar: character.avatarUrl,
        firstMeetDate: null,
        daysTogether: 0,
        totalMessages: 0,
        level: 1,
        milestones: [],
        highlights: [],
        topEpisodes: [],
      });
    }

    const memo = (relationship.memorySummary ?? {}) as MemorySummaryData;

    // 出会い日・経過日数
    const firstMeetDate = relationship.firstMessageAt ?? relationship.createdAt;
    const now = new Date();
    const daysTogether = Math.floor(
      (now.getTime() - new Date(firstMeetDate).getTime()) / (1000 * 60 * 60 * 24)
    );

    // マイルストーン計算
    const milestones = MILESTONE_DEFS
      .filter((m) => daysTogether >= m.days)
      .map((m) => {
        const milestoneDate = new Date(firstMeetDate);
        milestoneDate.setDate(milestoneDate.getDate() + m.days);
        return {
          type: m.type,
          date: milestoneDate.toISOString().split('T')[0],
          label: m.label,
        };
      });

    // topEpisodes: episodeMemoryから重要度高い順にtop10
    const episodeMemory: EpisodeEntry[] = memo.episodeMemory ?? [];
    const topEpisodes = [...episodeMemory]
      .sort((a, b) => (b.importance ?? 0) - (a.importance ?? 0))
      .slice(0, 10)
      .map((ep) => ({
        date: ep.date ? new Date(ep.date).toISOString().split('T')[0] : '',
        summary: ep.summary,
        importance: ep.importance ?? 1,
      }));

    // ハイライト: emotionMemoryから感情スコアの高い会話を抽出
    const emotionMemory: EmotionEntry[] = memo.emotionMemory ?? [];
    const positiveEmotions = new Set(['嬉しい', '楽しい', 'excited', 'happy', 'playful', '嬉しかった']);
    const highlights = emotionMemory
      .filter((e) => positiveEmotions.has(e.userEmotion))
      .slice(0, 5)
      .map((e) => ({
        date: e.date ? new Date(e.date).toISOString().split('T')[0] : '',
        summary: e.topic,
        emotion: normalizeEmotion(e.userEmotion),
      }));

    return NextResponse.json({
      characterName: character.name,
      characterAvatar: character.avatarUrl,
      firstMeetDate: new Date(firstMeetDate).toISOString().split('T')[0],
      daysTogether,
      totalMessages: relationship.totalMessages,
      level: relationship.level,
      milestones,
      highlights,
      topEpisodes,
    });
  } catch (error) {
    console.error('[memory-book] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
