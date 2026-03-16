// ============================================================
// SoulManager — SOUL.md 自己更新機能
// 週次でDailySessionLogを解析し、SOUL.mdの「## 最近の発見」を更新
// エラー時はスキップ（既存を壊さない）
// ============================================================

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { prisma } from '../prisma';
import { logger } from '../logger';

const SECTION_HEADER = '## 最近の発見';

/**
 * xAI grok-3-mini でセッションログから洞察を抽出
 */
async function extractInsightsWithLLM(
  characterName: string,
  sessionSummaries: string[],
): Promise<string | null> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) return null;

  const prompt = `あなたは「${characterName}」というキャラクターです。
以下は直近1週間のユーザーとの会話サマリーです。

${sessionSummaries.map((s, i) => `[${i + 1}] ${s}`).join('\n')}

これらの会話から、あなた（${characterName}）として気づいたことを3〜5点、箇条書きで書いてください。
- このユーザーの特徴や変化
- 有効だったアプローチ
- 次の会話で試したいこと
キャラクターとして一人称で、簡潔に書いてください。`;

  try {
    const res = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'grok-3-mini',
        messages: [
          {
            role: 'system',
            content: `あなたは${characterName}です。ユーザーとの会話から学んだことを簡潔に整理してください。`,
          },
          { role: 'user', content: prompt },
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!res.ok) {
      logger.warn(`[SoulManager] xAI API error: ${res.status}`);
      return null;
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? null;
  } catch (e) {
    logger.warn('[SoulManager] xAI call failed:', e);
    return null;
  }
}

/**
 * SOUL.mdの「## 最近の発見」セクションを更新する
 */
function updateSoulMdSection(soulPath: string, insights: string): void {
  const content = readFileSync(soulPath, 'utf-8');
  const now = new Date().toISOString().split('T')[0];

  const newSection = `${SECTION_HEADER}
_最終更新: ${now}_

${insights}`;

  if (content.includes(SECTION_HEADER)) {
    // 既存セクションを置換
    const sectionStart = content.indexOf(SECTION_HEADER);
    // 次のH2セクションを探す
    const nextSection = content.indexOf('\n## ', sectionStart + SECTION_HEADER.length);
    const before = content.substring(0, sectionStart);
    const after = nextSection !== -1 ? content.substring(nextSection) : '';
    writeFileSync(soulPath, `${before}${newSection}\n${after}`, 'utf-8');
  } else {
    // セクションを末尾に追加
    writeFileSync(soulPath, `${content}\n\n${newSection}\n`, 'utf-8');
  }
}

/**
 * 指定キャラクターのSOUL.mdを直近1週間のセッションログから更新する
 * エラー時はスキップ（既存を壊さない）
 */
export async function updateSoulInsights(
  characterId: string,
  slug: string,
): Promise<{ updated: boolean; reason?: string }> {
  try {
    // SOUL.mdのパスを解決
    const soulPath = join(process.cwd(), 'characters', slug, 'SOUL.md');
    if (!existsSync(soulPath)) {
      return { updated: false, reason: `SOUL.md not found for ${slug}` };
    }

    // キャラクター名を取得
    const character = await prisma.character.findUnique({
      where: { id: characterId },
      select: { name: true },
    });
    if (!character) {
      return { updated: false, reason: `Character not found: ${characterId}` };
    }

    // 直近1週間のDailySessionLogを取得
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const weekAgoStr = oneWeekAgo.toISOString().split('T')[0]; // "2026-03-09"

    const logs = await prisma.dailySessionLog.findMany({
      where: {
        relationship: { characterId },
        date: { gte: weekAgoStr },
      },
      orderBy: { date: 'desc' },
      take: 30,
      select: {
        date: true,
        summary: true,
        emotionalHighlight: true,
      },
    });

    if (logs.length === 0) {
      return { updated: false, reason: 'No session logs in past week' };
    }

    const summaries = logs.map(l =>
      `${l.date}: ${l.summary}${l.emotionalHighlight ? ` [感情: ${l.emotionalHighlight}]` : ''}`
    );

    // LLMで洞察を抽出
    const insights = await extractInsightsWithLLM(character.name, summaries);
    if (!insights) {
      return { updated: false, reason: 'LLM extraction failed' };
    }

    // SOUL.mdを更新
    updateSoulMdSection(soulPath, insights);

    logger.info(`[SoulManager] Updated SOUL.md for ${slug} with ${logs.length} session logs`);
    return { updated: true };
  } catch (e) {
    // エラーは全てスキップ（既存を壊さない）
    logger.warn(`[SoulManager] updateSoulInsights failed for ${slug}:`, e);
    return { updated: false, reason: String(e) };
  }
}

/**
 * 全キャラクターのSOUL.mdを一括更新（週次cron用）
 */
export async function updateAllSoulInsights(): Promise<{
  total: number;
  updated: number;
  skipped: number;
}> {
  let updated = 0;
  let skipped = 0;

  try {
    const characters = await prisma.character.findMany({
      select: { id: true, slug: true },
    });

    for (const char of characters) {
      const result = await updateSoulInsights(char.id, char.slug);
      if (result.updated) {
        updated++;
      } else {
        skipped++;
        if (result.reason) {
          logger.debug(`[SoulManager] Skipped ${char.slug}: ${result.reason}`);
        }
      }

      // API rate limit対策: 200ms待機
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  } catch (e) {
    logger.error('[SoulManager] updateAllSoulInsights failed:', e);
  }

  return { total: updated + skipped, updated, skipped };
}
