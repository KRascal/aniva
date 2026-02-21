import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { LUFFY_MILESTONES } from '@/lib/milestones';
import { auth } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ characterId: string }> }
) {
  // 認証チェック（IDOR修正: userIdはセッションから取得）
  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { characterId } = await params;

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
