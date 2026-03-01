import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// LLM provider - xAI (Grok) or Anthropic
async function generateText(systemMessage: string, userMessage: string): Promise<string> {
  const xaiKey = process.env.XAI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  if (xaiKey) {
    const res = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${xaiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.LLM_MODEL || 'grok-3-mini',
        messages: [{ role: 'system', content: systemMessage }, { role: 'user', content: userMessage }],
        max_tokens: 150,
        temperature: 0.9,
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
      max_tokens: 150,
      system: systemMessage,
      messages: [{ role: 'user', content: userMessage }],
    });
    return (response.content[0] as { type: string; text: string }).text?.trim() || '';
  }

  throw new Error('No LLM API key configured');
}

export async function GET(req: NextRequest) {
  try {
    // --- 認証 ---
    const secret = req.nextUrl.searchParams.get('secret');
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret || secret !== cronSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // --- 24h以内のPUBLIC Momentsを取得 ---
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const moments = await prisma.moment.findMany({
      where: {
        visibility: 'PUBLIC',
        publishedAt: { gte: since },
        content: { not: null },
        type: 'TEXT',
      },
      orderBy: { publishedAt: 'desc' },
      take: 20,
      select: {
        id: true,
        characterId: true,
        content: true,
        character: { select: { id: true, name: true } },
      },
    });

    if (moments.length === 0) {
      return NextResponse.json({ success: true, generated: [], message: 'No recent moments' });
    }

    // --- アクティブキャラ一覧取得 ---
    const characters = await prisma.character.findMany({
      where: { isActive: true },
      select: { id: true, name: true, systemPrompt: true },
    });

    if (characters.length < 2) {
      return NextResponse.json({ success: true, generated: [], message: 'Not enough characters' });
    }

    const generated: Array<{ momentId: string; commenterName: string; content: string }> = [];
    const MAX_COMMENTS = 5;

    for (const moment of moments) {
      if (generated.length >= MAX_COMMENTS) break;

      // 投稿者以外のキャラをフィルタ
      const candidates = characters.filter((c) => c.id !== moment.characterId);
      if (candidates.length === 0) continue;

      // ランダムに1体選択
      const commenter = candidates[Math.floor(Math.random() * candidates.length)];

      try {
        const systemMessage = commenter.systemPrompt;
        const userMessage = `${moment.character.name}の投稿「${moment.content}」に対して、あなた（${commenter.name}）らしい短いリアクションコメントを1文で書け。SNSのコメント欄に書く感じ。説明不要、コメントのみ。`;

        const content = await generateText(systemMessage, userMessage);
        if (!content) continue;

        await prisma.momentComment.create({
          data: {
            momentId: moment.id,
            characterId: commenter.id,
            userId: null,
            content,
          },
        });

        generated.push({ momentId: moment.id, commenterName: commenter.name, content });
      } catch (err) {
        console.error(`Comment generation failed for ${commenter.name}:`, err);
      }
    }

    return NextResponse.json({
      success: true,
      generated,
      count: generated.length,
    });
  } catch (err) {
    console.error('Cron character-comments error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
