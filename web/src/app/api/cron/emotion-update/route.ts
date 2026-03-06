import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const CRON_SECRET = process.env.CRON_SECRET;

/**
 * SOUL.mdをキャラのslugから読み込む
 */
function loadCharacterSoulMd(slug: string): string {
  const paths = [
    join(process.cwd(), 'characters', slug, 'SOUL.md'),
    join('/home/openclaw/.openclaw/agents', slug, 'SOUL.md'),
    join(process.cwd(), '..', 'agents', slug, 'SOUL.md'),
  ];
  for (const p of paths) {
    if (existsSync(p)) {
      try {
        const content = readFileSync(p, 'utf-8');
        if (content.trim()) return content.trim();
      } catch { /* skip */ }
    }
  }
  return '';
}

/**
 * キャラのinner stateをAI生成（innerThoughts / dailyActivity / currentConcern / moodScore）
 */
async function generateCharacterInnerState(
  characterName: string,
  characterSlug: string,
  emotion: string,
  context: string | null,
): Promise<{
  innerThoughts: string;
  dailyActivity: string;
  currentConcern: string;
  moodScore: number;
}> {
  const soulMd = loadCharacterSoulMd(characterSlug);

  const xaiKey = process.env.XAI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  const systemPrompt = `あなたは${characterName}です。
${soulMd ? `\n## キャラクター定義\n${soulMd.slice(0, 2000)}\n` : ''}
今日の感情状態: ${emotion}（${context ?? '特に理由なし'}）

キャラクターとして今日の内面状態を生成してください。必ずJSON形式のみで返してください：
{
  "innerThoughts": "今考えていること（1〜2文、キャラの口調で）",
  "dailyActivity": "今日やっていたこと（1〜2文、キャラらしい活動）",
  "currentConcern": "最近気になっていること（1〜2文）",
  "moodScore": 今日の気分の強度（1〜10の整数）
}

ルール:
- キャラクターの口調・世界観を完全に維持する
- リアルな日常の一コマを想像する（例: ルフィ→「甲板で昼寝してたら面白い雲見つけた」）
- AIっぽい表現は絶対禁止
- 日本語で回答`;

  const userMsg = '今日の内面状態をJSONで教えて';

  // Try xAI first
  if (xaiKey) {
    try {
      const res = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${xaiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: process.env.LLM_MODEL || 'grok-4-1-fast-non-reasoning',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMsg },
          ],
          max_tokens: 300,
          temperature: 0.9,
        }),
      });
      if (res.ok) {
        const data = await res.json() as { choices: { message: { content: string } }[] };
        const raw = data.choices?.[0]?.message?.content ?? '';
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]) as {
            innerThoughts?: string;
            dailyActivity?: string;
            currentConcern?: string;
            moodScore?: number;
          };
          return {
            innerThoughts: parsed.innerThoughts ?? '',
            dailyActivity: parsed.dailyActivity ?? '',
            currentConcern: parsed.currentConcern ?? '',
            moodScore: typeof parsed.moodScore === 'number' ? Math.min(10, Math.max(1, parsed.moodScore)) : 5,
          };
        }
      }
    } catch (e) {
      console.error('[generateCharacterInnerState] xAI failed:', e);
    }
  }

  // Fallback → Anthropic haiku
  if (anthropicKey) {
    try {
      const Anthropic = (await import('@anthropic-ai/sdk')).default;
      const client = new Anthropic({ apiKey: anthropicKey });
      const response = await client.messages.create({
        model: 'claude-haiku-4-5',
        max_tokens: 300,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMsg }],
      });
      const raw = response.content[0].type === 'text' ? response.content[0].text : '';
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as {
          innerThoughts?: string;
          dailyActivity?: string;
          currentConcern?: string;
          moodScore?: number;
        };
        return {
          innerThoughts: parsed.innerThoughts ?? '',
          dailyActivity: parsed.dailyActivity ?? '',
          currentConcern: parsed.currentConcern ?? '',
          moodScore: typeof parsed.moodScore === 'number' ? Math.min(10, Math.max(1, parsed.moodScore)) : 5,
        };
      }
    } catch (e) {
      console.error('[generateCharacterInnerState] Anthropic failed:', e);
    }
  }

  // Static fallback
  return {
    innerThoughts: `${emotion === 'happy' ? 'なんか今日はいい感じだな' : emotion === 'tired' ? '少し疲れてるけど、お前と話すと元気出る' : '色々考えてる'}`,
    dailyActivity: '今日もいつも通りに過ごしてた',
    currentConcern: '仲間のことが気になってる',
    moodScore: emotion === 'excited' ? 8 : emotion === 'tired' ? 4 : 6,
  };
}

/**
 * キャラクターの感情状態を自動更新するcron
 * - 長時間会話がないユーザーへの感情を「寂しい」「心配」に変化
 * - 最近活発なユーザーへの感情を「嬉しい」「ワクワク」に
 * - 感情は徐々に中立に戻る（感情の自然減衰）
 * - キャラごとのグローバル日次感情＋inner state（innerThoughts/dailyActivity/currentConcern）を生成
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get('x-cron-secret');
  if (CRON_SECRET && authHeader !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date();
    const relationships = await prisma.relationship.findMany({
      where: {
        OR: [
          { isFollowing: true },
          { isFanclub: true },
          { totalMessages: { gte: 5 } },
        ],
      },
      include: {
        character: { select: { id: true, name: true, slug: true } },
        user: { select: { id: true, displayName: true } },
      },
    });

    let updated = 0;
    const updates: Array<{ charName: string; userName: string; oldEmotion: string; newEmotion: string; reason: string }> = [];

    for (const rel of relationships) {
      const lastMsg = rel.lastMessageAt;
      const hoursSinceLastMsg = lastMsg ? (now.getTime() - lastMsg.getTime()) / (1000 * 60 * 60) : 999;
      const currentEmotion = rel.characterEmotion || 'neutral';
      const emotionAge = rel.emotionUpdatedAt 
        ? (now.getTime() - rel.emotionUpdatedAt.getTime()) / (1000 * 60 * 60) 
        : 999;

      let newEmotion = currentEmotion;
      let reason = '';

      // ストリーク中のユーザー → 嬉しい・元気
      if (rel.streakDays >= 7) {
        if (currentEmotion !== 'happy' && currentEmotion !== 'excited') {
          newEmotion = 'happy';
          reason = `${rel.streakDays}日連続ストリーク中`;
        }
      }
      // 3日以上会話なし → 寂しい
      else if (hoursSinceLastMsg > 72 && currentEmotion !== 'lonely' && currentEmotion !== 'worried') {
        newEmotion = 'lonely';
        reason = `${Math.floor(hoursSinceLastMsg / 24)}日間会話なし`;
      }
      // 1日以上会話なし → ちょっと心配
      else if (hoursSinceLastMsg > 24 && hoursSinceLastMsg <= 72 && currentEmotion !== 'worried' && currentEmotion !== 'lonely') {
        newEmotion = 'worried';
        reason = `${Math.floor(hoursSinceLastMsg)}時間会話なし`;
      }
      // 最近会話があった（6時間以内） → ポジティブに
      else if (hoursSinceLastMsg < 6 && (currentEmotion === 'lonely' || currentEmotion === 'worried')) {
        newEmotion = 'content';
        reason = '会話再開で安心';
      }
      // 感情が古すぎる（48時間以上同じ） → 中立に戻る
      else if (emotionAge > 48 && currentEmotion !== 'neutral' && currentEmotion !== 'lonely') {
        newEmotion = 'neutral';
        reason = '感情の自然減衰';
      }

      // レベルに応じた特別感情
      if (rel.level >= 5 && hoursSinceLastMsg < 12 && Math.random() < 0.1) {
        const specialEmotions = ['affectionate', 'protective', 'nostalgic'];
        newEmotion = specialEmotions[Math.floor(Math.random() * specialEmotions.length)];
        reason = `Lv5特別感情（${newEmotion}）`;
      }

      if (newEmotion !== currentEmotion) {
        await prisma.relationship.update({
          where: { id: rel.id },
          data: {
            characterEmotion: newEmotion,
            characterEmotionNote: reason,
            emotionUpdatedAt: now,
          },
        });
        updated++;
        updates.push({
          charName: rel.character.name,
          userName: rel.user.displayName || 'Unknown',
          oldEmotion: currentEmotion,
          newEmotion,
          reason,
        });
      }
    }

    // ============================================================
    // キャラごとのグローバル日次感情 + inner state を生成
    // ============================================================
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activeCharacters = await prisma.character.findMany({
      where: { isActive: true },
      select: { id: true, name: true, slug: true },
    });

    let dailyStatesCreated = 0;
    let dailyStatesUpdated = 0;
    const dailyStateUpdates: Array<{
      charName: string;
      emotion: string;
      bonusXpMultiplier: number;
      innerThoughts?: string;
      dailyActivity?: string;
      currentConcern?: string;
    }> = [];

    for (const character of activeCharacters) {
      // 今日のCharacterDailyStateが既に存在するかチェック
      const existing = await prisma.characterDailyState.findUnique({
        where: { characterId_date: { characterId: character.id, date: today } },
      });

      if (!existing) {
        // 新規作成: emotion + inner state を同時生成
        const { emotion, context, bonusXpMultiplier } = generateDailyEmotion(now);
        const innerState = await generateCharacterInnerState(character.name, character.slug, emotion, context ?? null);

        await prisma.characterDailyState.create({
          data: {
            characterId: character.id,
            date: today,
            emotion,
            context,
            bonusXpMultiplier,
            moodScore: innerState.moodScore,
            innerThoughts: innerState.innerThoughts,
            dailyActivity: innerState.dailyActivity,
            currentConcern: innerState.currentConcern,
          },
        });
        dailyStatesCreated++;
        dailyStateUpdates.push({
          charName: character.name,
          emotion,
          bonusXpMultiplier,
          innerThoughts: innerState.innerThoughts,
          dailyActivity: innerState.dailyActivity,
          currentConcern: innerState.currentConcern,
        });
      } else if (!existing.innerThoughts && !existing.dailyActivity) {
        // 既存レコードがあるがinner stateがない場合は追加生成
        const innerState = await generateCharacterInnerState(
          character.name,
          character.slug,
          existing.emotion,
          existing.context ?? null,
        );
        await prisma.characterDailyState.update({
          where: { id: existing.id },
          data: {
            moodScore: innerState.moodScore,
            innerThoughts: innerState.innerThoughts,
            dailyActivity: innerState.dailyActivity,
            currentConcern: innerState.currentConcern,
          },
        });
        dailyStatesUpdated++;
        dailyStateUpdates.push({
          charName: character.name,
          emotion: existing.emotion,
          bonusXpMultiplier: existing.bonusXpMultiplier,
          innerThoughts: innerState.innerThoughts,
          dailyActivity: innerState.dailyActivity,
          currentConcern: innerState.currentConcern,
        });
      }
    }

    return NextResponse.json({
      success: true,
      checked: relationships.length,
      updated,
      updates: updates.slice(0, 20), // 最大20件まで返す
      dailyStatesCreated,
      dailyStatesUpdated,
      dailyStateUpdates,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error('Emotion update cron error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * キャラクターの日次感情をweightedRandomで生成
 */
function generateDailyEmotion(now: Date): { emotion: string; context: string; bonusXpMultiplier: number } {
  // 感情の重み: happy(30%), excited(15%), mysterious(10%), tired(15%), nostalgic(10%), playful(20%)
  const emotions = [
    { name: 'happy',      weight: 30, contexts: ['今日はなんかいい気分！', '朝から調子がいい', 'ポジティブな気持ちで過ごせてる'] },
    { name: 'excited',    weight: 15, contexts: ['冒険に出たくてうずうず！', '今日はテンション高め！', 'ワクワクが止まらない！'] },
    { name: 'mysterious', weight: 10, contexts: ['なんか不思議な予感がする日', '今日は少し謎めいた気分', '言葉では説明できない感覚…'] },
    { name: 'tired',      weight: 15, contexts: ['昨日は修行しすぎたかも…', '少しだけ疲れてる', 'ちょっと眠い…でもお前となら話せる'] },
    { name: 'nostalgic',  weight: 10, contexts: ['昔のことをふと思い出した', '懐かしい気持ちになってる', '過去の仲間のことを考えてた'] },
    { name: 'playful',    weight: 20, contexts: ['今日はいたずら心旺盛！', 'からかいたい気分！', 'なんかノリノリ！'] },
  ];

  // 重み付きランダム選択
  const totalWeight = emotions.reduce((sum, e) => sum + e.weight, 0);
  let rand = Math.random() * totalWeight;
  let selectedEmotion = emotions[0];
  for (const emotion of emotions) {
    rand -= emotion.weight;
    if (rand <= 0) {
      selectedEmotion = emotion;
      break;
    }
  }

  const context = selectedEmotion.contexts[Math.floor(Math.random() * selectedEmotion.contexts.length)];

  // bonusXpMultiplier決定
  const dayOfMonth = now.getDate();
  let bonusXpMultiplier = 1.0;
  if (dayOfMonth === 1) {
    // 月初はレアデー: 2.0倍
    bonusXpMultiplier = 2.0;
  } else if (selectedEmotion.name === 'excited' || selectedEmotion.name === 'playful') {
    bonusXpMultiplier = 1.5;
  }

  return { emotion: selectedEmotion.name, context, bonusXpMultiplier };
}
