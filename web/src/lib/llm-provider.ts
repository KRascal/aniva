/**
 * 共通LLMプロバイダー
 * Primary: Gemini 2.5 Flash
 * Fallback①: xAI Grok
 * Fallback②: Anthropic Haiku
 */

import { logger } from '@/lib/logger';

export interface LLMCallParams {
  systemPrompt: string;
  messages: { role: string; content: string }[];
  maxTokens?: number;
  temperature?: number;
  geminiModel?: string;
}

/** Gemini API呼び出し（OpenAI互換エンドポイント） */
async function callGemini(
  systemPrompt: string,
  messages: { role: string; content: string }[],
  model: string,
  maxTokens: number,
  temperature: number,
): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'system', content: systemPrompt }, ...messages],
          max_tokens: maxTokens,
          temperature,
        }),
      },
    );

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      logger.error(`[llm-provider] Gemini ${model} error ${res.status}: ${errText}`);
      return null;
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() ?? null;
  } catch (e) {
    logger.error(`[llm-provider] Gemini ${model} fetch failed:`, e);
    return null;
  }
}

/** xAI API呼び出し */
async function callXAI(
  systemPrompt: string,
  messages: { role: string; content: string }[],
  maxTokens: number,
  temperature: number,
): Promise<string | null> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.LLM_MODEL_FALLBACK || 'grok-3-mini',
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
        max_tokens: maxTokens,
        temperature,
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      logger.error(`[llm-provider] xAI error ${res.status}: ${errText}`);
      return null;
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() ?? null;
  } catch (e) {
    logger.error('[llm-provider] xAI fetch failed:', e);
    return null;
  }
}

/** Anthropic API呼び出し */
async function callAnthropic(
  systemPrompt: string,
  messages: { role: string; content: string }[],
  maxTokens: number,
): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  try {
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: messages.map(m => ({
        role: (m.role === 'system' ? 'user' : m.role) as 'user' | 'assistant',
        content: m.content,
      })),
    });
    return response.content[0].type === 'text' ? response.content[0].text?.trim() ?? null : null;
  } catch (e) {
    logger.error('[llm-provider] Anthropic haiku failed:', e);
    return null;
  }
}

/**
 * Gemini → xAI → Anthropic のフォールバックチェーンでLLM呼び出し
 */
export async function callLLMWithFallback(params: LLMCallParams): Promise<string> {
  const {
    systemPrompt,
    messages,
    maxTokens = 300,
    temperature = 0.85,
    geminiModel = 'gemini-2.5-flash',
  } = params;

  // 1. Gemini（プライマリ）
  const geminiResult = await callGemini(systemPrompt, messages, geminiModel, maxTokens, temperature);
  if (geminiResult) return geminiResult;

  logger.warn(`[llm-provider] Gemini failed, trying xAI fallback`);

  // 2. xAI（フォールバック①）
  const xaiResult = await callXAI(systemPrompt, messages, maxTokens, temperature);
  if (xaiResult) return xaiResult;

  logger.warn('[llm-provider] xAI failed, trying Anthropic fallback');

  // 3. Anthropic（フォールバック②）
  const anthropicResult = await callAnthropic(systemPrompt, messages, maxTokens);
  if (anthropicResult) return anthropicResult;

  throw new Error('[llm-provider] All LLM providers failed (Gemini, xAI, Anthropic)');
}
