import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { requireAdmin } from '@/lib/admin';
import { SupportedLocale } from '@/types/character-locale';
import { logger } from '@/lib/logger';

const LOCALE_NAMES: Record<string, string> = {
  ja: '日本語',
  en: '英語（English）',
  ko: '韓国語（한국어）',
  zh: '中国語（简体中文）',
};

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const { text, sourceLang = 'ja', targetLangs, context } = body as {
    text: string;
    sourceLang?: string;
    targetLangs: SupportedLocale[];
    context?: string;
  };

  if (!text || !targetLangs || !Array.isArray(targetLangs) || targetLangs.length === 0) {
    return NextResponse.json({ error: 'text と targetLangs は必須です' }, { status: 400 });
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const targetLangList = targetLangs
    .map((l) => `- ${LOCALE_NAMES[l] ?? l} (locale: "${l}")`)
    .join('\n');

  const systemPrompt = `あなたはANIVA（アニメ・IPキャラクタープラットフォーム）の多言語化専門の翻訳家です。
キャラクターのシステムプロンプトや説明文を翻訳する際、以下のルールを厳守してください：

1. キャラクターの口調・性格・世界観・一人称を完全に維持すること
2. 敬語/タメ口/方言など話し方のニュアンスをターゲット言語で再現すること
3. 固有名詞（技名、地名、キャラクター名など）は適切にローカライズすること
4. 文化的に不自然な表現はターゲット言語の自然な表現に置き換えること
5. AIへの指示文（「〜してください」「〜を維持」等）も正確に翻訳すること

出力はJSON形式のみ。説明文や前置きは不要。`;

  const userPrompt = `以下の${LOCALE_NAMES[sourceLang] ?? sourceLang}テキストを、指定された各言語に翻訳してください。
${context ? `\nキャラクター補足情報: ${context}\n` : ''}
翻訳対象言語:
${targetLangList}

翻訳元テキスト:
"""
${text}
"""

以下のJSON形式で返してください（各localeキーに翻訳テキストを入れること）:
{
  "translations": {
${targetLangs.map((l) => `    "${l}": "（${LOCALE_NAMES[l] ?? l}の翻訳）"`).join(',\n')}
  }
}`;

  try {
    const message = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const raw = message.content[0].type === 'text' ? message.content[0].text : '';

    // Extract JSON from response
    const jsonMatch = raw.match(/\{[\s\S]*"translations"[\s\S]*\}/);
    if (!jsonMatch) {
      logger.error('Translation API: no JSON found in response', raw);
      return NextResponse.json({ error: 'APIレスポンスのパースに失敗しました' }, { status: 500 });
    }

    const parsed = JSON.parse(jsonMatch[0]) as { translations: Record<string, string> };

    return NextResponse.json(parsed);
  } catch (err) {
    logger.error('Translation API error:', err);
    return NextResponse.json({ error: '翻訳に失敗しました' }, { status: 500 });
  }
}
