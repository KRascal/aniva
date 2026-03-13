/**
 * image-analysis.ts — ユーザー画像認識
 * ユーザーが画像を送信したとき、Vision APIで解析してキャラのコメント材料を生成
 * 
 * 優先順位: Gemini 2.5 Flash → xAI Grok Vision → Anthropic Claude Vision
 */

interface ImageAnalysisResult {
  description: string;
  objects: string[];
  mood: string;
  suggestedReaction: string;
}

const ANALYSIS_PROMPT = `この画像を簡潔に分析して以下のJSON形式で返してください:
{"description":"画像の簡潔な説明（日本語30文字以内）","objects":["主要な被写体1","被写体2"],"mood":"画像全体の雰囲気（楽しい/美しい/面白い/美味しそう/可愛い/格好いい/感動的/日常的）","suggestedReaction":"この画像を見たアニメキャラクターが言いそうな自然な反応のヒント（20文字以内）"}
JSONのみ返してください。`;

/**
 * 画像URLからBase64データを取得
 */
async function fetchImageAsBase64(imageUrl: string): Promise<{ base64: string; mimeType: string } | null> {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) return null;
    const buffer = Buffer.from(await response.arrayBuffer());
    const base64 = buffer.toString('base64');
    const mimeType = response.headers.get('content-type') || 'image/jpeg';
    return { base64, mimeType };
  } catch {
    return null;
  }
}

/**
 * JSONレスポンスをパースしてImageAnalysisResultを返す
 */
function parseAnalysisJson(text: string): ImageAnalysisResult | null {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  try {
    return JSON.parse(jsonMatch[0]) as ImageAnalysisResult;
  } catch {
    return null;
  }
}

/**
 * Gemini 2.5 Flash Vision API
 */
async function analyzeWithGemini(base64: string, mimeType: string): Promise<ImageAnalysisResult | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: ANALYSIS_PROMPT },
              { inlineData: { mimeType, data: base64 } },
            ],
          }],
          generationConfig: {
            maxOutputTokens: 300,
            temperature: 0.3,
          },
        }),
      },
    );

    if (response.ok) {
      const data = await response.json() as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      return parseAnalysisJson(text);
    }
  } catch (err) {
    console.warn('[ImageAnalysis] Gemini Vision failed:', err);
  }

  return null;
}

/**
 * xAI Grok Vision API（フォールバック1）
 */
async function analyzeWithGrok(imageUrl: string): Promise<ImageAnalysisResult | null> {
  const xaiKey = process.env.XAI_API_KEY;
  if (!xaiKey) return null;

  try {
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${xaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'grok-2-vision-latest',
        messages: [{
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: imageUrl } },
            { type: 'text', text: ANALYSIS_PROMPT },
          ],
        }],
        max_tokens: 300,
        temperature: 0.3,
      }),
    });

    if (response.ok) {
      const data = await response.json() as { choices: Array<{ message: { content: string } }> };
      const content = data.choices[0]?.message?.content ?? '';
      return parseAnalysisJson(content);
    }
  } catch (err) {
    console.warn('[ImageAnalysis] xAI Vision failed:', err);
  }

  return null;
}

/**
 * Anthropic Claude Vision API（フォールバック2）
 */
async function analyzeWithClaude(base64: string, mimeType: string): Promise<ImageAnalysisResult | null> {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) return null;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': anthropicKey,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 300,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mimeType, data: base64 } },
            { type: 'text', text: ANALYSIS_PROMPT },
          ],
        }],
      }),
    });

    if (response.ok) {
      const data = await response.json() as { content: Array<{ text?: string }> };
      const text = data.content[0]?.text ?? '';
      return parseAnalysisJson(text);
    }
  } catch (err) {
    console.warn('[ImageAnalysis] Claude Vision failed:', err);
  }

  return null;
}

/**
 * 画像をVision APIで解析する
 * Gemini 2.5 Flash → xAI Grok Vision → Anthropic Claude Vision フォールバック
 */
export async function analyzeImage(imageUrl: string): Promise<ImageAnalysisResult | null> {
  // Base64変換（Gemini/Claude用）
  const imageData = await fetchImageAsBase64(imageUrl);

  // 1. Gemini 2.5 Flash（最優先 — 高速・低コスト）
  if (imageData) {
    const geminiResult = await analyzeWithGemini(imageData.base64, imageData.mimeType);
    if (geminiResult) {
      console.log('[ImageAnalysis] Gemini Vision success');
      return geminiResult;
    }
  }

  // 2. xAI Grok Vision（フォールバック1 — URL直接渡し可）
  const grokResult = await analyzeWithGrok(imageUrl);
  if (grokResult) {
    console.log('[ImageAnalysis] xAI Grok Vision success (fallback)');
    return grokResult;
  }

  // 3. Anthropic Claude Vision（フォールバック2）
  if (imageData) {
    const claudeResult = await analyzeWithClaude(imageData.base64, imageData.mimeType);
    if (claudeResult) {
      console.log('[ImageAnalysis] Claude Vision success (fallback)');
      return claudeResult;
    }
  }

  return null;
}

/**
 * 画像解析結果をキャラクターへのプロンプトヒントに変換
 */
export function imageAnalysisToPromptHint(analysis: ImageAnalysisResult): string {
  return `【ユーザーが画像を送ってきた】
- 画像の内容: ${analysis.description}
- 被写体: ${analysis.objects.join(', ')}
- 雰囲気: ${analysis.mood}
- 反応のヒント: ${analysis.suggestedReaction}
※ 画像についてキャラクターらしくコメントしてください。「見たよ」「送ってくれたんだ」のような反応から入ると自然。`;
}
