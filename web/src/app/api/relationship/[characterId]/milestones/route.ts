import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { LUFFY_MILESTONES } from '@/lib/milestones';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ characterId: string }> }
) {
  const { characterId } = await params;
  const url = new URL(req.url);
  const userId = url.searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'userId required' }, { status: 400 });
  }

  const relationship = await prisma.relationship.findUnique({
    where: { userId_characterId: { userId, characterId } },
  });

  const currentLevel = relationship?.level ?? 1;

  return NextResponse.json({
    milestones: LUFFY_MILESTONES.map((m) => ({
      ...m,
      achieved: currentLevel >= m.level,
    })),
    currentLevel,
  });
}
