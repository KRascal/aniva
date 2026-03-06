/**
 * POST /api/chat/farewell
 * チャット離脱イベント → farewell メッセージを返す
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateFarewell } from '@/lib/farewell-system';
import { getStreak } from '@/lib/streak-system';

type TimeSlot = 'morning' | 'afternoon' | 'evening' | 'night' | 'latenight';
type Mood = 'high' | 'normal' | 'low' | 'melancholy';

function getTimeSlot(): TimeSlot {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  if (hour >= 21 && hour < 24) return 'night';
  return 'latenight';
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    const userId = (session?.user as { id?: string })?.id;
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { relationshipId } = body as { relationshipId: string };
    if (!relationshipId) {
      return NextResponse.json({ error: 'relationshipId required' }, { status: 400 });
    }

    const relationship = await prisma.relationship.findUnique({
      where: { id: relationshipId },
      include: { character: { select: { slug: true } } },
    });
    if (!relationship) {
      return NextResponse.json({ error: 'Relationship not found' }, { status: 404 });
    }

    // 最後のメッセージから5分以内かチェック
    const conversation = await prisma.conversation.findFirst({
      where: { relationshipId },
      orderBy: { updatedAt: 'desc' },
    });

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const lastActivity = conversation?.updatedAt ?? relationship.lastMessageAt;
    const shouldSend = lastActivity ? lastActivity >= fiveMinutesAgo : false;

    if (!shouldSend) {
      return NextResponse.json({ message: '', shouldSend: false });
    }

    // 同じ会話で直近1時間以内にfarewell送信済みならスキップ
    if (conversation) {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const recentFarewell = await prisma.message.findFirst({
        where: {
          conversationId: conversation.id,
          role: 'CHARACTER',
          metadata: { path: ['type'], equals: 'farewell' },
          createdAt: { gte: oneHourAgo },
        },
      });
      if (recentFarewell) {
        return NextResponse.json({ message: '', shouldSend: false });
      }
    }

    const streak = await getStreak(relationshipId);
    const characterSlug = relationship.character?.slug ?? 'luffy';
    const mood: Mood = relationship.level >= 5 ? 'high' : relationship.level >= 3 ? 'normal' : 'low';

    const message = generateFarewell({
      characterSlug,
      timeSlot: getTimeSlot(),
      mood,
      streakDays: streak.streakDays,
      level: relationship.level,
    });

    // DB保存（CHARACTER発言として記録、次回ロード時にも表示される）
    if (conversation) {
      try {
        await prisma.message.create({
          data: {
            conversationId: conversation.id,
            role: 'CHARACTER',
            content: message,
            metadata: { type: 'farewell', timeSlot: getTimeSlot() },
          },
        });
      } catch (dbErr) {
        console.warn('[chat/farewell] DB save failed (non-critical):', dbErr);
      }
    }

    return NextResponse.json({ message, shouldSend: true });
  } catch (error) {
    console.error('[chat/farewell] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
