/**
 * 3日間チャットがないユーザーへの自動レター送信 Cron
 * GET /api/cron/letter
 * Header: x-cron-secret
 *
 * - 3日以上チャットがないFCメンバーへ自動レターを送信
 * - memorySummaryがあるユーザーを優先（パーソナライズ精度が高い）
 * - 同じmonthKeyのレターが既にある場合はスキップ
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface FactEntry {
  fact: string;
  confidence: number;
  updatedAt: string;
}

interface EpisodeEntry {
  summary: string;
  emotion: string;
  importance: number;
  date: string;
}

interface MemorySummaryData {
  userName?: string;
  importantFacts?: string[];
  recentTopics?: string[];
  conversationSummary?: string;
  emotionalState?: string;
  factMemory?: FactEntry[];
  episodeMemory?: EpisodeEntry[];
  emotionMemory?: { userEmotion: string; trigger: string }[];
}

async function generateAbsenceLetter(
  systemPrompt: string,
  characterName: string,
  memo: MemorySummaryData,
  userName: string,
  level: number,
  totalMessages: number,
  daysSinceChat: number,
  monthKey: string,
): Promise<string> {
  const facts: string[] = [
    ...(memo.importantFacts ?? []),
    ...(memo.factMemory ?? [])
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 4)
      .map(f => f.fact),
  ].filter((v, i, arr) => arr.indexOf(v) === i).slice(0, 5);

  const episodes = (memo.episodeMemory ?? [])
    .sort((a, b) => b.importance - a.importance)
    .slice(0, 2)
    .map(e => e.summary);

  const recentTopics = (memo.recentTopics ?? []).slice(0, 2);

  const letterPrompt = `あなたは${characterName}です。FC会員の「${userName}」に向けた手紙を書いてください。

【キャラクター設定】
${systemPrompt.split('\n').slice(0, 20).join('\n')}

【状況】
${userName}とは${daysSinceChat}日間話せていない。少し寂しく、心配している。

【${userName}について知っていること】
- 関係レベル: ${level}/5
- 会話回数: ${totalMessages}回
${facts.length ? `- 知っている事実:\n${facts.map(f => `  • ${f}`).join('\n')}` : ''}
${recentTopics.length ? `- 最近話していたこと: ${recentTopics.join('、')}` : ''}
${episodes.length ? `- 思い出:\n${episodes.map(e => `  • ${e}`).join('\n')}` : ''}

【手紙のルール】
1. キャラクターの口調・一人称を完全に守る
2. 「${userName}」という名前を必ず1〜2回使う
3. ${daysSinceChat}日間会えていなかった寂しさ・心配を素直に表現する
4. 知っていることから1〜2個を自然に盛り込む
5. 350〜500文字程度
6. キャラクターらしい書き出しと結び
7. また話しかけてほしいという気持ちを込める
8. 記号や装飾は最小限に（手紙らしく）`;

  const xaiKey = process.env.XAI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  if (xaiKey) {
    const res = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${xaiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.LLM_MODEL || 'grok-3-mini',
        messages: [
          { role: 'system', content: letterPrompt },
          { role: 'user', content: '手紙を書いてください。' },
        ],
        max_tokens: 800,
        temperature: 0.92,
      }),
    });
    if (!res.ok) throw new Error(`xAI error ${res.status}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() || '';
  }

  if (anthropicKey) {
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const client = new Anthropic({ apiKey: anthropicKey });
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 800,
      system: letterPrompt,
      messages: [{ role: 'user', content: '手紙を書いてください。' }],
    });
    return response.content[0].type === 'text' ? response.content[0].text.trim() : '';
  }

  throw new Error('No LLM API key configured');
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('x-cron-secret');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  try {
    // 3日以上チャットしていないFCメンバー
    const inactiveRelationships = await prisma.relationship.findMany({
      where: {
        isFanclub: true,
        lastMessageAt: { lt: threeDaysAgo },
      },
      include: {
        user: { select: { id: true, displayName: true } },
        character: { select: { id: true, name: true, systemPrompt: true } },
        letters: {
          where: { monthKey },
          select: { id: true },
        },
      },
    });

    if (!inactiveRelationships.length) {
      return NextResponse.json({ message: 'No inactive FC members', count: 0 });
    }

    // memorySummaryがあるユーザーを優先（パーソナライズ精度が高い順にソート）
    const sortedRelationships = inactiveRelationships
      .filter(rel => rel.letters.length === 0) // 今月のレターがまだない
      .sort((a, b) => {
        const memoA = (a.memorySummary as MemorySummaryData) ?? {};
        const memoB = (b.memorySummary as MemorySummaryData) ?? {};
        const scoreA =
          (memoA.factMemory?.length ?? 0) * 3 +
          (memoA.episodeMemory?.length ?? 0) * 2 +
          (memoA.recentTopics?.length ?? 0);
        const scoreB =
          (memoB.factMemory?.length ?? 0) * 3 +
          (memoB.episodeMemory?.length ?? 0) * 2 +
          (memoB.recentTopics?.length ?? 0);
        return scoreB - scoreA;
      });

    let generated = 0;
    const errors: string[] = [];

    for (const rel of sortedRelationships) {
      const memo = (rel.memorySummary as MemorySummaryData) ?? {};
      const userName = memo.userName || rel.user?.displayName || 'あなた';

      const daysSinceChat = rel.lastMessageAt
        ? Math.floor((Date.now() - rel.lastMessageAt.getTime()) / 86400000)
        : 999;

      try {
        const content = await generateAbsenceLetter(
          rel.character.systemPrompt,
          rel.character.name,
          memo,
          userName,
          rel.level,
          rel.totalMessages,
          daysSinceChat,
          monthKey,
        );

        if (!content) continue;

        await prisma.letter.create({
          data: {
            relationshipId: rel.id,
            userId: rel.userId,
            characterId: rel.characterId,
            monthKey,
            content,
            isRead: false,
          },
        });

        generated++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`${rel.id}: ${msg}`);
        console.error(`[cron/letter] Failed for ${rel.id}:`, err);
      }
    }

    return NextResponse.json({
      message: 'Absence letters generated',
      count: generated,
      skipped: inactiveRelationships.length - sortedRelationships.length,
      errors: errors.length ? errors : undefined,
    });
  } catch (err) {
    console.error('[cron/letter] Error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
