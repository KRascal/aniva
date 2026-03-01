import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(req: Request) {
  const authHeader = req.headers.get('x-cron-secret');
  if (CRON_SECRET && authHeader !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const fcRelationships = await prisma.relationship.findMany({
      where: { isFanclub: true },
      include: {
        user: { select: { id: true, displayName: true } },
        character: { select: { id: true, name: true, slug: true, systemPrompt: true } },
      },
    });

    if (!fcRelationships.length) {
      return NextResponse.json({ message: 'No FC members', count: 0 });
    }

    const xaiKey = process.env.XAI_API_KEY;
    if (!xaiKey) {
      return NextResponse.json({ error: 'XAI_API_KEY not set' }, { status: 500 });
    }

    let generated = 0;
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    for (const rel of fcRelationships) {
      const existing = await prisma.letter.findFirst({
        where: {
          relationshipId: rel.id,
          monthKey: currentMonth,
        },
      });
      if (existing) continue;

      const memo = (rel.memorySummary as Record<string, unknown>) ?? {};
      const userName = (memo.userName as string) || rel.user?.displayName || 'お前';
      const facts = (memo.importantFacts as string[]) || [];
      const topics = (memo.recentTopics as string[]) || [];
      const summary = (memo.conversationSummary as string) || '';
      const episodes = (memo.episodeMemory as { summary: string }[]) || [];

      const letterPrompt = `あなたは${rel.character.name}です。ファンクラブ会員の「${userName}」に月に一度の特別な手紙を書いてください。

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
- 300-500文字程度
- 「親愛なる${userName}へ」的な書き出し（キャラらしい言い回しで）
- 結びもキャラらしく
- 心に響く内容を（ただの挨拶にしない）
- FC限定であることの特別感を出す
- 次に会えることへの期待を込める`;

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
            max_tokens: 800,
            temperature: 0.9,
          }),
        });

        if (!res.ok) continue;

        const data = await res.json();
        const letterContent = data.choices?.[0]?.message?.content;
        if (!letterContent) continue;

        await prisma.letter.create({
          data: {
            relationshipId: rel.id,
            userId: rel.userId,
            characterId: rel.characterId,
            monthKey: currentMonth,
            content: letterContent,
            isRead: false,
          },
        });

        generated++;
      } catch (err) {
        console.error(`[monthly-letter] Failed for ${rel.id}:`, err);
      }
    }

    return NextResponse.json({ message: 'Monthly letters generated', count: generated });
  } catch (err) {
    console.error('[monthly-letter] Error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
