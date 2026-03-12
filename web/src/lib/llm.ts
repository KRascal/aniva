/**
 * 共通LLMテキスト生成ユーティリティ
 * xAI (Grok) → Anthropic (Claude) のフォールバック
 * 
 * 使用箇所: cron/moments, cron/character-comments, cron/smart-dm, etc.
 */

export interface GenerateTextOptions {
  maxTokens?: number;
  temperature?: number;
}

/**
 * LLMでテキスト生成。xAI → Anthropic のフォールバック。
 */
export async function generateText(
  systemMessage: string,
  userMessage: string,
  options: GenerateTextOptions = {},
): Promise<string> {
  const { maxTokens = 300, temperature = 0.85 } = options;
  const xaiKey = process.env.XAI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  if (xaiKey) {
    const res = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${xaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.LLM_MODEL || 'grok-3-mini',
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: userMessage },
        ],
        max_tokens: maxTokens,
        temperature,
      }),
    });
    if (!res.ok) throw new Error(`xAI API error ${res.status}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() || '';
  }

  if (anthropicKey) {
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const client = new Anthropic({ apiKey: anthropicKey });
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: maxTokens,
      system: systemMessage,
      messages: [{ role: 'user', content: userMessage }],
    });
    return (response.content[0] as { type: string; text: string }).text?.trim() || '';
  }

  throw new Error('No LLM API key configured (XAI_API_KEY or ANTHROPIC_API_KEY required)');
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
