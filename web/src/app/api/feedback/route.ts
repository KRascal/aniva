import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/feedback — ユーザーからの違和感報告
 * 
 * body: {
 *   characterId: string,
 *   messageId?: string,
 *   type: 'out_of_character' | 'wrong_knowledge' | 'wrong_voice' | 'offensive' | 'other',
 *   userComment?: string,
 *   aiResponse: string,
 *   userMessage?: string,
 * }
 */
export async function POST(req: NextRequest) {
  try {
    // セッションからユーザー取得
    const { auth } = await import('@/auth');
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { characterId, messageId, type, userComment, aiResponse, userMessage } = body;

    if (!characterId || !aiResponse) {
      return NextResponse.json({ error: 'characterId and aiResponse required' }, { status: 400 });
    }

    const validTypes = ['out_of_character', 'wrong_knowledge', 'wrong_voice', 'offensive', 'other'];
    const feedbackType = validTypes.includes(type) ? type : 'other';

    const id = crypto.randomUUID();
    await prisma.$executeRaw`
      INSERT INTO "CharacterFeedback" (id, "userId", "characterId", "messageId", type, "userComment", "aiResponse", "userMessage", status, "createdAt")
      VALUES (${id}, ${session.user.id}, ${characterId}, ${messageId || null}, ${feedbackType}, ${userComment || null}, ${aiResponse}, ${userMessage || null}, 'pending', NOW())
    `;

    return NextResponse.json({ id, ok: true }, { status: 201 });
  } catch (e) {
    console.error('[Feedback API] Error:', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
