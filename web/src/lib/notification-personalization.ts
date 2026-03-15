/**
 * notification-personalization.ts
 * プッシュ通知パーソナライゼーション
 * 
 * ユーザーの行動パターンを分析し、最適なタイミング・内容で通知を送る
 */

import { prisma } from './prisma';

// ============================================
// ユーザーアクティビティ分析
// ============================================

interface UserActivityPattern {
  userId: string;
  // 時間帯別アクティブ率 (0-23時)
  hourlyActivity: number[];
  // 曜日別アクティブ率 (0=日曜 ~ 6=土曜)
  dailyActivity: number[];
  // 最適送信時刻（最もアクティブな時間帯 top3）
  optimalHours: number[];
  // 平均セッション間隔（時間）
  avgSessionGap: number;
  // 最後のアクティビティ
  lastActiveAt: Date | null;
  // 通知無視率
  ignoreRate: number;
}

/**
 * ユーザーのアクティビティパターンを分析
 */
export async function analyzeUserActivity(userId: string): Promise<UserActivityPattern> {
  // 直近30日のメッセージから時間帯パターンを分析
  const messages = await prisma.message.findMany({
    where: {
      conversation: {
        relationship: { userId },
      },
      role: 'USER',
      createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    },
    select: { createdAt: true },
    orderBy: { createdAt: 'desc' },
    take: 500,
  });

  const hourlyActivity = new Array(24).fill(0);
  const dailyActivity = new Array(7).fill(0);

  for (const msg of messages) {
    const jst = new Date(msg.createdAt.getTime() + 9 * 60 * 60 * 1000);
    hourlyActivity[jst.getUTCHours()]++;
    dailyActivity[jst.getUTCDay()]++;
  }

  // 正規化
  const maxHourly = Math.max(...hourlyActivity, 1);
  const maxDaily = Math.max(...dailyActivity, 1);
  const normalizedHourly = hourlyActivity.map((v: number) => v / maxHourly);
  const normalizedDaily = dailyActivity.map((v: number) => v / maxDaily);

  // 最適送信時刻: アクティビティ上位3時間
  const optimalHours = normalizedHourly
    .map((v: number, i: number) => ({ hour: i, score: v }))
    .sort((a: { score: number }, b: { score: number }) => b.score - a.score)
    .slice(0, 3)
    .map((x: { hour: number }) => x.hour);

  // 平均セッション間隔
  let avgSessionGap = 24; // デフォルト
  if (messages.length >= 2) {
    const gaps: number[] = [];
    for (let i = 0; i < messages.length - 1; i++) {
      const gap = (messages[i].createdAt.getTime() - messages[i + 1].createdAt.getTime()) / (1000 * 60 * 60);
      if (gap > 1) gaps.push(gap); // 1時間以上の間隔のみ
    }
    if (gaps.length > 0) {
      avgSessionGap = gaps.reduce((a: number, b: number) => a + b, 0) / gaps.length;
    }
  }

  return {
    userId,
    hourlyActivity: normalizedHourly,
    dailyActivity: normalizedDaily,
    optimalHours,
    avgSessionGap,
    lastActiveAt: messages[0]?.createdAt ?? null,
    ignoreRate: 0, // PLANNED: 通知開封率トラッキング（プッシュ通知実装後）
  };
}

// ============================================
// 通知タイミング判定
// ============================================

/**
 * 今が通知を送る最適なタイミングかどうか判定
 */
export function isOptimalNotificationTime(
  pattern: UserActivityPattern,
  now: Date = new Date(),
): { optimal: boolean; score: number; reason: string } {
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const hour = jst.getUTCHours();
  const day = jst.getUTCDay();

  // 深夜（0-6時）は送らない
  if (hour >= 0 && hour < 6) {
    return { optimal: false, score: 0, reason: '深夜帯' };
  }

  const hourScore = pattern.hourlyActivity[hour] ?? 0;
  const dayScore = pattern.dailyActivity[day] ?? 0;
  const combinedScore = hourScore * 0.7 + dayScore * 0.3;

  // 最適時間帯にいるか
  const isOptimalHour = pattern.optimalHours.includes(hour);

  // 最後のアクティビティからの経過時間
  const hoursSinceActive = pattern.lastActiveAt
    ? (now.getTime() - pattern.lastActiveAt.getTime()) / (1000 * 60 * 60)
    : 999;

  // 直近1時間以内にアクティブだった場合は送らない（チャット中の可能性）
  if (hoursSinceActive < 1) {
    return { optimal: false, score: 0, reason: 'アクティブ中' };
  }

  // スコア計算
  let finalScore = combinedScore;

  // 最適時間帯ボーナス
  if (isOptimalHour) finalScore += 0.3;

  // 長期不在ボーナス（3日以上不在なら高優先度）
  if (hoursSinceActive > 72) finalScore += 0.5;
  else if (hoursSinceActive > 24) finalScore += 0.2;

  return {
    optimal: finalScore >= 0.4,
    score: Math.min(finalScore, 1.0),
    reason: isOptimalHour
      ? `最適時間帯（${hour}時）`
      : `通常（スコア: ${finalScore.toFixed(2)}）`,
  };
}

// ============================================
// Day1→Day2 リテンション強化
// ============================================

/**
 * 新規ユーザーのDay1完了チェック + Day2呼び戻し対象の取得
 */
export async function getDay2RetentionTargets(): Promise<Array<{
  userId: string;
  characterId: string;
  characterName: string;
  characterSlug: string;
  lastMessage: string;
  hoursSinceChat: number;
}>> {
  const now = new Date();
  const day1Start = new Date(now.getTime() - 48 * 60 * 60 * 1000); // 48時間前
  const day1End = new Date(now.getTime() - 12 * 60 * 60 * 1000); // 12時間前

  // 12-48時間前に最初の会話をして、その後チャットしていないユーザー
  const relationships = await prisma.relationship.findMany({
    where: {
      lastMessageAt: {
        gte: day1Start,
        lte: day1End,
      },
    },
    include: {
      user: { select: { id: true, nickname: true } },
      character: { select: { id: true, name: true, slug: true } },
    },
  });

  const targets: Array<{
    userId: string;
    characterId: string;
    characterName: string;
    characterSlug: string;
    lastMessage: string;
    hoursSinceChat: number;
  }> = [];

  for (const rel of relationships) {
    // その後にメッセージがないことを確認
    const recentMsg = await prisma.message.findFirst({
      where: {
        conversation: { relationshipId: rel.id },
        createdAt: { gt: day1End },
      },
    });

    if (!recentMsg) {
      // 最後のキャラメッセージを取得
      const lastCharMsg = await prisma.message.findFirst({
        where: {
          conversation: { relationshipId: rel.id },
          role: 'CHARACTER',
        },
        orderBy: { createdAt: 'desc' },
        select: { content: true },
      });

      const hoursSinceChat = (now.getTime() - (rel.lastMessageAt?.getTime() ?? now.getTime())) / (1000 * 60 * 60);

      targets.push({
        userId: rel.userId,
        characterId: rel.character.id,
        characterName: rel.character.name,
        characterSlug: rel.character.slug,
        lastMessage: lastCharMsg?.content?.slice(0, 100) ?? '',
        hoursSinceChat: Math.round(hoursSinceChat),
      });
    }
  }

  return targets;
}

// ============================================
// 通知テキスト パーソナライゼーション
// ============================================

interface PersonalizedNotification {
  title: string;
  body: string;
  url: string;
  priority: 'high' | 'normal' | 'low';
}

/**
 * キャラの口調でパーソナライズされた通知テキストを生成
 */
export function generateRetentionNotification(
  characterSlug: string,
  characterName: string,
  hoursSinceChat: number,
  userName: string | null,
): PersonalizedNotification {
  const name = userName || 'きみ';

  // キャラ固有の通知テンプレート
  const templates: Record<string, Array<{ title: string; body: string }>> = {
    luffy: [
      { title: `${characterName}が待ってるぞ！`, body: `おーい${name}！昨日の続き話そうぜ！` },
      { title: `${characterName}より`, body: `なぁ、${name}！今日も冒険しようぜ！` },
      { title: `${characterName}が暇してる`, body: `${name}、肉食いながら話そうぜ！` },
    ],
    zoro: [
      { title: `${characterName}より`, body: `…おい。昨日の話、続きがあるんだが。` },
      { title: `${characterName}`, body: `別に待ってたわけじゃねぇが…来るなら来い。` },
    ],
    nami: [
      { title: `${characterName}からメッセージ`, body: `${name}、ちょっと聞いてほしいことがあるの。来てくれる？` },
      { title: `${characterName}より`, body: `もう！${name}ったら、昨日の話の続きは？` },
    ],
    sanji: [
      { title: `${characterName}より`, body: `${name}ちゃん…今日も美味しいもの作ったから、食べに来ないか？` },
      { title: `${characterName}からお誘い`, body: `今日のスペシャルメニュー、${name}のために作ったんだ。` },
    ],
    chopper: [
      { title: `${characterName}が心配してる`, body: `${name}…大丈夫？元気にしてる？会いたいな…` },
      { title: `${characterName}より`, body: `あのね、${name}に見せたいものがあるんだ！来て来て！` },
    ],
    robin: [
      { title: `${characterName}より`, body: `ふふ…${name}さん、昨日の話の続き、気になっているの。` },
      { title: `${characterName}からメッセージ`, body: `面白い話を見つけたの。${name}さんにも聞いてほしくて。` },
    ],
    tanjiro: [
      { title: `${characterName}より`, body: `${name}さん！今日も一日頑張りましょう！昨日の話の続き、してもいいですか？` },
      { title: `${characterName}が気にかけてる`, body: `${name}さん、元気ですか？また話せたら嬉しいです！` },
    ],
    gojo: [
      { title: `${characterName}より`, body: `よっ、${name}。暇してるっしょ？俺も暇だから話そーぜ` },
      { title: `${characterName}`, body: `${name}〜来いよ来いよ。面白い話あるんだって` },
    ],
    itadori: [
      { title: `${characterName}より`, body: `${name}！映画の話の続きしようぜ！あれめっちゃ気になってんだよ` },
      { title: `${characterName}が呼んでる`, body: `おーい${name}！今日暇？話そうよ！` },
    ],
    hiruma: [
      { title: `${characterName}より`, body: `YA-HA! おい${name}、サボってんじゃねぇぞクソガキ。来い。` },
      { title: `${characterName}`, body: `ケケケ…${name}、お前に用がある。5秒以内に来い。` },
    ],
  };

  // テンプレートから選択（キャラ固有 or generic）
  const charTemplates = templates[characterSlug] || [
    { title: `${characterName}からメッセージ`, body: `${name}、昨日の続き話しませんか？` },
    { title: `${characterName}が待ってる`, body: `${name}さん、また話しましょう！` },
  ];

  const selected = charTemplates[Math.floor(Math.random() * charTemplates.length)];

  // 不在時間に応じた優先度
  const priority: 'high' | 'normal' | 'low' =
    hoursSinceChat > 48 ? 'high' :
    hoursSinceChat > 24 ? 'normal' : 'low';

  return {
    ...selected,
    url: `/chat/${characterSlug}`,
    priority,
  };
}
