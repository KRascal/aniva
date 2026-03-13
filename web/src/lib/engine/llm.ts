import { logger } from '@/lib/logger';
// ============================================================
// LLM provider abstraction - supports Anthropic, xAI (Grok)
// ============================================================

/**
 * LLM呼び出し。FC会員はAnthropic優先、通常はxAI、最終フォールバックはAnthropic haiku
 */
export async function callLLM(
  systemPrompt: string,
  messages: { role: 'user' | 'assistant'; content: string }[],
  options?: { isFcMember?: boolean },
): Promise<string> {
  const xaiKey = process.env.XAI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const isFc = options?.isFcMember ?? false;

  // FC会員 → Anthropic claude-sonnet-4-6 を優先（高品質会話）
  if (isFc && anthropicKey) {
    try {
      const Anthropic = (await import('@anthropic-ai/sdk')).default;
      const client = new Anthropic({ apiKey: anthropicKey });
      const response = await client.messages.create({
        model: process.env.LLM_MODEL_FC || 'claude-sonnet-4-6',
        max_tokens: 600,
        system: systemPrompt,
        messages,
      });
      const text = response.content[0].type === 'text' ? response.content[0].text : '';
      if (text) return text;
    } catch (e) {
      logger.error('[callLLM] Anthropic FC model failed, falling back to xAI:', e);
    }
  }

  // 通常ユーザー → xAI (grok-4-1-fast)
  if (xaiKey) {
    try {
      const res = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${xaiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: process.env.LLM_MODEL || 'grok-4-1-fast-non-reasoning',
          messages: [{ role: 'system', content: systemPrompt }, ...messages],
          max_tokens: 500,
          temperature: 0.85,
        }),
      });
      if (!res.ok) {
        const errText = await res.text();
        logger.error(`[callLLM] xAI error ${res.status}: ${errText} - falling back to Anthropic`);
      } else {
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content;
        if (text) return text;
      }
    } catch (e) {
      logger.error('[callLLM] xAI fetch failed, falling back to Anthropic:', e);
    }
  }

  // Fallback → Anthropic haiku
  if (anthropicKey) {
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const client = new Anthropic({ apiKey: anthropicKey });
    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 500,
      system: systemPrompt,
      messages,
    });
    return response.content[0].type === 'text' ? response.content[0].text : '';
  }

  throw new Error('No LLM API key configured (set XAI_API_KEY or ANTHROPIC_API_KEY)');
}
