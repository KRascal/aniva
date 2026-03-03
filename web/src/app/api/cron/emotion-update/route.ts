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

    return NextResponse.json({
      success: true,
      checked: relationships.length,
      updated,
      updates: updates.slice(0, 20), // 最大20件まで返す
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error('Emotion update cron error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
