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
        max_tokens: 300,
        temperature: 0.85,
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
      max_tokens: 300,
      system: systemMessage,
      messages: [{ role: 'user', content: userMessage }],
    });
    return (response.content[0] as { type: string; text: string }).text?.trim() || '';
  }

  throw new Error('No LLM API key configured');
}

function getTimeOfDay(): string {
  // JST = UTC+9
  const now = new Date();
  const jstHour = (now.getUTCHours() + 9) % 24;
  if (jstHour >= 5 && jstHour < 11) return 'morning';
  if (jstHour >= 11 && jstHour < 17) return 'afternoon';
  if (jstHour >= 17 && jstHour < 21) return 'evening';
  return 'night';
}

export async function GET(req: NextRequest) {
  try {
    // --- 認証 ---
    const secret = req.nextUrl.searchParams.get('secret');
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret || secret !== cronSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // --- アクティブキャラ一覧取得 ---
    const characters = await prisma.character.findMany({
      where: { isActive: true },
      select: { id: true, name: true, systemPrompt: true },
    });

    if (characters.length === 0) {
      return NextResponse.json({ generated: [], message: 'No active characters' });
    }

    // ── 連投防止: 過去3時間以内に投稿したキャラを除外 ──
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
    const recentPosters = await prisma.moment.findMany({
      where: { publishedAt: { gte: threeHoursAgo } },
      select: { characterId: true },
      distinct: ['characterId'],
    });
    const recentPosterIds = new Set(recentPosters.map(m => m.characterId));

    // Moment数が少ないキャラを優先して生成（偏り自動補正）
    const maxPerRun = 3;
    const momentCounts = await prisma.moment.groupBy({
      by: ['characterId'],
      _count: { id: true },
    });
    const countMap = new Map(momentCounts.map(m => [m.characterId, m._count.id]));
    
    // 過去3時間以内に投稿したキャラを除外してからソート
    const eligible = characters.filter(c => !recentPosterIds.has(c.id));
    // 全員が最近投稿済みならランダムに1キャラだけ選ぶ
    const pool = eligible.length > 0 ? eligible : [characters[Math.floor(Math.random() * characters.length)]];
    
    // Moment数の少ない順にソート（同数ならランダム）
    const sorted = [...pool].sort((a, b) => {
      const ca = countMap.get(a.id) ?? 0;
      const cb = countMap.get(b.id) ?? 0;
      return ca !== cb ? ca - cb : Math.random() - 0.5;
    });
    const batchChars = sorted.slice(0, maxPerRun);

    const timeOfDay = getTimeOfDay();
    const generated: Array<{ characterId: string; characterName: string; content: string }> = [];

    for (const character of batchChars) {
      try {
        // --- 最新5件のMomentsを取得 ---
        const recentMoments = await prisma.moment.findMany({
          where: { characterId: character.id, type: 'TEXT', content: { not: null } },
          orderBy: { publishedAt: 'desc' },
          take: 5,
          select: { content: true },
        });

        const recentTexts = recentMoments
          .map((m: { content: string | null }, i: number) => `${i + 1}. ${m.content}`)
          .join('\n');

        // --- Anthropicでテキスト生成 ---
        const systemMessage = character.systemPrompt;
        const userMessage = `あなたは${character.name}だ。SNSに投稿する1件の短いテキストを書け。
- キャラクターの口調・世界観を完璧に守ること
- 1-3文の短文
- 時間帯（朝/昼/夕/夜）に合った内容にすること
- 過去の投稿と被らないこと
過去の投稿:
${recentTexts || '（なし）'}
現在の時間帯: ${timeOfDay}

投稿テキストのみ返答せよ。説明や前置き・後書きは一切不要。`;

        const content = await generateText(systemMessage, userMessage);
        if (!content) continue;

        // --- DBに保存（時刻分散: キャラごとに0〜30分のランダムオフセット） ---
        const offsetMs = Math.floor(Math.random() * 30 * 60 * 1000); // 0〜30分
        const staggeredTime = new Date(Date.now() - offsetMs);

        await prisma.moment.create({
          data: {
            characterId: character.id,
            type: 'TEXT',
            content,
            visibility: 'PUBLIC',
            publishedAt: staggeredTime,
          },
        });

        generated.push({ characterId: character.id, characterName: character.name, content });
      } catch (err) {
        console.error(`Moment generation failed for ${character.name}:`, err);
      }
    }

    // ── キャラ間コメント生成（他キャラの投稿にコメント） ──
    const crossComments: Array<{ from: string; to: string; momentId: string; content: string }> = [];
    try {
      // 過去24時間の投稿からランダムに1件選ぶ（コメント0のものを優先）
      const recentMoments = await prisma.moment.findMany({
        where: {
          publishedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          type: 'TEXT',
          content: { not: null },
        },
        include: {
          character: { select: { id: true, name: true, systemPrompt: true } },
          _count: { select: { comments: true } },
        },
        orderBy: { publishedAt: 'desc' },
        take: 20,
      });

      // コメント少ない順でソート
      const sortedMoments = recentMoments.sort((a, b) => a._count.comments - b._count.comments);
      const targetMoment = sortedMoments[0];

      if (targetMoment && characters.length > 1) {
        // 投稿主以外のキャラからランダムに1人選ぶ
        const otherChars = characters.filter(c => c.id !== targetMoment.characterId);
        const commenter = otherChars[Math.floor(Math.random() * otherChars.length)];

        if (commenter) {
          const commentPrompt = `あなたは${commenter.name}だ。
${targetMoment.character.name}がSNSに投稿した内容:
「${targetMoment.content}」

この投稿に対して、${commenter.name}としてコメントを1つだけ書け。
- ${commenter.name}のキャラクターの口調・世界観を守ること
- 1文で短く
- 自然な友人同士のやりとりのように
- コメントテキストのみ返答せよ`;

          const commentContent = await generateText(
            commenter.systemPrompt,
            commentPrompt
          );

          if (commentContent) {
            await prisma.momentComment.create({
              data: {
                momentId: targetMoment.id,
                characterId: commenter.id,
                content: commentContent,
              },
            });
            crossComments.push({
              from: commenter.name,
              to: targetMoment.character.name,
              momentId: targetMoment.id,
              content: commentContent,
            });

            // 投稿主キャラが返信（50%の確率で）
            if (Math.random() < 0.5) {
              const replyPrompt = `あなたは${targetMoment.character.name}だ。
あなたのSNS投稿:
「${targetMoment.content}」

${commenter.name}がコメントした:
「${commentContent}」

このコメントに対して返信を1つだけ書け。
- ${targetMoment.character.name}の口調・世界観を守ること
- 1文で短く自然に
- 返信テキストのみ返答せよ`;

              const replyContent = await generateText(
                targetMoment.character.systemPrompt,
                replyPrompt
              );

              if (replyContent) {
                // 返信コメントを取得してparentCommentIdを設定
                const parentComment = await prisma.momentComment.findFirst({
                  where: {
                    momentId: targetMoment.id,
                    characterId: commenter.id,
                    content: commentContent,
                  },
                  select: { id: true },
                  orderBy: { createdAt: 'desc' },
                });

                if (parentComment) {
                  await prisma.momentComment.create({
                    data: {
                      momentId: targetMoment.id,
                      characterId: targetMoment.characterId,
                      content: replyContent,
                      parentCommentId: parentComment.id,
                    },
                  });
                  crossComments.push({
                    from: targetMoment.character.name,
                    to: commenter.name,
                    momentId: targetMoment.id,
                    content: replyContent,
                  });
                }
              }
            }
          }
        }
      }
    } catch (err) {
      console.error('Cross-comment generation error:', err);
    }

    return NextResponse.json({
      success: true,
      timeOfDay,
      generated,
      crossComments,
      count: generated.length,
      batch: `${maxPerRun} eligible chars of ${characters.length} (${recentPosterIds.size} skipped - recent posts)`,
    });
  } catch (err) {
    console.error('Cron moments error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
