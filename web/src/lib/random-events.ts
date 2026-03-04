/**
 * チャット内ランダムイベントエンジン
 * 変動報酬（スロットマシン型）で中毒性を演出
 */

export type RandomEventType =
  | 'bond_burst'      // 絆経験値3倍（視覚的演出のみ、実際のXPはAPI側）
  | 'coin_gift'       // キャラからコイン贈呈
  | 'special_reaction'// レアなリアクション演出
  | 'lucky_streak';   // ラッキーストリーク演出

export interface RandomEvent {
  type: RandomEventType;
  title: string;
  message: string;
  emoji: string;
  coinReward?: number;
}

// イベント確率（1送信あたり）
const EVENT_PROBABILITIES: Record<RandomEventType, number> = {
  bond_burst:       0.04, // 4%
  coin_gift:        0.02, // 2%
  special_reaction: 0.06, // 6%
  lucky_streak:     0.03, // 3%
};

const EVENTS: Record<RandomEventType, RandomEvent> = {
  bond_burst: {
    type: 'bond_burst',
    title: '絆バースト！',
    message: '今日の会話は特別だ…絆が深まってる',
    emoji: '💫',
  },
  coin_gift: {
    type: 'coin_gift',
    title: 'キャラからのプレゼント',
    message: 'なんか知らんけど、やるよ',
    emoji: '🎁',
    coinReward: 10,
  },
  special_reaction: {
    type: 'special_reaction',
    title: 'レアリアクション発動！',
    message: 'こんな反応、初めて見た…',
    emoji: '✨',
  },
  lucky_streak: {
    type: 'lucky_streak',
    title: 'ラッキーデイ！',
    message: '今日は何かいいことありそうな気がする',
    emoji: '🔥',
  },
};

/**
 * メッセージ送信後にランダムイベントを判定
 * @returns イベントまたはnull
 */
export function rollRandomEvent(level: number): RandomEvent | null {
  // レベルが高いほどイベント確率UP（最大2倍）
  const multiplier = 1 + Math.min(level - 1, 4) * 0.1;

  for (const [eventType, baseProbability] of Object.entries(EVENT_PROBABILITIES)) {
    const probability = baseProbability * multiplier;
    if (Math.random() < probability) {
      return EVENTS[eventType as RandomEventType];
    }
  }
  return null;
}

/** セッション内で同じイベントが連続しないよう制御（最低5ターン間隔） */
const lastEventTurn: Record<string, number> = {};

export function rollRandomEventWithCooldown(
  level: number,
  sessionKey: string,
  currentTurn: number,
): RandomEvent | null {
  const lastTurn = lastEventTurn[sessionKey] ?? -999;
  if (currentTurn - lastTurn < 5) return null; // クールダウン中

  const event = rollRandomEvent(level);
  if (event) {
    lastEventTurn[sessionKey] = currentTurn;
  }
  return event;
}
