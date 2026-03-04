import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const CRON_SECRET = process.env.CRON_SECRET;

/**
 * キャラクターの感情状態を自動更新するcron
 * - 長時間会話がないユーザーへの感情を「寂しい」「心配」に変化
 * - 最近活発なユーザーへの感情を「嬉しい」「ワクワク」に
 * - 感情は徐々に中立に戻る（感情の自然減衰）
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
    // キャラごとのグローバル日次感情を生成
    // ============================================================
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activeCharacters = await prisma.character.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
    });

    let dailyStatesCreated = 0;
    const dailyStateUpdates: Array<{ charName: string; emotion: string; bonusXpMultiplier: number }> = [];

    for (const character of activeCharacters) {
      // 今日のCharacterDailyStateが既に存在するかチェック
      const existing = await prisma.characterDailyState.findUnique({
        where: { characterId_date: { characterId: character.id, date: today } },
      });

      if (!existing) {
        const { emotion, context, bonusXpMultiplier } = generateDailyEmotion(now);
        await prisma.characterDailyState.create({
          data: {
            characterId: character.id,
            date: today,
            emotion,
            context,
            bonusXpMultiplier,
          },
        });
        dailyStatesCreated++;
        dailyStateUpdates.push({ charName: character.name, emotion, bonusXpMultiplier });
      }
    }

    return NextResponse.json({
      success: true,
      checked: relationships.length,
      updated,
      updates: updates.slice(0, 20), // 最大20件まで返す
      dailyStatesCreated,
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
