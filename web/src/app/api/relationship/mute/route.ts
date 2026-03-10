/**
 * POST /api/relationship/mute
 * キャラからのメッセージ通知を一時的にオフ / オン
 */
import { NextRequest, NextResponse } from 'next/server';
import { getVerifiedUserId } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const userId = await getVerifiedUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { characterId, mute, hours } = await req.json() as {
    characterId: string;
    mute: boolean;
    hours?: number; // nullなら無期限、数値ならX時間
  };
  if (!characterId) return NextResponse.json({ error: 'characterId required' }, { status: 400 });

  const rel = await prisma.relationship.findFirst({ where: { userId, characterId } });
  if (!rel) return NextResponse.json({ error: 'Relationship not found' }, { status: 404 });

  const mutedUntil = mute && hours
    ? new Date(Date.now() + hours * 60 * 60 * 1000)
    : null;

  await prisma.relationship.update({
    where: { id: rel.id },
    data: {
      isMuted: mute,
      mutedUntil: mute ? mutedUntil : null,
    },
  });

  return NextResponse.json({ success: true, isMuted: mute, mutedUntil });
}
