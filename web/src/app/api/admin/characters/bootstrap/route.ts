/**
 * POST /api/admin/characters/bootstrap
 * キャラ追加後に全コンテンツを一括生成
 * body: { characterId: string }
 * 
 * 生成するもの:
 * 1. ストーリー6章
 * 2. Moments 10件
 * 3. SecretContent 5件
 * 4. GachaCard 5枚 (N/R/SR/SSR/UR)
 * 5. CharacterDiary 1件
 * 6. ProactiveMessage 3件
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { prisma } from '@/lib/prisma';

const XAI_URL = 'https://api.x.ai/v1/chat/completions';

async function llmGenerate(prompt: string, maxTokens = 500): Promise<string> {
  const xaiKey = process.env.XAI_API_KEY;
  if (!xaiKey) throw new Error('XAI_API_KEY not set');

  const res = await fetch(XAI_URL, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${xaiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: process.env.LLM_MODEL || 'grok-3-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: maxTokens,
      temperature: 0.85,
    }),
  });
  if (!res.ok) throw new Error(`LLM error: ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || '';
}

function parseJSON(text: string): Record<string, unknown> | null {
  try {
    const match = text.match(/\{[\s\S]+\}/);
    return match ? JSON.parse(match[0]) : null;
  } catch { return null; }
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { characterId } = await req.json();
  if (!characterId) return NextResponse.json({ error: 'characterId required' }, { status: 400 });

  const character = await prisma.character.findUnique({ where: { id: characterId } });
  if (!character) return NextResponse.json({ error: 'Character not found' }, { status: 404 });

  const results: Record<string, { count: number; error?: string }> = {};

  // 1. ストーリー6章
  try {
    const existingCount = await prisma.storyChapter.count({ where: { characterId } });
    let created = 0;
    for (let ch = existingCount + 1; ch <= 6; ch++) {
      const isFC = ch >= 5;
      const prompt = `キャラクター「${character.name}」(${character.franchise})の第${ch}章を作成。
設定: ${character.systemPrompt.slice(0, 800)}
FC限定: ${isFC}
JSON形式: {"title":"10文字以内","synopsis":"100-200文字","triggerPrompt":"100-200文字のキャラ指示"}`;

      const text = await llmGenerate(prompt, 400);
      const parsed = parseJSON(text);
      if (parsed) {
        await prisma.storyChapter.create({
          data: {
            id: `boot-${characterId}-ch${ch}-${Date.now()}`,
            characterId,
            chapterNumber: ch,
            title: String(parsed.title || `第${ch}章`),
            synopsis: String(parsed.synopsis || ''),
            triggerPrompt: String(parsed.triggerPrompt || ''),
            unlockLevel: ch <= 2 ? 1 : ch <= 4 ? 3 : 5,
            isFcOnly: isFC,
            bgmType: ch <= 2 ? 'adventure' : ch <= 4 ? 'emotional' : 'dramatic',
            coinReward: ch >= 5 ? 20 : 10,
            isActive: true,
          },
        });
        created++;
      }
    }
    results.stories = { count: created };
  } catch (err) {
    results.stories = { count: 0, error: err instanceof Error ? err.message : 'unknown' };
  }

  // 2. Moments 10件
  try {
    const existingCount = await prisma.moment.count({ where: { characterId } });
    let created = 0;
    const categories = ['つぶやき', '日常', '想い', 'ファンへ', '裏話', '決意', '回想', '質問', '特別', '朝のひとこと'];
    for (let i = existingCount; i < Math.max(existingCount, 10); i++) {
      const cat = categories[i % categories.length];
      const prompt = `「${character.name}」がSNSに投稿する「${cat}」をキャラの口調で1つ書け。50-150文字。改行なし。`;
      const text = await llmGenerate(prompt, 200);
      const content = text.replace(/^["「]|["」]$/g, '').slice(0, 200);
      if (content.length > 10) {
        await prisma.moment.create({
          data: {
            id: `boot-m-${characterId}-${Date.now()}-${i}`,
            characterId,
            content,
            mediaType: 'TEXT',
            isActive: true,
          },
        });
        created++;
      }
    }
    results.moments = { count: created };
  } catch (err) {
    results.moments = { count: 0, error: err instanceof Error ? err.message : 'unknown' };
  }

  // 3. SecretContent 5件
  try {
    const existingCount = await prisma.secretContent.count({ where: { characterId } });
    let created = 0;
    if (existingCount < 5) {
      const types = ['conversation_topic', 'conversation_topic', 'backstory', 'backstory', 'special_message'];
      for (let i = existingCount; i < 5; i++) {
        const type = types[i];
        const prompt = `「${character.name}」のFC限定「${type}」を1つ生成。50-100文字。キャラの口調で。`;
        const text = await llmGenerate(prompt, 150);
        await prisma.secretContent.create({
          data: {
            id: `boot-sc-${characterId}-${Date.now()}-${i}`,
            characterId,
            type,
            content: text.slice(0, 200),
            isActive: true,
          },
        });
        created++;
      }
    }
    results.secretContent = { count: created };
  } catch (err) {
    results.secretContent = { count: 0, error: err instanceof Error ? err.message : 'unknown' };
  }

  // 4. GachaCard 5枚
  try {
    const existingCount = await prisma.gachaCard.count({ where: { characterId } });
    let created = 0;
    if (existingCount < 5) {
      const rarities = ['N', 'R', 'SR', 'SSR', 'UR'] as const;
      const names = ['普通の一日', '輝く日常', '特別な瞬間', '伝説の一幕', '至上の刻'];
      const frames = ['standard', 'standard', 'silver', 'gold', 'holographic'];
      for (let i = existingCount; i < 5; i++) {
        await prisma.gachaCard.create({
          data: {
            id: `boot-gc-${characterId}-${Date.now()}-${i}`,
            characterId,
            name: `${character.name} - ${names[i]}`,
            description: `${character.name}の${names[i]}を切り取ったカード。`,
            rarity: rarities[i],
            category: 'memory',
            effect: {},
            isActive: true,
            franchise: character.franchise,
            frameType: frames[i],
          },
        });
        created++;
      }
    }
    results.gachaCards = { count: created };
  } catch (err) {
    results.gachaCards = { count: 0, error: err instanceof Error ? err.message : 'unknown' };
  }

  // 5. CharacterDiary 1件
  try {
    const existingCount = await prisma.characterDiary.count({ where: { characterId } });
    if (existingCount === 0) {
      const prompt = `「${character.name}」の日記エントリを1つ書け。キャラの口調で、今日の出来事や気持ちを50-150文字で。`;
      const text = await llmGenerate(prompt, 200);
      await prisma.characterDiary.create({
        data: {
          characterId,
          mood: 'happy',
          content: text.slice(0, 300),
          date: new Date(),
        },
      });
      results.diary = { count: 1 };
    } else {
      results.diary = { count: 0 };
    }
  } catch (err) {
    results.diary = { count: 0, error: err instanceof Error ? err.message : 'unknown' };
  }

  // 6. ProactiveMessage 3件
  try {
    const existingCount = await prisma.characterProactiveMessage.count({ where: { characterId } });
    let created = 0;
    if (existingCount < 3) {
      const triggers = ['morning', 'evening', 'random'];
      for (let i = existingCount; i < 3; i++) {
        const trigger = triggers[i];
        const prompt = `「${character.name}」がユーザーに送る${trigger === 'morning' ? '朝の' : trigger === 'evening' ? '夕方の' : ''}プッシュ通知メッセージを1つ書け。キャラの口調で30-80文字。`;
        const text = await llmGenerate(prompt, 100);
        await prisma.characterProactiveMessage.create({
          data: {
            characterId,
            content: text.slice(0, 150),
            triggerType: trigger,
            isActive: true,
            priority: 5,
          },
        });
        created++;
      }
    }
    results.proactiveMessages = { count: created };
  } catch (err) {
    results.proactiveMessages = { count: 0, error: err instanceof Error ? err.message : 'unknown' };
  }

  return NextResponse.json({
    message: `Bootstrap complete for ${character.name}`,
    characterId,
    characterName: character.name,
    results,
  });
}
