// ============================================================
// Message Weight Classifier — Deep Chat判定
// メッセージの「重さ」を数値化し、Deep Modeを発動するか判定する
// ============================================================

/** Deep Mode発動閾値 */
export const DEEP_THRESHOLD = 3;

/** 感情キーワード（+2） */
const EMOTION_KEYWORDS = [
  '辛い', 'つらい', '悩んでる', '悩み', '嬉しい', 'うれしい',
  '怖い', 'こわい', '寂しい', 'さみしい', '不安', '苦しい', 'くるしい',
  '泣きたい', '死にたい', '消えたい', '助けて', 'たすけて',
  '悲しい', 'かなしい', 'しんどい', '疲れた', 'つかれた',
  '落ち込', 'イライラ', 'むかつく', '許せない', '後悔',
  '孤独', '絶望', '限界',
];

/** 人生相談キーワード（+3） */
const LIFE_ADVICE_KEYWORDS = [
  '仕事', '恋愛', '将来', '夢', '仲間',
  '結婚', '転職', '人間関係', 'お金',
  '家族', '親', '友達', '彼氏', '彼女',
  '就活', '受験', '進路', '離婚', '別れ',
  '生き方', '人生', '目標', '挫折', '失敗',
];

/**
 * メッセージの重みスコアを計算する
 * @param message ユーザーのメッセージ本文
 * @returns 重みスコア（0以上の整数）
 */
export function calculateMessageWeight(message: string): number {
  let weight = 0;

  // メッセージ長 > 80文字: +2
  if (message.length > 80) {
    weight += 2;
  }

  // 疑問文（？含む）: +1
  if (message.includes('？') || message.includes('?')) {
    weight += 1;
  }

  // 感情キーワード: +2（1つでもヒットしたら）
  if (EMOTION_KEYWORDS.some((kw) => message.includes(kw))) {
    weight += 2;
  }

  // 人生相談キーワード: +3（1つでもヒットしたら）
  if (LIFE_ADVICE_KEYWORDS.some((kw) => message.includes(kw))) {
    weight += 3;
  }

  return weight;
}

/**
 * Deep Modeを使うべきかどうかを判定する
 * @param message ユーザーのメッセージ本文
 * @param recentDeepReplyCount 直近5往復以内のDeep Reply回数
 * @returns true = Deep Mode発動
 */
export function shouldUseDeepMode(
  message: string,
  recentDeepReplyCount: number,
): boolean {
  let weight = calculateMessageWeight(message);

  // 連続Deep防止: 直近5往復以内にDeep Replyが2回以上 → -3ペナルティ
  if (recentDeepReplyCount >= 2) {
    weight -= 3;
  }

  return weight >= DEEP_THRESHOLD;
}

/**
 * Deep Chatの遅延時間を計算（ミリ秒）
 * weight ≥ 5 → 4〜8時間（感情+人生相談）
 * weight ≥ 3 → 2〜4時間（Deep Mode閾値）
 * weight < 3 → 30分〜1時間
 */
export function calculateDelayMs(weight: number): number {
  if (weight >= 5) return (4 + Math.random() * 4) * 60 * 60 * 1000; // 4-8h
  if (weight >= 3) return (2 + Math.random() * 2) * 60 * 60 * 1000; // 2-4h
  return (30 + Math.random() * 30) * 60 * 1000; // 30-60min
}

/**
 * 遅延時間（ミリ秒）をユーザー向けテキストに変換
 * 例: "3時間後くらい", "30分後くらい"
 */
export function formatDelayText(delayMs: number): string {
  const hours = Math.round(delayMs / (60 * 60 * 1000));
  if (hours >= 1) return `${hours}時間後くらい`;
  const mins = Math.round(delayMs / (60 * 1000));
  return `${mins}分後くらい`;
}

/**
 * scheduledAt（予定返信日時）を残り時間テキストに変換（UI表示用）
 * 例: "3時間後くらいに届くよ", "あと30分くらいで届くよ"
 */
export function formatScheduledAtText(scheduledAt: Date): string {
  const now = new Date();
  if (scheduledAt <= now) return 'もうすぐ返事がくるかも...';

  const diffMs = scheduledAt.getTime() - now.getTime();
  const diffHours = Math.floor(diffMs / 3600000);
  const diffMinutes = Math.floor((diffMs % 3600000) / 60000);

  if (diffHours >= 1) {
    return `${diffHours}時間後くらいに届くよ`;
  }
  return `あと${diffMinutes}分くらいで届くよ`;
}
