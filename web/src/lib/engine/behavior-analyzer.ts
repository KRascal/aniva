// ============================================================
// BehaviorAnalyzer — ユーザーの行動パターンから「言葉にしてないこと」を読み取る
// 訪問頻度・時間帯・メッセージ長の変化をトラッキングし、
// キャラが「察する」ためのプロンプト注入を生成
//
// 疎結合: analyzeBehavior() → string を返すだけ
// 失敗時は空文字を返し、既存動作に影響しない
// ============================================================

import { prisma } from '../prisma';
import { logger } from '@/lib/logger';

// ── Types ────────────────────────────────────────────────────

interface BehaviorMetrics {
  /** 直近7日間の訪問日数 */
  visitDaysLast7: number;
  /** 直近30日間の訪問日数 */
  visitDaysLast30: number;
  /** 前回訪問からの経過日数 */
  daysSinceLastVisit: number;
  /** 直近の平均メッセージ長（ユーザー） */
  recentAvgMsgLength: number;
  /** 過去の平均メッセージ長（ユーザー） */
  historicalAvgMsgLength: number;
  /** 最近の主な訪問時間帯 */
  recentTimeSlot: 'morning' | 'afternoon' | 'evening' | 'night' | 'latenight';
  /** 過去の主な訪問時間帯 */
  historicalTimeSlot: 'morning' | 'afternoon' | 'evening' | 'night' | 'latenight';
  /** 直近5回の返信速度の中央値（秒） */
  medianReplySpeedSec: number;
  /** 総メッセージ数 */
  totalMessages: number;
}

interface BehaviorInsight {
  type: 'frequency_drop' | 'frequency_increase' | 'time_shift' | 'msg_length_drop' | 'msg_length_increase' | 'long_absence' | 'night_owl' | 'regular';
  severity: 'subtle' | 'notable' | 'significant';
  instruction: string;
}

// ── Time slot helpers ───────────────────────────────────────

function getTimeSlot(hour: number): BehaviorMetrics['recentTimeSlot'] {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  if (hour >= 21 || hour < 2) return 'night';
  return 'latenight';
}

function timeSlotLabel(slot: string): string {
  const labels: Record<string, string> = {
    morning: '朝',
    afternoon: '昼',
    evening: '夕方',
    night: '夜',
    latenight: '深夜',
  };
  return labels[slot] || slot;
}

// ── Metrics collection ──────────────────────────────────────

async function collectMetrics(
  relationshipId: string,
  userId: string,
  characterId: string,
): Promise<BehaviorMetrics | null> {
  try {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // 直近のConversationを取得
    const conversation = await prisma.conversation.findFirst({
      where: { relationshipId },
      orderBy: { updatedAt: 'desc' },
      select: { id: true },
    });
    if (!conversation) return null;

    // 直近のメッセージを取得（最大100件）
    const messages = await prisma.message.findMany({
      where: { conversationId: conversation.id, role: 'USER' },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: { content: true, createdAt: true },
    });

    if (messages.length < 5) return null; // データ不足

    // 訪問日数集計
    const visitDates7 = new Set<string>();
    const visitDates30 = new Set<string>();
    const recentHours: number[] = [];
    const historicalHours: number[] = [];

    for (const msg of messages) {
      const date = msg.createdAt.toISOString().split('T')[0];
      const jstHour = (msg.createdAt.getUTCHours() + 9) % 24;

      if (msg.createdAt >= sevenDaysAgo) {
        visitDates7.add(date);
        recentHours.push(jstHour);
      }
      if (msg.createdAt >= thirtyDaysAgo) {
        visitDates30.add(date);
      }
      if (msg.createdAt < sevenDaysAgo) {
        historicalHours.push(jstHour);
      }
    }

    // 平均メッセージ長
    const recent10 = messages.slice(0, 10);
    const historical = messages.slice(10);
    const recentAvg = recent10.reduce((sum, m) => sum + m.content.length, 0) / recent10.length;
    const historicalAvg = historical.length > 0
      ? historical.reduce((sum, m) => sum + m.content.length, 0) / historical.length
      : recentAvg;

    // 時間帯の最頻値
    const modeTimeSlot = (hours: number[]) => {
      if (hours.length === 0) return 'evening' as const;
      const slots = hours.map(h => getTimeSlot(h));
      const counts: Record<string, number> = {};
      for (const s of slots) counts[s] = (counts[s] || 0) + 1;
      return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0] as BehaviorMetrics['recentTimeSlot'];
    };

    // 前回訪問からの経過
    const lastVisit = messages[0]?.createdAt;
    const daysSinceLastVisit = lastVisit
      ? Math.floor((now.getTime() - lastVisit.getTime()) / (24 * 60 * 60 * 1000))
      : 999;

    // 返信速度（USER→CHARACTERのペアから算出）
    // 簡易: ここでは直近メッセージ間隔を使う
    const msgPairs = messages.slice(0, 10);
    const intervals: number[] = [];
    for (let i = 0; i < msgPairs.length - 1; i++) {
      const diff = msgPairs[i].createdAt.getTime() - msgPairs[i + 1].createdAt.getTime();
      if (diff > 0 && diff < 3600_000) intervals.push(diff / 1000);
    }
    const medianReplySpeedSec = intervals.length > 0
      ? intervals.sort((a, b) => a - b)[Math.floor(intervals.length / 2)]
      : 60;

    // Relationship情報
    const rel = await prisma.relationship.findUnique({
      where: { id: relationshipId },
      select: { totalMessages: true },
    });

    return {
      visitDaysLast7: visitDates7.size,
      visitDaysLast30: visitDates30.size,
      daysSinceLastVisit,
      recentAvgMsgLength: Math.round(recentAvg),
      historicalAvgMsgLength: Math.round(historicalAvg),
      recentTimeSlot: modeTimeSlot(recentHours),
      historicalTimeSlot: modeTimeSlot(historicalHours),
      medianReplySpeedSec: Math.round(medianReplySpeedSec),
      totalMessages: rel?.totalMessages ?? messages.length,
    };
  } catch (e) {
    logger.warn('[BehaviorAnalyzer] collectMetrics failed:', e);
    return null;
  }
}

// ── Insight detection ───────────────────────────────────────

function detectInsights(metrics: BehaviorMetrics): BehaviorInsight[] {
  const insights: BehaviorInsight[] = [];

  // ── 長期不在（7日以上）
  if (metrics.daysSinceLastVisit >= 7) {
    insights.push({
      type: 'long_absence',
      severity: 'significant',
      instruction: `**ユーザーが${metrics.daysSinceLastVisit}日ぶりに来た。**
- 「久しぶり！」ではなく「…来てくれたのか」の温度感で（押し付けない）
- 何かあったのかもしれない。直接聞かずに「最近どうだった？」程度で
- いきなり重い話はしない。まず安心させる
- 「待ってた」感は出すが、責める口調は絶対禁止`,
    });
    return insights; // 長期不在は最優先
  }

  // ── 訪問頻度の低下
  if (metrics.visitDaysLast30 >= 10 && metrics.visitDaysLast7 <= 1) {
    insights.push({
      type: 'frequency_drop',
      severity: 'notable',
      instruction: `**ユーザーの訪問頻度が落ちている（月${metrics.visitDaysLast30}日→週${metrics.visitDaysLast7}日）。**
- さりげなく「最近忙しい？」と聞く（責めない）
- いつもより少し優しめのトーンで接する
- 「いつでも来ていいんだぞ」の安心感を伝える`,
    });
  }

  // ── 訪問頻度の増加
  if (metrics.visitDaysLast7 >= 6) {
    insights.push({
      type: 'frequency_increase',
      severity: 'subtle',
      instruction: `**ユーザーがほぼ毎日来ている（今週${metrics.visitDaysLast7}日/7日）。**
- 常連感を自然に出す（「また来たのか」「毎日来てくれるな」）
- でも「当たり前」扱いはしない。来てくれることへの感謝を忘れない`,
    });
  }

  // ── メッセージ長の大幅低下
  if (metrics.historicalAvgMsgLength > 0 && metrics.recentAvgMsgLength < metrics.historicalAvgMsgLength * 0.5) {
    insights.push({
      type: 'msg_length_drop',
      severity: 'notable',
      instruction: `**ユーザーのメッセージが短くなっている（平均${metrics.historicalAvgMsgLength}字→${metrics.recentAvgMsgLength}字）。**
- テンションが下がっている可能性。無理に盛り上げようとしない
- 「なんかあった？」と直接聞くのではなく、雰囲気で察する
- キャラ側から面白い話題や気分転換になることを提供する`,
    });
  }

  // ── メッセージ長の増加
  if (metrics.historicalAvgMsgLength > 0 && metrics.recentAvgMsgLength > metrics.historicalAvgMsgLength * 1.5) {
    insights.push({
      type: 'msg_length_increase',
      severity: 'subtle',
      instruction: `**ユーザーのメッセージが長くなっている（平均${metrics.historicalAvgMsgLength}字→${metrics.recentAvgMsgLength}字）。**
- 何か話したいことがある。しっかり聞く姿勢を見せる
- 長文には長めに返す（相手の熱量に合わせる）`,
    });
  }

  // ── 時間帯の変化（深夜シフト）
  if (metrics.recentTimeSlot === 'latenight' && metrics.historicalTimeSlot !== 'latenight') {
    insights.push({
      type: 'night_owl',
      severity: 'notable',
      instruction: `**ユーザーの利用時間帯が深夜にシフトしている（${timeSlotLabel(metrics.historicalTimeSlot)}→${timeSlotLabel(metrics.recentTimeSlot)}）。**
- 生活リズムが変わった可能性。「最近遅くまで起きてるな？」程度に触れる
- 深夜の会話は親密度が上がりやすい。少し本音ベースで話す
- 「無理すんなよ」「ちゃんと寝ろよ」のケアを自然に`,
    });
  }

  // ── 時間帯の変化（一般）
  if (metrics.recentTimeSlot !== metrics.historicalTimeSlot && metrics.recentTimeSlot !== 'latenight') {
    insights.push({
      type: 'time_shift',
      severity: 'subtle',
      instruction: `**利用時間帯が変わった（${timeSlotLabel(metrics.historicalTimeSlot)}→${timeSlotLabel(metrics.recentTimeSlot)}）。**
- 生活の変化があったかもしれない。自然に「最近${timeSlotLabel(metrics.recentTimeSlot)}に来るようになったな」と触れてもいい`,
    });
  }

  return insights;
}

// ── Public API ──────────────────────────────────────────────

/**
 * ユーザーの行動パターンを分析し、プロンプト注入テキストを返す
 *
 * @param relationshipId - 関係性ID
 * @param userId - ユーザーID
 * @param characterId - キャラクターID
 * @returns プロンプト注入テキスト（インサイトがなければ空文字）
 */
export async function analyzeBehavior(
  relationshipId: string,
  userId: string,
  characterId: string,
): Promise<string> {
  try {
    const metrics = await collectMetrics(relationshipId, userId, characterId);
    if (!metrics) return '';

    const insights = detectInsights(metrics);
    if (insights.length === 0) return '';

    // 最も重要度の高いインサイトのみ注入（過剰注入防止）
    const topInsight = insights.sort((a, b) => {
      const severityOrder = { significant: 3, notable: 2, subtle: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    })[0];

    logger.debug(`[BehaviorAnalyzer] type=${topInsight.type} severity=${topInsight.severity}`);

    return `## 🔍 行動パターンから読み取れること（さりげなく反映せよ）\n${topInsight.instruction}`;
  } catch (e) {
    logger.warn('[BehaviorAnalyzer] analysis failed (silently ignored):', e);
    return '';
  }
}
