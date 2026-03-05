/**
 * POST /api/proactive-messages/[id]/read
 * メッセージを既読にする
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const message = await prisma.characterProactiveMessage.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!message) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (message.isRead) {
      return NextResponse.json({ ok: true, alreadyRead: true });
    }

    const updated = await prisma.characterProactiveMessage.update({
      where: { id },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true, message: updated });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
