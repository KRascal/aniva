import { prisma } from './prisma';
import { logger } from './logger';

/**
 * アクティブなイベントのプロンプトコンテキストを取得
 * チャット時にsystemPrompt末尾に注入するために使用
 *
 * @param characterId - キャラクターID
 * @returns イベントプロンプトコンテキスト（複数イベントがある場合は結合）、なければnull
 */
export async function getActiveEventContext(characterId: string): Promise<string | null> {
  try {
    const now = new Date();

    // 1. DB: LimitedScenarioからアクティブなイベントを取得
    const activeScenarios = await prisma.limitedScenario.findMany({
      where: {
        characterId,
        isActive: true,
        startsAt: { lte: now },
        endsAt: { gte: now },
      },
      orderBy: { priority: 'desc' },
      select: {
        title: true,
        promptContext: true,
        content: true,
        type: true,
      },
    });

    if (activeScenarios.length === 0) {
      // 2. フォールバック: seasonal-event-system.tsからハードコードイベントを確認
      return getSeasonalFallbackContext(characterId);
    }

    // promptContextがあればそれを使い、なければcontentからコンテキストを生成
    const contexts = activeScenarios
      .map(s => s.promptContext || `現在「${s.title}」イベント開催中。イベントに関連した話題を自然に織り交ぜてください。`)
      .filter(Boolean);

    if (contexts.length === 0) return null;

    return `## 現在のイベント\n${contexts.join('\n\n')}`;
  } catch (error) {
    logger.error('[EventChatInjector] Failed to get active event context:', error);
    return null;
  }
}

/**
 * seasonal-event-system.tsからフォールバックコンテキストを取得
 */
async function getSeasonalFallbackContext(characterId: string): Promise<string | null> {
  try {
    // dynamic importでseasonal-event-systemを読み込み
    const { SEASONAL_EVENTS } = await import('./seasonal-event-system');

    const now = new Date();
    const month = now.getMonth() + 1;
    const day = now.getDate();

    // 今日のイベントをフィルタ
    const todayEvents = SEASONAL_EVENTS.filter(event => {
      const [start, end] = event.dateRange;
      if (!start || !end) return false;
      const afterStart = month > start.month || (month === start.month && day >= start.day);
      const beforeEnd = month < end.month || (month === end.month && day <= end.day);
      return afterStart && beforeEnd;
    });

    if (todayEvents.length === 0) return null;

    // キャラのslugを取得
    const character = await prisma.character.findUnique({
      where: { id: characterId },
      select: { slug: true },
    });
    const slug = character?.slug;

    const contexts = todayEvents.map(event => {
      const charReaction = slug && event.characterReactions[slug]
        ? `\nキャラの反応参考: ${event.characterReactions[slug]}`
        : '';
      return `${event.promptContext}${charReaction}`;
    });

    return `## 季節のイベント\n${contexts.join('\n\n')}`;
  } catch {
    return null;
  }
}
