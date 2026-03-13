/**
 * 共通LLMテキスト生成ユーティリティ
 * Gemini 2.5 Flash → xAI (Grok) → Anthropic (Claude) のフォールバック
 * 
 * 使用箇所: cron/moments, cron/character-comments, cron/smart-dm, etc.
 */

export interface GenerateTextOptions {
  maxTokens?: number;
  temperature?: number;
}

/**
 * Gemini API呼び出し（Google AI Studio）
 */
async function callGemini(
  systemMessage: string,
  userMessage: string,
  maxTokens: number,
  temperature: number,
): Promise<string | null> {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) return null;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemMessage }] },
          contents: [{ parts: [{ text: userMessage }] }],
          generationConfig: {
            maxOutputTokens: maxTokens,
            temperature,
          },
        }),
      },
    );
    if (!res.ok) {
      console.error(`[generateText] Gemini error ${res.status}: ${await res.text()}`);
      return null;
    }
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    return text || null;
  } catch (e) {
    console.error('[generateText] Gemini fetch failed:', e);
    return null;
  }
}

/**
 * LLMでテキスト生成。Gemini 2.5 Flash → xAI → Anthropic のフォールバック。
 */
export async function generateText(
  systemMessage: string,
  userMessage: string,
  options: GenerateTextOptions = {},
): Promise<string> {
  const { maxTokens = 300, temperature = 0.85 } = options;

  // 1st: Gemini 2.5 Flash（最速・最安）
  const geminiResult = await callGemini(systemMessage, userMessage, maxTokens, temperature);
  if (geminiResult) return geminiResult;

  // 2nd: xAI (Grok)
  const xaiKey = process.env.XAI_API_KEY;
  if (xaiKey) {
    try {
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
      if (res.ok) {
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content?.trim();
        if (text) return text;
      } else {
        console.error(`[generateText] xAI error ${res.status}: ${await res.text()}`);
      }
    } catch (e) {
      console.error('[generateText] xAI fetch failed:', e);
    }
  }

  // 3rd: Anthropic (Claude)
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
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

  throw new Error('No LLM API key configured (GEMINI_API_KEY, XAI_API_KEY, or ANTHROPIC_API_KEY required)');
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
