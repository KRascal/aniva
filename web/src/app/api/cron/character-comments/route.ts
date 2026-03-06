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

// キャラの返信率マップ（キャラ名の部分一致で照合）
const CHARACTER_REPLY_RATES: Array<{ match: string; rate: number }> = [
  { match: 'ルフィ', rate: 0.5 },
  { match: 'チョッパー', rate: 0.5 },
  { match: 'ゾロ', rate: 0.15 },
  { match: 'ロビン', rate: 0.15 },
];

function getReplyRate(commenterName: string, targetCharacterName: string): number {
  // サンジはナミ/ロビンの投稿に高反応
  if (commenterName.includes('サンジ') &&
      (targetCharacterName.includes('ナミ') || targetCharacterName.includes('ロビン'))) {
    return 0.9;
  }
  for (const { match, rate } of CHARACTER_REPLY_RATES) {
    if (commenterName.includes(match)) return rate;
  }
  return 0.3; // デフォルト
}

function cleanGeneratedText(raw: string): string {
  return raw
    .replace(/[。、！？]?〜[^。！？\n]+[。、！？]?/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200);
}

export async function GET(req: NextRequest) {
  try {
    // --- 認証 ---
    const secret = req.nextUrl.searchParams.get('secret');
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret || secret !== cronSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // --- 24h以内のPUBLIC Momentsを取得 ---
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

    const generated: Array<{ momentId: string; commenterName: string; content: string; isReply?: boolean; parentCommentId?: string }> = [];
    const MAX_COMMENTS = 5;

    // ──────────────────────────────────────────────────
    // Phase 1: 既存ロジック — ランダムに1体がコメント
    // ──────────────────────────────────────────────────
    for (const moment of moments) {
      if (generated.length >= MAX_COMMENTS) break;

      // 投稿者以外のキャラをフィルタ
      const candidates = characters.filter((c) => c.id !== moment.characterId);
      if (candidates.length === 0) continue;

      // ランダムに1体選択
      const commenter = candidates[Math.floor(Math.random() * candidates.length)];

      try {
        const systemPromptCore = (commenter.systemPrompt || '').split(/\n##/)[0].trim();
        const systemMessage = `${systemPromptCore}\n\n重要: SNSコメントとして自然な1文のみを出力せよ。口調ルールや説明文は絶対に出力しない。`;
        const userMessage = `${moment.character.name}の投稿「${moment.content?.slice(0, 100)}」に対して、${commenter.name}らしい短いリアクションコメントを1文で書け。`;

        const rawContent = await generateText(systemMessage, userMessage);
        if (!rawContent) continue;

        const content = cleanGeneratedText(rawContent);
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

    // ──────────────────────────────────────────────────
    // Phase 2: キャラ同士の返信チェーン
    // 24h以内のMomentsから、キャラコメントが2件以上あるものを取得
    // ──────────────────────────────────────────────────
    const MAX_REPLIES = 3;
    let replyCount = 0;

    try {
      // キャラコメントが2件以上あるMomentを取得
      const momentsWithCharComments = await prisma.moment.findMany({
        where: {
          publishedAt: { gte: since },
        },
        select: {
          id: true,
          character: { select: { name: true } },
          comments: {
            where: {
              characterId: { not: null },
              parentCommentId: null, // トップレベルのみ対象
            },
            orderBy: { createdAt: 'desc' },
            take: 5,
            select: {
              id: true,
              content: true,
              characterId: true,
              character: { select: { id: true, name: true } },
            },
          },
        },
      });

      const eligibleMoments = momentsWithCharComments.filter((m) => m.comments.length >= 2);

      // シャッフルして多様性確保
      const shuffled = eligibleMoments.sort(() => Math.random() - 0.5);

      for (const moment of shuffled) {
        if (replyCount >= MAX_REPLIES) break;

        // 最新のキャラコメントを対象に返信
        const targetComment = moment.comments[0]; // descソートなので最新が先頭
        if (!targetComment || !targetComment.character) continue;

        const targetCharName = targetComment.character.name;
        const targetCharId = targetComment.character.id;

        // 返信するキャラ: 投稿キャラ以外 + コメントしたキャラ以外からランダム
        const replyCandidates = characters.filter(
          (c) => c.id !== targetCharId && !moment.comments.some((mc) => mc.characterId === c.id && mc.character?.id === c.id)
        );
        if (replyCandidates.length === 0) continue;

        // ランダムに1体選択して返信率をチェック
        const shuffledCandidates = replyCandidates.sort(() => Math.random() - 0.5);
        let replier: typeof characters[0] | null = null;
        for (const candidate of shuffledCandidates) {
          const rate = getReplyRate(candidate.name, targetCharName);
          if (Math.random() < rate) {
            replier = candidate;
            break;
          }
        }
        if (!replier) continue;

        try {
          const systemPromptCore = (replier.systemPrompt || '').split(/\n##/)[0].trim();
          const systemMessage = `${systemPromptCore}\n\n重要: SNSの返信コメントとして自然な1文のみを出力せよ。口調ルールや説明文は絶対に出力しない。`;
          const userMessage = `SNSで${targetCharName}が「${targetComment.content?.slice(0, 100)}」とコメントしている。${replier.name}らしい短い返信を1文で書け。${targetCharName}に話しかけるような自然な口調で。`;

          const rawContent = await generateText(systemMessage, userMessage);
          if (!rawContent) continue;

          const content = cleanGeneratedText(rawContent);
          if (!content) continue;

          await prisma.momentComment.create({
            data: {
              momentId: moment.id,
              characterId: replier.id,
              userId: null,
              content,
              parentCommentId: targetComment.id,
            },
          });

          generated.push({
            momentId: moment.id,
            commenterName: replier.name,
            content,
            isReply: true,
            parentCommentId: targetComment.id,
          });
          replyCount++;
        } catch (err) {
          console.error(`Reply generation failed for ${replier.name}:`, err);
        }
      }
    } catch (err) {
      // replyチェーンのエラーはPhase 1の結果を壊さない
      console.error('Reply chain generation error:', err);
    }

    return NextResponse.json({
      success: true,
      generated,
      count: generated.length,
      replyCount,
    });
  } catch (err) {
    console.error('Cron character-comments error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
