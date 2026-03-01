import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let letters;
  try {
    letters = await prisma.letter.findMany({
      where: { userId: session.user.id },
      include: {
        character: { select: { name: true, avatarUrl: true, slug: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  } catch {
    // DB migration pending (Letter table may not exist in production yet)
    return NextResponse.json({ letters: [] });
  }

  return NextResponse.json({ letters });
}
