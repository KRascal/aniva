import { NextRequest, NextResponse } from 'next/server';
import { verifyCronAuth } from '@/lib/cron-auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { deliverToChat } from '@/lib/chat-delivery';

export async function GET(req: NextRequest) {
  const authError = verifyCronAuth(req);
  if (authError) return authError;

  try {
    // 全ユーザーの関係性を取得（1回以上チャットしたユーザー）
    const relationships = await prisma.relationship.findMany({
      where: { totalMessages: { gte: 1 } },
      include: {
        user: { select: { id: true, displayName: true } },
        character: { select: { id: true, name: true, slug: true, systemPrompt: true } },
      },
    });

    if (!relationships.length) {
      return NextResponse.json({ message: 'No relationships found', count: 0 });
    }

    const xaiKey = process.env.XAI_API_KEY;
    if (!xaiKey) {
      return NextResponse.json({ error: 'XAI_API_KEY not set' }, { status: 500 });
    }

    let generated = 0;
    let skipped = 0;
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    for (const rel of relationships) {
      // 今月のレターが既にあればスキップ
      const existing = await prisma.letter.findFirst({
        where: {
          relationshipId: rel.id,
          monthKey: currentMonth,
        },
      });
      if (existing) {
        skipped++;
        continue;
      }

      const isFc = rel.isFanclub;
      const memo = (rel.memorySummary as Record<string, unknown>) ?? {};
      const userName = (memo.userName as string) || rel.user?.displayName || 'きみ';
      const facts = (memo.importantFacts as string[]) || [];
      const topics = (memo.recentTopics as string[]) || [];
      const summary = (memo.conversationSummary as string) || '';
      const episodes = (memo.episodeMemory as { summary: string }[]) || [];

      // FC会員: 特別な長い手紙 / 一般: 短めの手紙
      const letterPrompt = isFc
        ? `あなたは${rel.character.name}です。ファンクラブ会員の「${userName}」に月に一度の特別な手紙を書いてください。

${rel.character.systemPrompt}

## ${userName}について知っていること
- 関係レベル: ${rel.level}/5
- 会話数: ${rel.totalMessages}回
${facts.length ? `- 重要な事実: ${facts.join(', ')}` : ''}
${topics.length ? `- 最近の話題: ${topics.join(', ')}` : ''}
${summary ? `- 会話の記録: ${summary}` : ''}
${episodes.length ? `- 思い出: ${episodes.slice(-3).map(e => e.summary).join(', ')}` : ''}

## 手紙のルール
- キャラクターの口調を完全に再現すること
- ${userName}との個人的なエピソードに触れること
- 400-600文字程度（特別に長く）
- キャラらしい書き出しと結び
- 心に響く内容を（ただの挨拶にしない）
- FC限定であることの特別感を出す
- 次に会えることへの期待を込める`
        : `あなたは${rel.character.name}です。「${userName}」に月に一度の手紙を書いてください。

${rel.character.systemPrompt}

## ${userName}について知っていること
- 関係レベル: ${rel.level}/5
- 会話数: ${rel.totalMessages}回
${facts.length ? `- 重要な事実: ${facts.join(', ')}` : ''}
${topics.length ? `- 最近の話題: ${topics.join(', ')}` : ''}

## 手紙のルール
- キャラクターの口調を完全に再現すること
- 200-350文字程度
- キャラらしい書き出しと結び
- また話したい・会いたいという気持ちを込める
- 温かく短い手紙`;

      try {
        const res = await fetch('https://api.x.ai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${xaiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: process.env.LLM_MODEL || 'grok-3-mini',
            messages: [
              { role: 'system', content: letterPrompt },
              { role: 'user', content: `${currentMonth}の手紙を書いてください。` },
            ],
            max_tokens: isFc ? 900 : 500,
            temperature: 0.9,
          }),
        });

        if (!res.ok) {
          logger.error(`[monthly-letter] API error for ${rel.character.name} → ${userName}: ${res.status}`);
          continue;
        }

        const data = await res.json();
        const letterContent = data.choices?.[0]?.message?.content;
        if (!letterContent) continue;

        const letter = await prisma.letter.create({
          data: {
            relationshipId: rel.id,
            userId: rel.userId,
            characterId: rel.characterId,
            monthKey: currentMonth,
            content: letterContent,
            isRead: false,
          },
        });

        // チャットへの配信注入（疎結合: 失敗しても手紙作成には影響しない）
        try {
          // アクティブな会話を取得
          const conversation = await prisma.conversation.findFirst({
            where: { relationshipId: rel.id, isActive: true },
            orderBy: { updatedAt: 'desc' },
          });
          if (conversation) {
            const preview = isFc
              ? `💌 ${rel.character.name}からFC限定の手紙が届きました`
              : `💌 ${rel.character.name}から手紙が届きました`;
            await deliverToChat({
              conversationId: conversation.id,
              userId: rel.userId,
              characterId: rel.characterId,
              deliveryType: 'letter',
              referenceId: letter.id,
              previewContent: preview,
            });
          }
        } catch (deliveryErr) {
          logger.error(`[monthly-letter] deliverToChat failed for ${rel.id}:`, deliveryErr);
        }

        generated++;
      } catch (err) {
        logger.error(`[monthly-letter] Failed for ${rel.id}:`, err);
      }
    }

    return NextResponse.json({
      message: 'Monthly letters generated',
      generated,
      skipped,
      total: relationships.length,
    });
  } catch (err) {
    logger.error('[monthly-letter] Error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
