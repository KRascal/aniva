import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

interface FollowUpCandidate {
  userId: string;
  characterId: string;
  topic: string;
  scheduledAt: Date;
  priority: number;
}

export class FollowUpScheduler {
  /**
   * 直近の会話から、フォローアップすべきトピックを抽出
   */
  static async findCandidates(characterId: string, limit: number = 5): Promise<FollowUpCandidate[]> {
    // 直近24hに深い会話（10ターン以上）をしたユーザーを取得
    // 会話内容から「悩み相談」「仕事の話」「体調」等のフォローアップトピックを検出
    // FollowUpQueueテーブルに未送信のものがなければ候補として返す

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const conversations = await prisma.conversation.findMany({
      where: {
        relationship: { characterId },
        updatedAt: { gte: oneDayAgo },
        messages: { some: { role: 'USER' } },
      },
      include: {
        relationship: { select: { userId: true, characterId: true } },
        messages: {
          where: { createdAt: { gte: oneDayAgo } },
          orderBy: { createdAt: 'desc' },
          take: 20,
          select: { content: true, role: true, createdAt: true },
        },
      },
      take: limit * 2,
    });

    const candidates: FollowUpCandidate[] = [];

    for (const conv of conversations) {
      if (conv.messages.length < 6) continue; // 浅い会話はスキップ

      const userMessages = conv.messages.filter(m => m.role === 'USER').map(m => m.content);
      const combinedText = userMessages.join(' ');

      // トピック検出（キーワードベース）
      const topics = detectFollowUpTopics(combinedText);

      for (const topic of topics) {
        candidates.push({
          userId: conv.relationship?.userId ?? '',
          characterId: conv.relationship?.characterId ?? '',
          topic,
          scheduledAt: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4時間後
          priority: topic === '体調' ? 10 : 5,
        });
      }
    }

    logger.info(`[FollowUpScheduler] Found ${candidates.length} candidates for characterId=${characterId}`);
    return candidates.slice(0, limit);
  }
}

const FOLLOWUP_KEYWORDS: Record<string, string[]> = {
  '仕事': ['仕事', '会社', '上司', '転職', 'プロジェクト', '締め切り', '残業'],
  '体調': ['体調', '風邪', '熱', '病院', '頭痛', '疲れ', 'しんどい', '寝不足'],
  '悩み': ['悩み', '不安', '心配', 'どうしよう', 'つらい', '迷って'],
  '試験': ['試験', 'テスト', '受験', '勉強', '合格', '資格'],
  '人間関係': ['友達', '彼氏', '彼女', '家族', '喧嘩', '別れ'],
};

function detectFollowUpTopics(text: string): string[] {
  const found: string[] = [];
  for (const [topic, keywords] of Object.entries(FOLLOWUP_KEYWORDS)) {
    if (keywords.some(kw => text.includes(kw))) {
      found.push(topic);
    }
  }
  return found;
}
