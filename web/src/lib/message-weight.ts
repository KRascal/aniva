// ============================================================
// Message Weight Classifier — Deep Chat判定
// メッセージの「重さ」を数値化し、Deep Modeを発動するか判定する
//
// 設計思想（2026-03-17 改訂）:
// - 悩み・感情相談は即時応答（寄り添いが最優先。遅延は依存を切断する）
// - Deep Modeは「哲学的質問」「複雑な相談」のみ（感情系は除外）
// - Deep Modeでも最大60秒（体感「ちょっと考えてる」レベル）
// ============================================================

/** Deep Mode発動閾値（引き上げ: 感情系を除外したため高めに設定） */
export const DEEP_THRESHOLD = 6;

/**
 * 感情キーワード — Deep判定には使わない（即時応答する）
 * calculateMessageWeight内ではスコア加算しない。
 * shouldUseDeepMode内でnegativeフラグとして使い、Deep発動を抑制する。
 */
const EMOTION_KEYWORDS = [
  '辛い', 'つらい', '悩んでる', '悩み', '嬉しい', 'うれしい',
  '怖い', 'こわい', '寂しい', 'さみしい', '不安', '苦しい', 'くるしい',
  '泣きたい', '死にたい', '消えたい', '助けて', 'たすけて',
  '悲しい', 'かなしい', 'しんどい', '疲れた', 'つかれた',
  '落ち込', 'イライラ', 'むかつく', '許せない', '後悔',
  '孤独', '絶望', '限界',
];

/**
 * Deep Chat対象キーワード（哲学的・複雑な質問のみ）
 * 感情系は除外。「考えが必要」な質問だけがDeep対象。
 */
const DEEP_TOPIC_KEYWORDS = [
  '人生の意味', '生きる意味', '幸せとは', '正義とは', '愛とは',
  '人間とは', '世界はなぜ', '宇宙', '哲学', '運命',
  'もし〜だったら', 'もしも', '仮に',
];

/**
 * メッセージの重みスコアを計算する
 * 感情系キーワードはスコアに加算しない（即時応答させるため）
 * @param message ユーザーのメッセージ本文
 * @returns 重みスコア（0以上の整数）
 */
export function calculateMessageWeight(message: string): number {
  let weight = 0;

  // メッセージ長 > 120文字: +2（閾値を引き上げ）
  if (message.length > 120) {
    weight += 2;
  }

  // 疑問文（？含む）: +1
  if (message.includes('？') || message.includes('?')) {
    weight += 1;
  }

  // 哲学的/複雑な質問キーワード: +4
  if (DEEP_TOPIC_KEYWORDS.some((kw) => message.includes(kw))) {
    weight += 4;
  }

  // 超長文（200文字超）: +2 追加
  if (message.length > 200) {
    weight += 2;
  }

  return weight;
}

/**
 * 感情系メッセージかどうかを判定する（Deep Mode抑制用）
 */
export function isEmotionalMessage(message: string): boolean {
  return EMOTION_KEYWORDS.some((kw) => message.includes(kw));
}

/**
 * Deep Modeを使うべきかどうかを判定する
 * 感情系メッセージは即時応答するためDeep Modeを発動しない
 * @param message ユーザーのメッセージ本文
 * @param recentDeepReplyCount 直近5往復以内のDeep Reply回数
 * @returns true = Deep Mode発動
 */
export function shouldUseDeepMode(
  message: string,
  recentDeepReplyCount: number,
): boolean {
  // 感情系メッセージは絶対にDeep Modeにしない（即時応答で寄り添う）
  if (isEmotionalMessage(message)) {
    return false;
  }

  let weight = calculateMessageWeight(message);

  // 連続Deep防止: 直近5往復以内にDeep Replyが2回以上 → -3ペナルティ
  if (recentDeepReplyCount >= 2) {
    weight -= 3;
  }

  return weight >= DEEP_THRESHOLD;
}

/**
 * Deep Chatの遅延時間を計算（ミリ秒）
 * 2026-03-17改訂: 最大60秒。「ちょっと考えてる」体感に留める。
 * 数時間の遅延は依存を切断するため廃止。
 */
export function calculateDelayMs(weight: number): number {
  if (weight >= 8) return (40 + Math.random() * 20) * 1000; // 40-60秒
  if (weight >= 6) return (20 + Math.random() * 20) * 1000; // 20-40秒
  return (15 + Math.random() * 15) * 1000; // 15-30秒
}

/**
 * 遅延時間（ミリ秒）をユーザー向けテキストに変換
 */
export function formatDelayText(delayMs: number): string {
  const secs = Math.round(delayMs / 1000);
  if (secs <= 30) return 'すぐ';
  return 'ちょっと待って';
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
