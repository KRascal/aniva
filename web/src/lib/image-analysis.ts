import { logger } from '@/lib/logger';
/**
 * image-analysis.ts — ユーザー画像認識
 * ユーザーが画像を送信したとき、Vision APIで解析してキャラのコメント材料を生成
 */

interface ImageAnalysisResult {
  description: string;
  objects: string[];
  mood: string;
  suggestedReaction: string;
}

/**
 * 画像をVision APIで解析する
 * xAI grok-vision → Anthropic Claude Vision フォールバック
 * 
 * imageUrlOrBuffer: URL文字列 or Base64データURI or { buffer, mimeType }
 */
export async function analyzeImage(
  imageUrlOrBuffer: string | { buffer: Buffer; mimeType: string }
): Promise<ImageAnalysisResult | null> {
  // base64データを準備（bufferが渡された場合は直接使う）
  let base64Data: string | null = null;
  let mediaType = 'image/jpeg';
  let imageUrl: string | null = null;

  if (typeof imageUrlOrBuffer === 'object' && 'buffer' in imageUrlOrBuffer) {
    base64Data = imageUrlOrBuffer.buffer.toString('base64');
    mediaType = imageUrlOrBuffer.mimeType;
  } else {
    imageUrl = imageUrlOrBuffer;
  }

  const visionPrompt = `この画像を簡潔に分析して以下のJSON形式で返してください:
{
  "description": "画像の簡潔な説明（日本語、30文字以内）",
  "objects": ["主要な被写体1", "被写体2"],
  "mood": "画像全体の雰囲気（楽しい/美しい/面白い/美味しそう/可愛い/格好いい/感動的/日常的）",
  "suggestedReaction": "この画像を見たアニメキャラクターが言いそうな自然な反応のヒント（20文字以内）"
}
JSONのみ返してください。`;

  // xAI Grok Vision
  const xaiKey = process.env.XAI_API_KEY;
  if (xaiKey) {
    try {
      // xAIはbase64 data URIまたはURLを受け付ける
      const imageContent = base64Data
        ? { type: 'image_url' as const, image_url: { url: `data:${mediaType};base64,${base64Data}` } }
        : { type: 'image_url' as const, image_url: { url: imageUrl! } };

      const response = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${xaiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'grok-2-vision-latest',
          messages: [
            {
              role: 'user',
              content: [imageContent, { type: 'text', text: visionPrompt }],
            },
          ],
          max_tokens: 300,
          temperature: 0.3,
        }),
      });

      if (response.ok) {
        const data = await response.json() as { choices: Array<{ message: { content: string } }> };
        const content = data.choices[0]?.message?.content ?? '';
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]) as ImageAnalysisResult;
        }
      } else {
        logger.warn('[ImageAnalysis] xAI Vision HTTP error:', response.status);
      }
    } catch (err) {
      logger.warn('[ImageAnalysis] xAI Vision failed:', err);
    }
  }

  // Anthropic Claude Vision フォールバック
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (anthropicKey) {
    try {
      // base64データがなければURLからfetchして変換
      if (!base64Data && imageUrl) {
        const imageResponse = await fetch(imageUrl);
        if (!imageResponse.ok) return null;
        const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
        base64Data = imageBuffer.toString('base64');
        mediaType = imageResponse.headers.get('content-type') || 'image/jpeg';
      }
      if (!base64Data) return null;

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
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'image',
                  source: { type: 'base64', media_type: mediaType, data: base64Data },
                },
                { type: 'text', text: visionPrompt },
              ],
            },
          ],
        }),
      });

      if (response.ok) {
        const data = await response.json() as { content: Array<{ text?: string }> };
        const text = data.content[0]?.text ?? '';
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]) as ImageAnalysisResult;
        }
      } else {
        logger.warn('[ImageAnalysis] Claude Vision HTTP error:', response.status);
      }
    } catch (err) {
      logger.warn('[ImageAnalysis] Claude Vision failed:', err);
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
