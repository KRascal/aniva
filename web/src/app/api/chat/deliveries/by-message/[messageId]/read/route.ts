import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/api-auth';
import { markDeliveryRead } from '@/lib/chat-delivery';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/chat/deliveries/by-message/[messageId]/read
 * MessageIdを使って対応するChatDeliveryを既読にする。
 * ChatDeliveryBubble からの呼び出し用。
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ messageId: string }> },
) {
  const userId = await getAuthUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { messageId } = await params;

  try {
    const delivery = await prisma.chatDelivery.findFirst({
      where: { messageId },
    });
    if (!delivery) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (delivery.userId !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    await markDeliveryRead(delivery.id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[chat/deliveries/by-message/read] POST error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
