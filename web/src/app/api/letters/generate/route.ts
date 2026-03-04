/**
 * パーソナライズドレター生成 API
 * POST /api/letters/generate
 * Body: { characterId: string, userId?: string }
 * 
 * memorySummaryを使って深くパーソナライズされたレターを生成・保存する
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
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

async function generatePersonalizedLetter(
  systemPrompt: string,
  characterName: string,
  memo: MemorySummaryData,
  userName: string,
  level: number,
  totalMessages: number,
  lastMessageAt: Date | null,
  lastLetterAt: Date | null,
  monthKey: string,
): Promise<string> {
  // 前回レターからの日数
  const daysSinceLetter = lastLetterAt
    ? Math.floor((Date.now() - lastLetterAt.getTime()) / 86400000)
    : null;

  // 最後のチャットからの日数
  const daysSinceChat = lastMessageAt
    ? Math.floor((Date.now() - lastMessageAt.getTime()) / 86400000)
    : null;

  // 重要な事実（factMemoryとimportantFactsをマージ）
  const facts: string[] = [
    ...(memo.importantFacts ?? []),
    ...(memo.factMemory ?? [])
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5)
      .map(f => f.fact),
  ].filter((v, i, arr) => arr.indexOf(v) === i).slice(0, 6);

  // エピソード記憶（重要度順）
  const episodes = (memo.episodeMemory ?? [])
    .sort((a, b) => b.importance - a.importance)
    .slice(0, 3)
    .map(e => e.summary);

  // 感情状態
  const emotionalState = memo.emotionalState || '';

  // 最近の話題
  const recentTopics = (memo.recentTopics ?? []).slice(0, 3);

  // 久しぶり感の文脈
  let timeContext = '';
  if (daysSinceLetter !== null) {
    if (daysSinceLetter > 30) timeContext = '前回の手紙から1ヶ月以上が経っている。';
    else if (daysSinceLetter > 14) timeContext = '前回の手紙から2週間以上が経っている。';
  }
  if (daysSinceChat !== null) {
    if (daysSinceChat > 7) timeContext += `最後に話したのが${daysSinceChat}日前で、少し寂しかった。`;
    else if (daysSinceChat <= 1) timeContext += '最近もよく話していて、とても嬉しい気持ち。';
  }

  const letterPrompt = `あなたは${characterName}です。FC会員の「${userName}」に向けた、${monthKey}の特別な手紙を書いてください。

【キャラクター設定】
${systemPrompt.split('\n').slice(0, 20).join('\n')}

【${userName}について知っていること】
- 関係レベル: ${level}/5（${level >= 4 ? '非常に深い絆' : level >= 3 ? '仲良し' : 'まだ関係を育んでいる'}）
- 会話回数: ${totalMessages}回
${facts.length ? `- 重要な事実:\n${facts.map(f => `  • ${f}`).join('\n')}` : ''}
${recentTopics.length ? `- 最近話していたこと: ${recentTopics.join('、')}` : ''}
${episodes.length ? `- 大切な思い出:\n${episodes.map(e => `  • ${e}`).join('\n')}` : ''}
${emotionalState ? `- ${userName}の感情状態: ${emotionalState}` : ''}
${timeContext ? `- 時間の文脈: ${timeContext}` : ''}

【手紙のルール】
1. キャラクターの口調・一人称を完全に守る
2. 「${userName}」という名前を必ず1〜2回使う
3. 上記の「知っていること」から1〜2個を自然に盛り込む（直接コピーせず、会話の中で触れるように）
4. 400〜600文字程度
5. キャラクターらしい書き出し（「親愛なる○○へ」形式をキャラ口調でアレンジ）
6. 結びもキャラクターらしく、次に会える期待を込める
7. FC限定の特別感を出す
8. ただの挨拶にせず、心に響く個人的な内容にする
9. 記号や装飾は最小限に（手紙らしく）`;

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
          { role: 'user', content: `${monthKey}の手紙を書いてください。` },
        ],
        max_tokens: 900,
        temperature: 0.92,
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
      max_tokens: 900,
      system: letterPrompt,
      messages: [{ role: 'user', content: `${monthKey}の手紙を書いてください。` }],
    });
    return response.content[0].type === 'text' ? response.content[0].text.trim() : '';
  }

  throw new Error('No LLM API key configured');
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { characterId?: string; userId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { characterId } = body;
  // adminがuserIdを指定できるが、通常は自分のID
  const userId = session.user.id;

  if (!characterId) {
    return NextResponse.json({ error: 'characterId is required' }, { status: 400 });
  }

  try {
    // Relationship取得
    const relationship = await prisma.relationship.findUnique({
      where: { userId_characterId: { userId, characterId } },
      include: {
        user: { select: { displayName: true } },
        character: { select: { name: true, systemPrompt: true, slug: true } },
        letters: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { createdAt: true, monthKey: true },
        },
      },
    });

    if (!relationship) {
      return NextResponse.json({ error: 'Relationship not found' }, { status: 404 });
    }

    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // 今月のレターが既にあれば返す
    const existingLetter = await prisma.letter.findUnique({
      where: { relationshipId_monthKey: { relationshipId: relationship.id, monthKey } },
    });
    if (existingLetter) {
      return NextResponse.json({ letter: existingLetter, cached: true });
    }

    const memo = (relationship.memorySummary ?? {}) as MemorySummaryData;
    const userName = memo.userName || relationship.user?.displayName || 'あなた';
    const lastLetterAt = relationship.letters[0]?.createdAt ?? null;

    const content = await generatePersonalizedLetter(
      relationship.character.systemPrompt,
      relationship.character.name,
      memo,
      userName,
      relationship.level,
      relationship.totalMessages,
      relationship.lastMessageAt,
      lastLetterAt,
      monthKey,
    );

    if (!content) {
      return NextResponse.json({ error: 'Failed to generate letter content' }, { status: 500 });
    }

    const letter = await prisma.letter.create({
      data: {
        relationshipId: relationship.id,
        userId,
        characterId,
        monthKey,
        content,
        isRead: false,
      },
    });

    return NextResponse.json({ letter, cached: false });
  } catch (err) {
    console.error('[letters/generate] Error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
