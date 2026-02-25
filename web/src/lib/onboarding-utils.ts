/**
 * ANIVA Onboarding Utilities
 */

/**
 * Typewriter effect: delays between characters
 */
export async function typewriterDelay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Runs a typewriter effect on a setter callback
 * @param text - Full text to display
 * @param setter - React setState callback
 * @param msPerChar - Delay in ms per character (default: 35ms)
 */
export async function runTypewriter(
  text: string,
  setter: (value: string) => void,
  msPerChar = 35
): Promise<void> {
  setter('');
  for (let i = 0; i <= text.length; i++) {
    setter(text.slice(0, i));
    if (i < text.length) {
      await typewriterDelay(msPerChar);
    }
  }
}

/**
 * Extract Japanese keywords from user input (simplified morphological analysis)
 * Extracts sequences of CJK characters, hiragana, katakana
 */
export function extractKeywords(text: string): string[] {
  const matches = text.match(/[\u4e00-\u9faf\u3040-\u309f\u30a0-\u30ff]{2,}/g) ?? [];
  // Deduplicate and limit
  return [...new Set(matches)].slice(0, 5);
}

/**
 * Extract relevant content from conversation history by turn index
 */
export function extractFromHistory(
  history: Array<{ role: 'user' | 'assistant'; content: string }>,
  turnIndex: number
): string {
  // Each turn is 2 messages (user + assistant)
  const userMsgIndex = turnIndex * 2;
  if (userMsgIndex < history.length) {
    return history[userMsgIndex].content;
  }
  return '';
}

/**
 * Build memory context string from conversation history (for turn 4)
 */
export function buildMemoryContext(
  history: Array<{ role: 'user' | 'assistant'; content: string }>
): string {
  const turn0 = extractFromHistory(history, 0);
  const turn1 = extractFromHistory(history, 1);
  const turn2 = extractFromHistory(history, 2);

  return [
    turn0 && `- 好きなこと・興味: ${turn0}`,
    turn1 && `- 最近の体験: ${turn1}`,
    turn2 && `- 価値観・感情: ${turn2}`,
  ]
    .filter(Boolean)
    .join('\n');
}

/**
 * Quiz diagnostic matrix: [Q1 answer][Q2 answer] → character tags
 * Q1: 落ち込んだ時どうする？ (a=alone, b=talk, c=move)
 * Q2: 好きな関係性は？ (a=tsundere, b=sweet, c=cool, d=genki)
 */
const QUIZ_MATRIX: Record<string, Record<string, string[]>> = {
  alone: {
    tsundere: ['クール', 'ミステリアス'],
    sweet: ['甘え系', '包容力'],
    cool: ['クール', 'クーデレ'],
    genki: ['元気', 'にぎやか'],
  },
  talk: {
    tsundere: ['ツンデレ', '反応大きめ'],
    sweet: ['甘々', '共感力'],
    cool: ['穏やか', '聞き上手'],
    genki: ['元気', '友達感覚'],
  },
  move: {
    tsundere: ['情熱系', 'ツンデレ'],
    sweet: ['活発', '甘え系'],
    cool: ['スポーティ', 'クール'],
    genki: ['元気', 'スポーツ系'],
  },
};

export type Q1Answer = 'alone' | 'talk' | 'move';
export type Q2Answer = 'tsundere' | 'sweet' | 'cool' | 'genki';

/**
 * Get character tags from quiz answers
 */
export function getQuizTags(q1: Q1Answer, q2: Q2Answer): string[] {
  return QUIZ_MATRIX[q1]?.[q2] ?? ['フレンドリー', 'おしゃべり'];
}

/**
 * Calculate match percentage for a character based on quiz answers
 * (Simple mock calculation for display)
 */
export function calcMatchPercent(
  q1: Q1Answer,
  q2: Q2Answer,
  characterIndex: number
): number {
  // Deterministic but varied match calculation
  const base = 72;
  const variance = ((q1.length + q2.length + characterIndex) % 20) - 5;
  return Math.min(99, Math.max(65, base + variance));
}

/**
 * Sleep utility
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
