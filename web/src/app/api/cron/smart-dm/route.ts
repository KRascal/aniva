/**
 * コンテキストアウェアDM Cron
 * POST /api/cron/smart-dm
 * Header: x-cron-secret
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

async function generateText(systemMessage: string, userMessage: string): Promise<string> {
  const xaiKey = process.env.XAI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  if (xaiKey) {
    const res = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${xaiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.LLM_MODEL || 'grok-3-mini',
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: userMessage },
        ],
        max_tokens: 200,
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
      max_tokens: 200,
      system: systemMessage,
      messages: [{ role: 'user', content: userMessage }],
    });
    return (response.content[0] as { type: string; text: string }).text?.trim() || '';
  }

  throw new Error('No LLM API key configured');
}

type WeatherCondition = 'rain' | 'snow' | 'clear';

async function getTokyoWeather(): Promise<WeatherCondition> {
  try {
    const res = await fetch('https://wttr.in/Tokyo?format=j1', {
      headers: { 'User-Agent': 'aniva-cron/1.0' },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return 'clear';
    const data = await res.json();
    const code = Number(data?.current_condition?.[0]?.weatherCode ?? 0);
    if ([227, 230, 320, 323, 326, 329, 332, 335, 338, 371, 374, 377].includes(code)) return 'snow';
    if ((code >= 176 && code <= 266) || (code >= 281 && code <= 314) || (code >= 353 && code <= 395)) return 'rain';
    return 'clear';
  } catch {
    return 'clear';
  }
}

function isLateNight(): boolean {
  const jstHour = (new Date().getUTCHours() + 9) % 24;
  return jstHour >= 23 || jstHour < 4;
}

function extractUserName(memorySummary: unknown): string {
  if (!memorySummary || typeof memorySummary !== 'object') return 'あなた';
  const s = memorySummary as Record<string, unknown>;
  return (s.userName as string) || (s.name as string) || 'あなた';
}

/** RelationshipのConversationId一覧を取得（最初の1件） */
async function getConversationIdForRelationship(relationshipId: string): Promise<string | null> {
  const conv = await prisma.conversation.findFirst({
    where: { relationshipId },
    orderBy: { createdAt: 'desc' },
    select: { id: true },
  });
  return conv?.id ?? null;
}

/** Relationship配下の全ConversationIdを取得 */
async function getConversationIds(relationshipId: string): Promise<string[]> {
  const convs = await prisma.conversation.findMany({
    where: { relationshipId },
    select: { id: true },
  });
  return convs.map((c) => c.id);
}

export async function POST(req: NextRequest) {
  const cronSecret = req.headers.get('x-cron-secret');
  if (!cronSecret || cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

  const lateNight = isLateNight();
  const weather = await getTokyoWeather();
  const isBadWeather = weather === 'rain' || weather === 'snow';

  const relationships = await prisma.relationship.findMany({
    where: { isFollowing: true },
    include: {
      character: { select: { id: true, name: true, systemPrompt: true } },
    },
  });

  const results: Array<{ relationshipId: string; trigger: string; characterName: string }> = [];
  let totalSent = 0;
  const MAX_PER_RUN = 10;

  for (const rel of relationships) {
    if (totalSent >= MAX_PER_RUN) break;

    const convIds = await getConversationIds(rel.id);
    if (convIds.length === 0) continue; // Conversationがなければスキップ

    // 1日1通制限: 今日すでにsmart_dmを送ったかチェック
    const todaySmartDm = await prisma.message.findFirst({
      where: {
        conversationId: { in: convIds },
        role: 'CHARACTER',
        metadata: { path: ['type'], equals: 'smart_dm' },
        createdAt: { gte: oneDayAgo },
      },
    });
    if (todaySmartDm) continue;

    const userName = extractUserName(rel.memorySummary);
    const charName = rel.character.name;
    const systemPrompt = rel.character.systemPrompt;
    let triggered = false;

    // トリガーA: 深夜
    if (!triggered && lateNight) {
      const recentUserMsg = await prisma.message.findFirst({
        where: {
          conversationId: { in: convIds },
          role: 'USER',
          createdAt: { gte: oneDayAgo },
        },
      });
      if (recentUserMsg) {
        const weekCount = await prisma.message.count({
          where: {
            conversationId: { in: convIds },
            role: 'CHARACTER',
            metadata: { path: ['trigger'], equals: 'late_night' },
            createdAt: { gte: oneWeekAgo },
          },
        });
        if (weekCount < 2) {
          const content = await generateText(
            systemPrompt,
            `あなたは${charName}。深夜に${userName}がまだ起きている。「お前も眠れないのか？」系の自然なDMを1-2文で書け。キャラの口調を守れ。メッセージ本文のみ返せ。`,
          ).catch(() => '');
          if (content) {
            const convId = await getConversationIdForRelationship(rel.id);
            if (convId) {
              await prisma.message.create({
                data: {
                  conversationId: convId,
                  role: 'CHARACTER',
                  content,
                  metadata: { type: 'smart_dm', trigger: 'late_night', automated: true },
                },
              });
              results.push({ relationshipId: rel.id, trigger: 'late_night', characterName: charName });
              totalSent++;
              triggered = true;
            }
          }
        }
      }
    }

    // トリガーB: 天気
    if (!triggered && isBadWeather) {
      const recentWeatherDm = await prisma.message.findFirst({
        where: {
          conversationId: { in: convIds },
          role: 'CHARACTER',
          metadata: { path: ['trigger'], equals: 'weather' },
          createdAt: { gte: threeDaysAgo },
        },
      });
      if (!recentWeatherDm) {
        const weatherLabel = weather === 'rain' ? '雨' : '雪';
        const content = await generateText(
          systemPrompt,
          `あなたは${charName}。今日の東京は${weatherLabel}だ。${userName}への${weatherLabel}の日らしいDMを1-2文で書け。メッセージ本文のみ返せ。`,
        ).catch(() => '');
        if (content) {
          const convId = await getConversationIdForRelationship(rel.id);
          if (convId) {
            await prisma.message.create({
              data: {
                conversationId: convId,
                role: 'CHARACTER',
                content,
                metadata: { type: 'smart_dm', trigger: 'weather', weather, automated: true },
              },
            });
            results.push({ relationshipId: rel.id, trigger: 'weather', characterName: charName });
            totalSent++;
            triggered = true;
          }
        }
      }
    }

    // トリガーC: 長期不在
    if (!triggered && rel.lastMessageAt && rel.lastMessageAt < sevenDaysAgo) {
      const recentDeepMiss = await prisma.message.findFirst({
        where: {
          conversationId: { in: convIds },
          role: 'CHARACTER',
          metadata: { path: ['trigger'], equals: 'deep_miss' },
          createdAt: { gte: thirtyDaysAgo },
        },
      });
      if (!recentDeepMiss) {
        const memorySummaryText =
          rel.memorySummary && typeof rel.memorySummary === 'object'
            ? JSON.stringify(rel.memorySummary).slice(0, 300)
            : '';
        const content = await generateText(
          systemPrompt,
          `あなたは${charName}。${userName}が7日以上来ていない。過去の記憶: ${memorySummaryText || 'なし'}。エモーショナルで長めのDM（3-4文）を書け。過去の思い出があれば触れること。メッセージ本文のみ返せ。`,
        ).catch(() => '');
        if (content) {
          const convId = await getConversationIdForRelationship(rel.id);
          if (convId) {
            await prisma.message.create({
              data: {
                conversationId: convId,
                role: 'CHARACTER',
                content,
                metadata: { type: 'smart_dm', trigger: 'deep_miss', automated: true },
              },
            });
            results.push({ relationshipId: rel.id, trigger: 'deep_miss', characterName: charName });
            totalSent++;
          }
        }
      }
    }
  }

  return NextResponse.json({ success: true, totalSent, weather, lateNight, results });
}
