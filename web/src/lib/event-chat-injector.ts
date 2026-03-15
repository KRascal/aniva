import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

interface ActiveEvent {
  id: string;
  title: string;
  description: string;
  startsAt: Date;
  endsAt: Date;
}

/**
 * 現在アクティブなイベント（LimitedScenario）を取得
 */
export async function getActiveEvents(): Promise<ActiveEvent[]> {
  try {
    const now = new Date();
    const scenarios = await prisma.limitedScenario.findMany({
      where: {
        isActive: true,
        startsAt: { lte: now },
        endsAt: { gte: now },
      },
      select: {
        id: true,
        title: true,
        description: true,
        startsAt: true,
        endsAt: true,
      },
      orderBy: { startsAt: 'desc' },
      take: 5,
    });

    return scenarios.map(s => ({
      id: s.id,
      title: s.title,
      description: s.description ?? '',
      startsAt: s.startsAt,
      endsAt: s.endsAt,
    }));
  } catch (error) {
    logger.error('[EventChatInjector] Failed to get events:', error);
    return [];
  }
}

/**
 * イベント情報をプロンプトに注入するテキストを生成
 */
export function buildEventContext(events: ActiveEvent[]): string {
  if (events.length === 0) return '';

  const lines = events.map(e => {
    const daysLeft = Math.ceil((e.endsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return `- 「${e.title}」開催中（残り${daysLeft}日）: ${e.description}`;
  });

  return `\n【現在開催中のイベント】\n${lines.join('\n')}\n※イベントに関連する話題が出たら自然に言及してもOK。無理に触れなくても良い。`;
}
