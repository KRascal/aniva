/**
 * POST /api/letters/[deliveryId]/read
 * 手紙を既読にする
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ deliveryId: string }> }
) {
  const session = await auth();
  const userId = (session?.user as { id?: string })?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { deliveryId } = await params;

  try {
    const delivery = await prisma.letterDelivery.findUnique({
      where: { id: deliveryId },
    });
    if (!delivery || delivery.userId !== userId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (!delivery.isRead) {
      await prisma.letterDelivery.update({
        where: { id: deliveryId },
        data: { isRead: true, readAt: new Date() },
      });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
