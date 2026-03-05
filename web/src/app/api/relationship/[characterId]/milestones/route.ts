import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { LUFFY_MILESTONES } from '@/lib/milestones';
import { auth } from '@/lib/auth';
import { resolveCharacterId } from '@/lib/resolve-character';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ characterId: string }> }
) {
  // 認証チェック（IDOR修正: userIdはセッションから取得）
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { characterId: rawCharacterId } = await params;
  const characterId = await resolveCharacterId(rawCharacterId) ?? rawCharacterId;

  const relationship = await prisma.relationship.findUnique({
    where: { userId_characterId_locale: { userId, characterId, locale: 'ja' } },
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
