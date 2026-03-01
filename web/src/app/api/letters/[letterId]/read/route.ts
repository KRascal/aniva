import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ letterId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { letterId } = await params;

  await prisma.letter.updateMany({
    where: { id: letterId, userId: session.user.id },
    data: { isRead: true },
  });

  return NextResponse.json({ ok: true });
}
