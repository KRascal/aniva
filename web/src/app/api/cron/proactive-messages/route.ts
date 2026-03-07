/**
 * プロアクティブメッセージ生成 Cron
 * POST /api/cron/proactive-messages
 * Header: x-cron-secret
 *
 * キャラクターがユーザーへ先にメッセージを送る（8時間後に消滅）
 * スケジュール: 0 8,14,20 * * * (JST 8時/14時/20時)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const MAX_PER_RUN = 30;
const EXPIRES_IN_MS = 8 * 60 * 60 * 1000; // 8時間（次のcronサイクルで置き換え）

async function generateProactiveMessage(
  systemPrompt: string,
  userMessage: string,
): Promise<string> {
  const xaiKey = process.env.XAI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  if (xaiKey) {
    const res = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${xaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.LLM_MODEL || 'grok-3-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        max_tokens: 300,
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
      max_tokens: 300,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    });
    return (response.content[0] as { type: string; text: string }).text?.trim() || '';
  }

  throw new Error('No LLM API key configured');
}

function extractUserName(memorySummary: unknown): string {
  if (!memorySummary || typeof memorySummary !== 'object') return 'あなた';
  const s = memorySummary as Record<string, unknown>;
  return (s.userName as string) || (s.name as string) || 'あなた';
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret');
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const cooldownMs = 8 * 60 * 60 * 1000; // 8h クールダウン
  const smartDmCooldownMs = 24 * 60 * 60 * 1000; // smart_dm 競合チェック用
  const missYouThresholdMs = 3 * 24 * 60 * 60 * 1000; // 3日以上不在で miss_you

  // isFollowing=true のリレーションシップを全取得（スキップ考慮して多めに）
  const relationships = await prisma.relationship.findMany({
    where: { isFollowing: true },
    include: {
      character: {
        select: { id: true, name: true, systemPrompt: true },
      },
      user: {
        select: { id: true, displayName: true, nickname: true },
      },
    },
    take: MAX_PER_RUN * 3,
  });

  const results: Array<{
    userId: string;
    characterId: string;
    trigger: string;
    ok: boolean;
    reason?: string;
  }> = [];
  let totalSent = 0;

  for (const rel of relationships) {
    if (totalSent >= MAX_PER_RUN) break;

    // 1. クールダウンチェック: 直近8h以内に送済みか
    const recentProactive = await prisma.characterProactiveMessage.findFirst({
      where: {
        userId: rel.userId,
        characterId: rel.characterId,
        createdAt: { gte: new Date(now.getTime() - cooldownMs) },
      },
      select: { id: true },
    });
    if (recentProactive) {
      results.push({
        userId: rel.userId,
        characterId: rel.characterId,
        trigger: 'skip',
        ok: false,
        reason: 'cooldown',
      });
      continue;
    }

    // 2. smart_dm 競合チェック: 直近24h以内に smart_dm を送済みか
    const conversations = await prisma.conversation.findMany({
      where: { relationshipId: rel.id },
      select: { id: true },
    });
    const convIds = conversations.map((c) => c.id);

    if (convIds.length > 0) {
      const recentSmartDm = await prisma.message.findFirst({
        where: {
          conversationId: { in: convIds },
          role: 'CHARACTER',
          metadata: { path: ['type'], equals: 'smart_dm' },
          createdAt: { gte: new Date(now.getTime() - smartDmCooldownMs) },
        },
        select: { id: true },
      });
      if (recentSmartDm) {
        results.push({
          userId: rel.userId,
          characterId: rel.characterId,
          trigger: 'skip',
          ok: false,
          reason: 'smart_dm_conflict',
        });
        continue;
      }
    }

    // 3. トリガー判定
    let trigger = 'scheduled';
    if (
      rel.lastMessageAt &&
      rel.lastMessageAt < new Date(now.getTime() - missYouThresholdMs)
    ) {
      trigger = 'miss_you';
    } else if (rel.characterEmotion && rel.characterEmotion !== 'neutral') {
      trigger = 'mood';
    }

    const userName = extractUserName(rel.memorySummary);
    const charName = rel.character.name;
    const memorySummaryText =
      rel.memorySummary && typeof rel.memorySummary === 'object'
        ? JSON.stringify(rel.memorySummary).slice(0, 400)
        : '';

    const levelHint =
      rel.level >= 7
        ? '二人はほぼ親友。深い秘密まで打ち明けられる関係。'
        : rel.level >= 4
          ? 'お互いを理解してきた友人関係。'
          : 'まだ知り合って間もないが、心を開きかけている。';

    const triggerHint =
      trigger === 'miss_you'
        ? `${userName}が最近来ていない。寂しさと心配を混ぜた。`
        : trigger === 'mood'
          ? `今の感情(${rel.characterEmotion})を共有したくなった。`
          : '今日の出来事や思ったことを伝えたくなった。';

    const userMessage = [
      `ユーザー名: ${userName}`,
      `関係レベル: ${rel.level} / ${levelHint}`,
      `あなたの感情: ${rel.characterEmotion || 'neutral'}`,
      `記憶: ${memorySummaryText || 'なし'}`,
      `送信理由: ${triggerHint}`,
      '',
      `上記をふまえ、${userName}への先制メッセージを書け。`,
      '【ルール】1〜3文。キャラの一人称・口調を完全に守る。返信を促す余白を残す。消滅ネタはメタ発言禁止。本文のみ返せ。',
    ].join('\n');

    // 4. メッセージ生成
    let content = '';
    try {
      content = await generateProactiveMessage(rel.character.systemPrompt, userMessage);
    } catch (e) {
      console.error('[proactive-messages] LLM error:', e);
      results.push({
        userId: rel.userId,
        characterId: rel.characterId,
        trigger,
        ok: false,
        reason: 'llm_error',
      });
      continue;
    }

    if (!content) {
      results.push({
        userId: rel.userId,
        characterId: rel.characterId,
        trigger,
        ok: false,
        reason: 'empty_content',
      });
      continue;
    }

    // 5. DB保存
    await prisma.characterProactiveMessage.create({
      data: {
        characterId: rel.characterId,
        userId: rel.userId,
        content,
        trigger,
        expiresAt: new Date(now.getTime() + EXPIRES_IN_MS),
        locale: rel.locale || 'ja',
        metadata: {
          relationshipLevel: rel.level,
          emotion: rel.characterEmotion,
          characterName: charName,
        },
      },
    });

    results.push({ userId: rel.userId, characterId: rel.characterId, trigger, ok: true });
    totalSent++;
  }

  return NextResponse.json({ ok: true, totalSent, results });
}
