import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';

// GET /api/admin/feedback?status=xxx&type=xxx
export async function GET(req: NextRequest) {
  const ctx = await requireRole('ip_admin');
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const type = searchParams.get('type');

  const where: Record<string, string> = {};
  if (status) where.status = status;
  if (type) where.type = type;

  const feedbacks = await prisma.characterFeedback.findMany({
    where,
    include: {
      character: {
        select: { name: true },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  return NextResponse.json({
    feedbacks: feedbacks.map(f => ({
      id: f.id,
      userId: f.userId,
      characterId: f.characterId,
      characterName: f.character.name,
      type: f.type,
      userComment: f.userComment,
      userMessage: f.userMessage,
      aiResponse: f.aiResponse,
      status: f.status,
      createdAt: f.createdAt.toISOString(),
    })),
  });
}
