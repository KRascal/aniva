/**
 * POST /api/relationship/pin
 * チャット一覧でキャラをピン留め / 解除
 */
import { NextRequest, NextResponse } from 'next/server';
import { getVerifiedUserId } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const userId = await getVerifiedUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { characterId, pin } = await req.json() as { characterId: string; pin: boolean };
  if (!characterId) return NextResponse.json({ error: 'characterId required' }, { status: 400 });

  const rel = await prisma.relationship.findFirst({ where: { userId, characterId } });
  if (!rel) return NextResponse.json({ error: 'Relationship not found' }, { status: 404 });

  await prisma.relationship.update({
    where: { id: rel.id },
    data: {
      isPinned: pin,
      pinnedAt: pin ? new Date() : null,
    },
  });

  return NextResponse.json({ success: true, isPinned: pin });
}
