// ============================================================
// LLM provider abstraction
// Gemini 2.5 Flash → xAI (Grok) → Anthropic (Claude)
// FC会員: Anthropic claude-sonnet-4-6 優先（プレミアム体験）
// ============================================================

/**
 * Gemini API呼び出し（マルチターン対応）
 */
async function callGeminiChat(
  systemPrompt: string,
  messages: { role: 'user' | 'assistant'; content: string }[],
  maxTokens: number,
): Promise<string | null> {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) return null;

  try {
    // Gemini形式に変換: user→user, assistant→model
    const contents = messages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents,
          generationConfig: {
            maxOutputTokens: maxTokens,
            temperature: 0.85,
          },
        }),
      },
    );
    if (!res.ok) {
      console.error(`[callLLM] Gemini error ${res.status}: ${await res.text()}`);
      return null;
    }
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    return text || null;
  } catch (e) {
    console.error('[callLLM] Gemini fetch failed:', e);
    return null;
  }
}

/**
 * LLM呼び出し。
 * FC会員: Anthropic claude-sonnet-4-6 優先
 * 通常: Gemini 2.5 Flash → xAI → Anthropic haiku
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
      console.error('[callLLM] Anthropic FC model failed, falling back:', e);
    }
  }

  // 通常ユーザー: Gemini 2.5 Flash（最速・コスト1/20）
  const geminiResult = await callGeminiChat(systemPrompt, messages, 500);
  if (geminiResult) return geminiResult;

  // Fallback: xAI (Grok)
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
        console.error(`[callLLM] xAI error ${res.status}: ${errText}`);
      } else {
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content;
        if (text) return text;
      }
    } catch (e) {
      console.error('[callLLM] xAI fetch failed:', e);
    }
  }

  // Final fallback → Anthropic haiku
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

  throw new Error('No LLM API key configured (set GEMINI_API_KEY, XAI_API_KEY, or ANTHROPIC_API_KEY)');
}
