/**
 * SoulManager — キャラクターが会話を通じて成長する仕組み
 * OpenClawのSOUL.md自己更新思想の移植
 * 
 * 週次で実行し、キャラクターのSOUL.mdに「最近の発見」セクションを追加・更新
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const INSIGHT_MODEL = 'grok-3-mini';

/**
 * キャラのSOUL.mdに「最近の発見」を追記
 */
export async function updateSoulInsights(
  characterId: string,
  slug: string,
): Promise<void> {
  try {
    const xaiKey = process.env.XAI_API_KEY;
    if (!xaiKey) return;

    // 直近7日のDailySessionLogを取得
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const dateStr = sevenDaysAgo.toISOString().slice(0, 10);

    const logs = await prisma.dailySessionLog.findMany({
      where: {
        relationship: { characterId },
        date: { gte: dateStr },
      },
      select: { summary: true, emotionalHighlight: true, date: true },
      orderBy: { date: 'desc' },
      take: 20,
    });

    if (logs.length === 0) return;

    const logsText = logs
      .map(l => `[${l.date}] ${l.summary}${l.emotionalHighlight ? ` (感情的瞬間: ${l.emotionalHighlight})` : ''}`)
      .join('\n');

    const prompt = `あなたはキャラクター「${slug}」の内省を代行します。
以下は直近1週間のユーザーとの会話サマリーです。

${logsText}

この1週間のやり取りから、キャラクターとして気づいたこと・学んだことを2-3個抽出してください。
フォーマット:
- YYYY-MM-DD: 気づき（1文で）

例:
- 2026-03-16: 悩みに寄り添う時、正論より「共感→沈黙→一言」の順番が効く
- 2026-03-15: ユーザーが夢を語る時、一緒に盛り上がると距離が縮まる`;

    const res = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${xaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: INSIGHT_MODEL,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 300,
        temperature: 0.7,
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) return;
    const data = await res.json();
    const insights = data.choices?.[0]?.message?.content?.trim();
    if (!insights) return;

    // SOUL.mdに追記
    const candidates = [
      join(process.cwd(), '..', 'characters', slug, 'SOUL.md'),
      join(process.cwd(), 'characters', slug, 'SOUL.md'),
    ];

    for (const soulPath of candidates) {
      if (existsSync(soulPath)) {
        let content = readFileSync(soulPath, 'utf-8');
        const marker = '## 最近の発見';
        if (content.includes(marker)) {
          // 既存セクションを更新（最新5件のみ保持）
          const idx = content.indexOf(marker);
          const before = content.slice(0, idx);
          content = `${before}${marker}\n<!-- auto-updated by SoulManager -->\n${insights}\n`;
        } else {
          content += `\n\n${marker}\n<!-- auto-updated by SoulManager -->\n${insights}\n`;
        }
        writeFileSync(soulPath, content, 'utf-8');
        logger.info(`[SoulManager] Updated SOUL.md for ${slug}`);
        break;
      }
    }
  } catch (error) {
    logger.error('[SoulManager] Error:', error);
    // エラー時はスキップ（既存を壊さない）
  }
}
