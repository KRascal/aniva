/**
 * 日次セッションログ生成エンジン
 * セッション終了時に会話をLLMで要約し、翌日の「昨日の○○」を技術的に保証する
 *
 * 体験品質 #3: 日次セッションログ（memory/YYYY-MM-DD.md方式）
 */

import { prisma } from '../prisma';
import { logger } from '../logger';

const XAI_API_ENDPOINT = 'https://api.x.ai/v1';
const XAI_MODEL = 'grok-3-mini';

interface SessionLogResult {
  summary: string;
  followUpItems: string[];
  nextDayHook: string;
  emotionalHighlight?: string;
}

/**
 * xAI APIを呼び出してセッションサマリーを生成する
 */
async function callXAIForSessionLog(conversationText: string): Promise<SessionLogResult> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    throw new Error('XAI_API_KEY not set');
  }

  const systemPrompt = `以下の会話から以下の3つをJSON形式で生成せよ:
①今日の要約（2文、summary）
②フォローアップ項目（相手に明日聞くべきこと、followUpItems: string[]）
③翌日の冒頭で使える一言（nextDayHook: string）
④感情的ハイライト（emotionalHighlight: string | null）

出力形式（JSONのみ、説明不要）:
{
  "summary": "...",
  "followUpItems": ["...", "..."],
  "nextDayHook": "...",
  "emotionalHighlight": "..."
}`;

  const response = await fetch(`${XAI_API_ENDPOINT}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: XAI_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: conversationText },
      ],
      max_tokens: 512,
      temperature: 0.5,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    throw new Error(`xAI API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json() as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('xAI API returned empty content');
  }

  const parsed = JSON.parse(content) as Partial<SessionLogResult & { followUpItems?: unknown; emotionalHighlight?: unknown }>;
  return {
    summary: typeof parsed.summary === 'string' ? parsed.summary : '',
    followUpItems: Array.isArray(parsed.followUpItems)
      ? (parsed.followUpItems as unknown[]).filter((x): x is string => typeof x === 'string')
      : [],
    nextDayHook: typeof parsed.nextDayHook === 'string' ? parsed.nextDayHook : '',
    emotionalHighlight: typeof parsed.emotionalHighlight === 'string' ? parsed.emotionalHighlight : undefined,
  };
}

/**
 * セッション終了時に日次セッションログを保存する
 * エラー時はサイレントに無視（既存動作を壊さない）
 */
export async function logSessionEnd(relationshipId: string, conversationId: string): Promise<void> {
  try {
    // 直近30件のメッセージを取得
    const messages = await prisma.message.findMany({
      where: {
        conversationId,
        role: { in: ['USER', 'CHARACTER'] },
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
      select: { role: true, content: true },
    });

    if (messages.length < 2) {
      // 会話が少なすぎる場合はスキップ
      return;
    }

    const reversedMessages = messages.reverse();
    const conversationText = reversedMessages
      .map((m) => `${m.role === 'USER' ? 'ユーザー' : 'キャラ'}: ${m.content}`)
      .join('\n');

    const result = await callXAIForSessionLog(conversationText);

    // 今日の日付（JST）
    const now = new Date();
    const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    const dateStr = jst.toISOString().split('T')[0]; // "2026-03-16"

    const messageCount = reversedMessages.filter((m) => m.role === 'USER').length;

    // upsert（同じdate+relationshipIdがあれば更新）
    await prisma.dailySessionLog.upsert({
      where: {
        relationshipId_date: {
          relationshipId,
          date: dateStr,
        },
      },
      create: {
        relationshipId,
        date: dateStr,
        summary: result.summary,
        followUpItems: result.followUpItems,
        nextDayHook: result.nextDayHook || null,
        emotionalHighlight: result.emotionalHighlight || null,
        messageCount,
      },
      update: {
        summary: result.summary,
        followUpItems: result.followUpItems,
        nextDayHook: result.nextDayHook || null,
        emotionalHighlight: result.emotionalHighlight || null,
        messageCount,
      },
    });

    logger.info(`[logSessionEnd] Saved daily session log for relationship ${relationshipId} on ${dateStr}`);
  } catch (error) {
    // エラーはサイレントに無視（既存動作を壊さない）
    logger.warn('[logSessionEnd] Failed (silently ignored):', error);
  }
}

/**
 * 前日の日次セッションログを取得する
 */
export async function getYesterdaySessionLog(relationshipId: string): Promise<{ nextDayHook?: string | null } | null> {
  try {
    const now = new Date();
    const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    // 前日の日付
    jst.setDate(jst.getDate() - 1);
    const yesterdayStr = jst.toISOString().split('T')[0];

    const log = await prisma.dailySessionLog.findUnique({
      where: {
        relationshipId_date: {
          relationshipId,
          date: yesterdayStr,
        },
      },
      select: { nextDayHook: true },
    });

    return log;
  } catch (error) {
    logger.warn('[getYesterdaySessionLog] Failed:', error);
    return null;
  }
}
