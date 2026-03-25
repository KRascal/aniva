/**
 * 共通LLMテキスト生成ユーティリティ
 * Gemini (Primary) → xAI (Fallback①) → Anthropic (Fallback②)
 * 
 * 使用箇所: cron/moments, cron/character-comments, cron/smart-dm, etc.
 */

import { callLLMWithFallback } from '@/lib/llm-provider';

export interface GenerateTextOptions {
  maxTokens?: number;
  temperature?: number;
}

/**
 * LLMでテキスト生成。Gemini → xAI → Anthropic のフォールバック。
 */
export async function generateText(
  systemMessage: string,
  userMessage: string,
  options: GenerateTextOptions = {},
): Promise<string> {
  const { maxTokens = 300, temperature = 0.85 } = options;

  return callLLMWithFallback({
    systemPrompt: systemMessage,
    messages: [{ role: 'user', content: userMessage }],
    maxTokens,
    temperature,
  });
}

/**
 * 生成テキストからメタ情報・説明文を除去して短くクリーンにする
 */
export function cleanGeneratedText(raw: string, maxLength = 200): string {
  return raw
    .replace(/[。、！？]?〜[^。！？\n]+[。、！？]?/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}
