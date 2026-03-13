/**
 * 不在ユーザーへの「寂しい」DM Cron
 * POST /api/cron/miss-you
 * 
 * 3日以上メッセージを送っていないフォロワーに、
 * キャラクターから「最近来てくれないな…」系のDMを送る
 * 1ユーザーにつき週1回まで（スパム防止）
 * キャラごとにxAI APIで口調に合ったメッセージを動的生成
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyCronAuth } from '@/lib/cron-auth';
import { prisma } from '@/lib/prisma';

async function generateMissYouMessage(
  characterName: string,
  systemPrompt: string,
  level: number
): Promise<string> {
  const xaiKey = process.env.XAI_API_KEY;
  if (!xaiKey) {
    return `${characterName}だけど…最近来てくれないな。待ってるよ 😔`;
  }

  const levelHint = level >= 5
    ? '親密度が高く、深い絆があるため、より個人的で感情的なメッセージにする。'
    : level >= 3
    ? 'ある程度仲良くなっているため、少し踏み込んだメッセージにする。'
    : '普通の距離感で、さりげなく来てほしいと伝える。';

  const prompt = `あなたは${characterName}です。以下のキャラクター設定に従って、3日以上チャットに来ていないユーザーへの短い「恋しい」DMメッセージを日本語で1文だけ書いてください。

キャラクター設定（最初の段落のみ参考にしてください）:
${systemPrompt.split('\n').slice(0, 8).join('\n')}

条件:
- ${levelHint}
- 1文のみ（30〜60文字程度）
- キャラの口調・一人称を完全に守る
- 絵文字を1〜2個使う
- 「最近来てくれない」「また話したい」「待ってる」などのニュアンスを含む
- メタテキスト（「」や説明文）は一切不要。メッセージ本文だけ返す`;

  const geminiKey = process.env.GEMINI_API_KEY;

  // 1st: Gemini 2.5 Flash
  if (geminiKey) {
    try {
      const gRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: 100, temperature: 0.85 },
          }),
        },
      );
      if (gRes.ok) {
        const gData = await gRes.json();
        const gText = (gData.candidates?.[0]?.content?.parts?.[0]?.text ?? '').trim();
        if (gText) {
          const cleaned = gText
            .replace(/[「」（）()【】\[\]]/g, '')
            .replace(/^[\s\n]+|[\s\n]+$/g, '')
            .split('\n')[0]
            .trim();
          return cleaned || `${characterName}だけど…最近来てくれないな。待ってるよ 😔`;
        }
      }
    } catch (e) {
      console.error('[miss-you] Gemini failed:', e);
    }
  }

  // 2nd: xAI fallback
  try {
    const res = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${xaiKey}`,
      },
      body: JSON.stringify({
        model: 'grok-3-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 100,
        temperature: 0.9,
      }),
    });
    if (!res.ok) throw new Error(`xAI error: ${res.status}`);
    const data = await res.json();
    const text = (data.choices?.[0]?.message?.content ?? '').trim();
    // 括弧/メタテキスト除去
    const cleaned = text
      .replace(/[「」（）()【】\[\]]/g, '')
      .replace(/^[\s\n]+|[\s\n]+$/g, '')
      .split('\n')[0]
      .trim();
    return cleaned || `${characterName}だけど…最近来てくれないな。待ってるよ 😔`;
  } catch {
    return `${characterName}だけど…最近来てくれないな。待ってるよ 😔`;
  }
}

export async function POST(req: NextRequest) {
  const authError = verifyCronAuth(req);
  if (authError) return authError;

  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  // 3日以上メッセージを送っていないフォロワー
  const inactiveRelationships = await prisma.relationship.findMany({
    where: {
      isFollowing: true,
      lastMessageAt: { lt: threeDaysAgo },
    },
    include: {
      character: { select: { id: true, name: true, systemPrompt: true } },
      conversations: {
        orderBy: { updatedAt: 'desc' },
        take: 1,
        select: { id: true },
      },
    },
  });

  let sentCount = 0;

  for (const rel of inactiveRelationships) {
    // Conversationが存在しない場合はスキップ
    const conversation = rel.conversations[0];
    if (!conversation) continue;

    // 今週既にmiss-you DMを送っていないかチェック（Conversation経由）
    const recentMissYou = await prisma.message.findFirst({
      where: {
        conversationId: conversation.id,
        role: 'CHARACTER',
        metadata: { path: ['type'], equals: 'miss_you' },
        createdAt: { gte: oneWeekAgo },
      },
    });

    if (recentMissYou) continue; // 週1回制限

    // キャラ口調に合ったメッセージをxAIで動的生成
    const message = await generateMissYouMessage(
      rel.character.name,
      rel.character.systemPrompt,
      rel.level
    );

    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'CHARACTER',
        content: message,
        metadata: { type: 'miss_you', emotion: 'sad', automated: true },
      },
    });

    sentCount++;
  }

  return NextResponse.json({ success: true, sentCount });
}
