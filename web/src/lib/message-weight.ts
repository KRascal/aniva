/**
 * Message Weight Classifier
 * チャットメッセージの「重さ」を計算し、Deep Reply が必要かどうかを判定する。
 *
 * スコア >= DEEP_THRESHOLD で Deep Mode に切り替わる。
 */

export const DEEP_THRESHOLD = 3;

/** 感情キーワード（重みスコア: +2） */
const EMOTION_KEYWORDS = [
  '辛い', 'つらい', '悲しい', '悲しくて', '寂しい', 'さびしい',
  '嬉しい', 'うれしい', '幸せ', 'しあわせ', '怖い', 'こわい',
  '不安', '心配', 'イライラ', 'むかつく', '怒り', 'がっかり',
  '泣いて', 'なきたい', '落ち込んで', 'へこんで', '疲れた', 'つかれた',
  '苦しい', 'くるしい', '孤独', 'ひとりぼっち', '絶望',
  'やばい', 'ヤバい', 'すごい', 'すごく', '感動',
];

/** 人生相談キーワード（重みスコア: +3） */
const LIFE_KEYWORDS = [
  '仕事', 'しごと', '転職', 'てんしょく', '就職', 'しゅうしょく',
  '恋愛', 'れんあい', '彼氏', 'かれし', '彼女', 'かのじょ', '好き', '失恋',
  '将来', 'しょうらい', '夢', 'ゆめ', '目標', 'もくひょう',
  '仲間', 'なかま', '友達', '友人', '家族', 'かぞく',
  '悩み', 'なやみ', '相談', 'そうだん', 'どうしたら', 'どうすれば',
  '死にたい', '生きる', 'いきる', '人生', 'じんせい', '意味',
  'お金', 'おかね', '借金', 'しゃっきん', '貧乏', '節約',
];

/** 深い質問パターン（重みスコア: +2） */
const DEEP_QUESTION_PATTERNS = [
  /なぜ|なんで|どうして/,
  /どう思う|どう思うか/,
  /教えて|おしえて/,
  /どうしたら|どうすれば|どうしよう/,
  /あなたは.*どう|キャラ.*思う/,
  /本当に|ほんとうに|実際|じっさい/,
];

/** メッセージの重みスコアを計算する */
export function calculateMessageWeight(
  message: string,
  recentDeepReplied: boolean = false,
  userPreferInstant: boolean = false,
): number {
  if (userPreferInstant) return 0;

  let score = 0;

  // 長文ボーナス
  if (message.length > 80) score += 2;
  else if (message.length > 40) score += 1;

  // 疑問文
  if (message.includes('？') || message.includes('?')) score += 1;

  // 感情キーワード
  const lowerMsg = message.toLowerCase();
  for (const kw of EMOTION_KEYWORDS) {
    if (message.includes(kw)) {
      score += 2;
      break; // 1回だけカウント
    }
  }

  // 人生相談キーワード
  for (const kw of LIFE_KEYWORDS) {
    if (message.includes(kw)) {
      score += 3;
      break;
    }
  }

  // 深い質問パターン
  for (const pattern of DEEP_QUESTION_PATTERNS) {
    if (pattern.test(message)) {
      score += 2;
      break;
    }
  }

  // 連続Deep防止: 直近にDeep Reply済みなら抑制
  if (recentDeepReplied) score -= 3;

  return Math.max(0, score);
}

/** Deep Mode が必要かどうかを判定する */
export function isDeepMode(
  message: string,
  recentDeepReplied: boolean = false,
  userPreferInstant: boolean = false,
): boolean {
  return calculateMessageWeight(message, recentDeepReplied, userPreferInstant) >= DEEP_THRESHOLD;
}

/** chat/send/route.ts との互換エイリアス */
export function shouldUseDeepMode(
  message: string,
  recentDeepReplyCount: number = 0,
  userPreferInstant: boolean = false,
): boolean {
  return isDeepMode(message, recentDeepReplyCount > 0, userPreferInstant);
}
