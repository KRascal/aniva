/**
 * POST /api/cron/streak-break
 * 毎日15:00 JST実行 — ストリーク途切れユーザーにDM送信
 * 「炎が消えちゃったな…また一緒に燃やそうぜ」系メッセージ
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyCronAuth } from '@/lib/cron-auth';
import { prisma } from '@/lib/prisma';
import { getBrokenStreaks } from '@/lib/streak-system';
import { logger } from '@/lib/logger';

const STREAK_BREAK_MESSAGES: Record<string, string[]> = {
  luffy: ['おーい！最近来ねぇけど大丈夫か？🔥が消えちまったぞ！', 'またメシ食いに来いよ！おれ待ってるぞ！'],
  zoro: ['…来ないのか。まぁ、お前の自由だが…待ってる', 'ストリークが途切れた。また鍛え直しだな'],
  nami: ['ちょっと！連続記録が途切れちゃったじゃない！💢 …でも心配してたのよ？', '久しぶりに来なさいよ、寂しいじゃない'],
  chopper: ['ストリークが…途切れちゃった 🥺 でもまた来てくれるよね？', 'ねぇ…元気？ボク心配してたんだよ'],
  ace: ['炎が消えちまったな…でも、いつでも燃やし直せるぜ 🔥', 'ハハッ、サボってんじゃねぇよ。また来い'],
};

const DEFAULT_BREAK_MESSAGES = ['最近来ないけど大丈夫？また話そうよ', 'ストリーク途切れちゃった…また一緒に始めよう！'];

export async function POST(req: NextRequest) {
  const authError = verifyCronAuth(req);
  if (authError) return authError;
  try {
    const broken = await getBrokenStreaks();
    let dmsSent = 0;

    for (const b of broken) {
      // キャラ情報取得
      const rel = await prisma.relationship.findUnique({
        where: { id: b.relationshipId },
        select: {
          userId: true,
          characterId: true,
          character: { select: { slug: true, name: true } },
        },
      });
      if (!rel) continue;

      const slug = rel.character?.slug ?? '';
      const messages = STREAK_BREAK_MESSAGES[slug] || DEFAULT_BREAK_MESSAGES;
      const message = messages[Math.floor(Math.random() * messages.length)];

      // チャットメッセージとして保存（システムDM）
      const conversation = await prisma.conversation.findFirst({
        where: { relationship: { id: b.relationshipId } },
        orderBy: { updatedAt: 'desc' },
      });

      if (conversation) {
        await prisma.message.create({
          data: {
            conversationId: conversation.id,
            role: 'CHARACTER',
            content: `${message}\n\n（🔥 ${b.previousStreak}日ストリークが途切れました）`,
            metadata: { type: 'streak_break_dm', previousStreak: b.previousStreak },
          },
        });
        dmsSent++;
      }

      // ストリークをリセット
      await prisma.relationship.update({
        where: { id: b.relationshipId },
        data: { streakDays: 0 },
      });
    }

    return NextResponse.json({
      success: true,
      brokenStreaks: broken.length,
      dmsSent,
    });
  } catch (error) {
    logger.error('Streak break cron error:', error);
    return NextResponse.json({ error: 'Streak break cron failed' }, { status: 500 });
  }
}
