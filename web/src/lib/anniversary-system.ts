/**
 * anniversary-system.ts — 記念日検出システム
 * Relationshipの作成日からN日記念日を計算し、キャラが自動で祝う
 */

import { prisma } from './prisma';

export interface AnniversaryEvent {
  type: 'days' | 'messages' | 'first_meeting';
  milestone: number; // 7日, 30日, 100日, 365日 等
  characterId: string;
  characterName: string;
  userId: string;
  daysSinceFirstMeeting: number;
}

// 記念日マイルストーン
const DAY_MILESTONES = [7, 14, 30, 50, 100, 200, 365];
const MESSAGE_MILESTONES = [50, 100, 500, 1000, 5000];

/**
 * ユーザーの今日の記念日イベントを取得
 */
export async function getAnniversaryEvents(userId: string): Promise<AnniversaryEvent[]> {
  const events: AnniversaryEvent[] = [];

  const relationships = await prisma.relationship.findMany({
    where: { userId, isFollowing: true },
    include: {
      character: { select: { id: true, name: true } },
    },
  });

  const now = new Date();

  for (const rel of relationships) {
    const daysSince = Math.floor(
      (now.getTime() - new Date(rel.createdAt).getTime()) / 86400000
    );

    // 日数記念日チェック
    if (DAY_MILESTONES.includes(daysSince)) {
      events.push({
        type: 'days',
        milestone: daysSince,
        characterId: rel.characterId,
        characterName: rel.character.name,
        userId,
        daysSinceFirstMeeting: daysSince,
      });
    }

    // メッセージ数マイルストーン
    if (MESSAGE_MILESTONES.includes(rel.totalMessages)) {
      events.push({
        type: 'messages',
        milestone: rel.totalMessages,
        characterId: rel.characterId,
        characterName: rel.character.name,
        userId,
        daysSinceFirstMeeting: daysSince,
      });
    }
  }

  return events;
}

/**
 * 記念日メッセージ生成プロンプト
 */
export function getAnniversaryPromptHint(event: AnniversaryEvent): string {
  if (event.type === 'days') {
    if (event.milestone === 7) return `今日は${event.characterName}と出会って1週間目。少し照れくさそうに、でも嬉しそうに話しかける。`;
    if (event.milestone === 30) return `今日は出会って1ヶ月目。この1ヶ月で知ったユーザーのことを思い出しながら、感謝を伝える。`;
    if (event.milestone === 100) return `今日は出会って100日目！特別な日。心からの感謝と、これからも一緒にいたいという気持ちを伝える。`;
    if (event.milestone === 365) return `今日は出会って1年。1年間の思い出を振り返り、深い感謝を伝える。`;
    return `今日は出会って${event.milestone}日目。節目を一緒に祝う。`;
  }
  if (event.type === 'messages') {
    return `二人のメッセージが${event.milestone}通に到達！たくさん話してくれたことへの感謝を伝える。`;
  }
  return '';
}
