import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/api-auth';
import { getDeliveries } from '@/lib/chat-delivery';

/**
 * GET /api/chat/deliveries?conversationId=xxx[&unreadOnly=true]
 * 指定会話の配信一覧を返す。
 */
export async function GET(req: NextRequest) {
  const userId = await getAuthUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const conversationId = searchParams.get('conversationId');
  if (!conversationId) {
    return NextResponse.json({ error: 'conversationId is required' }, { status: 400 });
  }
  const unreadOnly = searchParams.get('unreadOnly') === 'true';

  try {
    const deliveries = await getDeliveries({ conversationId, unreadOnly });
    return NextResponse.json({ deliveries });
  } catch (err) {
    console.error('[chat/deliveries] GET error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
