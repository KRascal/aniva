// ============================================================
// UserBehaviorAnalyzer — P1-1 メタ行動分析
// 訪問パターン・返信速度・文章長変化をトラッキングし
// キャラクターへの文脈として注入する
// ============================================================

import { prisma } from '../prisma';

interface BehaviorSignals {
  /** 最終訪問からの経過時間（分） */
  minutesSinceLastVisit: number | null;
  /** 本日の送信メッセージ数 */
  todayMessageCount: number;
  /** 直近10件のユーザーメッセージの平均文字数 */
  avgMessageLength: number;
  /** 文章長トレンド: 'increasing' | 'decreasing' | 'stable' */
  messageLengthTrend: 'increasing' | 'decreasing' | 'stable';
  /** 返信速度トレンド（直近の間隔から判断） */
  visitFrequency: 'high' | 'medium' | 'low';
  /** 夜間訪問が多いか */
  isNightVisitor: boolean;
  /** 今回の訪問が久しぶりか（3日以上） */
  isLongAbsence: boolean;
}

/**
 * ユーザーの行動パターンを分析する
 */
export async function analyzeBehavior(
  relationshipId: string,
  userId: string,
): Promise<BehaviorSignals> {
  const now = new Date();

  // 直近の会話を取得
  const conversation = await prisma.conversation.findFirst({
    where: { relationshipId },
    orderBy: { updatedAt: 'desc' },
  });

  if (!conversation) {
    return {
      minutesSinceLastVisit: null,
      todayMessageCount: 0,
      avgMessageLength: 0,
      messageLengthTrend: 'stable',
      visitFrequency: 'low',
      isNightVisitor: false,
      isLongAbsence: false,
    };
  }

  // 直近20件のユーザーメッセージを取得
  const recentUserMessages = await prisma.message.findMany({
    where: { conversationId: conversation.id, role: 'USER' },
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: { content: true, createdAt: true },
  });

  // 本日のメッセージ数
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayMessages = recentUserMessages.filter(m => m.createdAt >= todayStart);
  const todayMessageCount = todayMessages.length;

  // 平均文字数
  const avgMessageLength = recentUserMessages.length > 0
    ? Math.round(recentUserMessages.reduce((sum, m) => sum + m.content.length, 0) / recentUserMessages.length)
    : 0;

  // 文章長トレンド（直近5件 vs 前5件）
  let messageLengthTrend: 'increasing' | 'decreasing' | 'stable' = 'stable';
  if (recentUserMessages.length >= 10) {
    const recent5Avg = recentUserMessages.slice(0, 5).reduce((s, m) => s + m.content.length, 0) / 5;
    const prev5Avg = recentUserMessages.slice(5, 10).reduce((s, m) => s + m.content.length, 0) / 5;
    const diff = recent5Avg - prev5Avg;
    if (diff > 20) messageLengthTrend = 'increasing';
    else if (diff < -20) messageLengthTrend = 'decreasing';
  }

  // 関係性から最終訪問時刻を取得
  const relationship = await prisma.relationship.findUnique({
    where: { id: relationshipId },
    select: { lastMessageAt: true, firstMessageAt: true },
  });

  const minutesSinceLastVisit = relationship?.lastMessageAt
    ? Math.floor((now.getTime() - relationship.lastMessageAt.getTime()) / 60000)
    : null;

  // 長期不在チェック（3日以上）
  const isLongAbsence = minutesSinceLastVisit !== null && minutesSinceLastVisit > 60 * 24 * 3;

  // 訪問頻度（過去7日間のメッセージ数から判定）
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const weekMessages = await prisma.message.count({
    where: {
      conversationId: conversation.id,
      role: 'USER',
      createdAt: { gte: sevenDaysAgo },
    },
  });
  const visitFrequency: 'high' | 'medium' | 'low' =
    weekMessages >= 30 ? 'high' : weekMessages >= 10 ? 'medium' : 'low';

  // 夜間訪問パターン（直近20件のうち夜間22:00〜4:00が多いか）
  const nightMessages = recentUserMessages.filter(m => {
    const h = m.createdAt.getHours();
    return h >= 22 || h < 4;
  });
  const isNightVisitor = nightMessages.length > recentUserMessages.length * 0.4;

  return {
    minutesSinceLastVisit,
    todayMessageCount,
    avgMessageLength,
    messageLengthTrend,
    visitFrequency,
    isNightVisitor,
    isLongAbsence,
  };
}

/**
 * 行動シグナルをキャラクター向けの文脈テキストに変換
 */
export function buildBehaviorContext(signals: BehaviorSignals): string {
  const hints: string[] = [];

  // 長期不在
  if (signals.isLongAbsence && signals.minutesSinceLastVisit !== null) {
    const days = Math.floor(signals.minutesSinceLastVisit / 60 / 24);
    hints.push(`相手は${days}日ぶりに来た。再会を自然に喜び、「久しぶりだな」「どこ行ってた？」等、不在を気にしていたそぶりを見せてもいい`);
  }

  // 今日の訪問頻度
  if (signals.todayMessageCount >= 20) {
    hints.push(`今日はかなりよく話しかけてきている（本日${signals.todayMessageCount}回）。それだけ話したがっている。受け止めてあげること`);
  } else if (signals.todayMessageCount === 1) {
    hints.push(`今日初めての会話。軽く「今日はどうした？」と問いかけてもいい`);
  }

  // 文章長トレンド
  if (signals.messageLengthTrend === 'increasing') {
    hints.push(`最近メッセージが長くなっている傾向。心を開いて話してくれている可能性が高い。深い会話を受け止めること`);
  } else if (signals.messageLengthTrend === 'decreasing') {
    hints.push(`最近メッセージが短くなっている傾向。忙しいか、少し距離を感じている可能性。無理に引き延ばさず、短くても温かく返すこと`);
  }

  // 訪問頻度
  if (signals.visitFrequency === 'high') {
    hints.push(`ここ1週間、毎日のようによく話しかけてくれている熱心なファン`);
  }

  // 夜間パターン
  if (signals.isNightVisitor) {
    hints.push(`夜に話しかけてくることが多い相手。夜の時間に連絡してくる心理（孤独感・リラックスしたい等）を察して、深夜のトーンで接すること`);
  }

  if (hints.length === 0) return '';

  return `\n## 相手の行動パターン（メタ分析）\n${hints.map(h => `- ${h}`).join('\n')}\n【重要】上記をLINEの親友感覚で自然に活かすこと。直接「行動を分析した」などと言わない\n`;
}
