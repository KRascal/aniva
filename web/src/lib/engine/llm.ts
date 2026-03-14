import { logger } from '@/lib/logger';

// ============================================================
// LLM provider abstraction
// Primary: Gemini 2.5 Flash/Pro
// Fallback: xAI Grok → Anthropic Haiku
// ============================================================

type LLMMode = 'normal' | 'deep';

/**
 * 会話の深さを自動判定
 * - 10ターン以上 or ユーザー長文(100字+) or 感情キーワード → deep
 */
function detectMode(messages: { role: string; content: string }[]): LLMMode {
  const userMessages = messages.filter(m => m.role === 'user');
  const lastUserMsg = userMessages[userMessages.length - 1]?.content ?? '';

  // 10ターン以上
  if (userMessages.length >= 10) return 'deep';

  // 長文（100文字以上）
  if (lastUserMsg.length >= 100) return 'deep';

  // 感情的話題の検知
  const emotionalKeywords = ['悩み', '辛い', 'つらい', '苦しい', '死にたい', '助けて', '相談', '人生', '将来', '不安', '怖い', '寂しい', '孤独', 'どうすれば', '分からない'];
  if (emotionalKeywords.some(kw => lastUserMsg.includes(kw))) return 'deep';

  return 'normal';
}

/** Gemini API呼び出し（OpenAI互換エンドポイント） */
async function callGemini(
  systemPrompt: string,
  messages: { role: string; content: string }[],
  model: string,
): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'system', content: systemPrompt }, ...messages],
          max_tokens: 600,
          temperature: 0.85,
        }),
      },
    );

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      logger.error(`[callLLM] Gemini ${model} error ${res.status}: ${errText}`);
      return null;
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? null;
  } catch (e) {
    logger.error(`[callLLM] Gemini ${model} fetch failed:`, e);
    return null;
  }
}

/** xAI API呼び出し */
async function callXAI(
  systemPrompt: string,
  messages: { role: string; content: string }[],
): Promise<string | null> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.LLM_MODEL || 'grok-4-1-fast-non-reasoning',
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
        max_tokens: 500,
        temperature: 0.85,
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      logger.error(`[callLLM] xAI error ${res.status}: ${errText}`);
      return null;
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? null;
  } catch (e) {
    logger.error('[callLLM] xAI fetch failed:', e);
    return null;
  }
}

/** Anthropic API呼び出し */
async function callAnthropic(
  systemPrompt: string,
  messages: { role: 'user' | 'assistant'; content: string }[],
  model: string = 'claude-haiku-4-5',
): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  try {
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model,
      max_tokens: 500,
      system: systemPrompt,
      messages,
    });
    return response.content[0].type === 'text' ? response.content[0].text : null;
  } catch (e) {
    logger.error(`[callLLM] Anthropic ${model} failed:`, e);
    return null;
  }
}

/**
 * メインLLM呼び出し
 *
 * フロー:
 * 1. 通常会話 → Gemini 2.5 Flash
 * 2. 深い会話 → Gemini 2.5 Pro（キャラが「考えさせて」と前置き）
 * 3. フォールバック① → xAI grok-fast
 * 4. フォールバック② → Anthropic haiku
 *
 * FC会員: コイン消費なし（呼び出し側で判定）
 */
export async function callLLM(
  systemPrompt: string,
  messages: { role: 'user' | 'assistant'; content: string }[],
  options?: { isFcMember?: boolean; forceMode?: LLMMode },
): Promise<string> {
  const mode = options?.forceMode ?? detectMode(messages);
  const geminiModel = mode === 'deep' ? 'gemini-2.5-flash' : 'gemini-2.5-flash';
  // Note: deep会話でもFlashを使う（Proは将来的にコスト最適化後に導入）
  // Pro切替時: 'gemini-2.5-pro-preview-05-06' に変更

  // 1. Gemini（メイン）
  const geminiResult = await callGemini(systemPrompt, messages, geminiModel);
  if (geminiResult) return geminiResult;

  logger.warn(`[callLLM] Gemini ${geminiModel} failed, trying xAI fallback`);

  // 2. xAI（フォールバック①）
  const xaiResult = await callXAI(systemPrompt, messages);
  if (xaiResult) return xaiResult;

  logger.warn('[callLLM] xAI failed, trying Anthropic haiku fallback');

  // 3. Anthropic haiku（フォールバック②）
  const haikuResult = await callAnthropic(systemPrompt, messages, 'claude-haiku-4-5');
  if (haikuResult) return haikuResult;

  throw new Error('All LLM providers failed (Gemini, xAI, Anthropic)');
}

/** LLMモードを外部から取得（コイン消費判定用） */
export function getLLMMode(messages: { role: string; content: string }[]): LLMMode {
  return detectMode(messages);
}
