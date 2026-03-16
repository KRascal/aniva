import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/api-auth';
import { markDeliveryRead } from '@/lib/chat-delivery';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/chat/deliveries/[id]/read
 * 配信IDで既読にする。
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getAuthUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  try {
    // 所有権確認
    const delivery = await prisma.chatDelivery.findUnique({ where: { id } });
    if (!delivery) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (delivery.userId !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    await markDeliveryRead(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[chat/deliveries/[id]/read] POST error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
