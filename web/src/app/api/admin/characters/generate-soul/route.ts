import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { requireAdmin } from '@/lib/admin';
import { logger } from '@/lib/logger';

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const { name, slug, franchise, description, systemPrompt, catchphrases, voiceModelId } = body;

  if (!name || !slug) {
    return NextResponse.json({ error: 'name と slug は必須です' }, { status: 400 });
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const prompt = `キャラクター「${name}」(${franchise || 'オリジナル'})のANIVA用定義ファイルを生成してください。
${description ? `説明: ${description}` : ''}
${systemPrompt ? `システムプロンプト: ${systemPrompt}` : ''}
${catchphrases ? `キャッチフレーズ: ${catchphrases}` : ''}
${voiceModelId ? `ボイスモデルID: ${voiceModelId}` : ''}

以下の3つのセクションを日本語で生成してください:
1. SOUL（性格の核・価値観・口調・癖）- 400文字程度
2. VOICE（台詞サンプル5パターン・口語・感情別）- 各50文字程度
3. BOUNDARIES（NGワード・崩さない線・禁止事項）- 200文字程度

必ずJSONのみで返答してください（マークダウンコードブロック不要）:
{ "soul": "...", "voice": "...", "boundaries": "..." }`;

  let soul = '';
  let voice = '';
  let boundaries = '';

  try {
    const message = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '';
    // Extract JSON - try parsing directly, or extract from code block
    let jsonStr = text.trim();
    const match = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) {
      jsonStr = match[1].trim();
    }
    const parsed = JSON.parse(jsonStr);
    soul = parsed.soul || '';
    voice = parsed.voice || '';
    boundaries = parsed.boundaries || '';
  } catch (err) {
    logger.error('Claude API error:', err);
    return NextResponse.json({ error: 'AI生成に失敗しました' }, { status: 500 });
  }

  // Save to /home/openclaw/.openclaw/agents/{slug}/
  try {
    const agentsBase = '/home/openclaw/.openclaw/agents';
    const charDir = join(agentsBase, slug);
    if (!existsSync(charDir)) {
      mkdirSync(charDir, { recursive: true });
    }
    writeFileSync(join(charDir, 'SOUL.md'), `# SOUL - ${name}\n\n${soul}\n`, 'utf-8');
    writeFileSync(join(charDir, 'VOICE.md'), `# VOICE - ${name}\n\n${voice}\n`, 'utf-8');
    writeFileSync(join(charDir, 'BOUNDARIES.md'), `# BOUNDARIES - ${name}\n\n${boundaries}\n`, 'utf-8');
  } catch (err) {
    logger.error('File write error:', err);
    // Non-fatal: return the generated text anyway
  }

  return NextResponse.json({ soul, voice, boundaries });
}
