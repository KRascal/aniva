import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ count: 0 });
  }

  try {
    const count = await prisma.letter.count({
      where: { userId: session.user.id, isRead: false },
    });
    return NextResponse.json({ count });
  } catch {
    // Letter table may not exist in production yet
    return NextResponse.json({ count: 0 });
  }
}
