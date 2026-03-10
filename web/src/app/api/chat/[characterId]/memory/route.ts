import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ characterId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as { id?: string }).id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { characterId } = await params;

    const character = await prisma.character.findUnique({
      where: { id: characterId },
      select: { name: true },
    });

    // SemanticMemory uses raw query since Prisma doesn't support vector type well
    const memories = await prisma.$queryRaw<Array<{
      id: string;
      content: string;
      summary: string | null;
      category: string;
      importance: number;
      emotionalValence: number;
      createdAt: Date;
    }>>`
      SELECT id, content, summary, category, importance, "emotionalValence", "createdAt"
      FROM "SemanticMemory"
      WHERE "userId" = ${userId} AND "characterId" = ${characterId}
      ORDER BY importance DESC, "createdAt" DESC
      LIMIT 50
    `;

    return NextResponse.json({
      memories: memories.map((m) => ({
        id: m.id,
        content: m.content,
        summary: m.summary,
        category: m.category,
        importance: Number(m.importance),
        emotionalValence: Number(m.emotionalValence),
        createdAt: m.createdAt instanceof Date ? m.createdAt.toISOString() : m.createdAt,
      })),
      characterName: character?.name ?? '',
    });
  } catch (error) {
    console.error('[memory API] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
