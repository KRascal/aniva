import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (id) {
    // User detail
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        relationships: {
          include: { character: { select: { id: true, name: true, avatarUrl: true } } },
        },
        subscriptions: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
    if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    type RelationshipWithCharacter = {
      characterId: string;
      isFollowing: boolean;
      isFanclub: boolean;
      totalMessages: number;
      character: { id: string; name: string; avatarUrl: string | null };
      [key: string]: unknown;
    };
    const following = (user.relationships as RelationshipWithCharacter[]).filter((r) => r.isFollowing).map((r) => ({
      characterId: r.characterId,
      name: r.character.name,
      avatarUrl: r.character.avatarUrl,
    }));
    const fanclub = (user.relationships as RelationshipWithCharacter[]).filter((r) => r.isFanclub).map((r) => ({
      characterId: r.characterId,
      name: r.character.name,
      avatarUrl: r.character.avatarUrl,
    }));
    const totalMessages = (user.relationships as RelationshipWithCharacter[]).reduce((s: number, r: RelationshipWithCharacter) => s + r.totalMessages, 0);

    return NextResponse.json({
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      plan: user.plan,
      createdAt: user.createdAt,
      following,
      fanclub,
      totalMessages,
    });
  }

  // List all users
  const page = parseInt(searchParams.get('page') || '1');
  const limit = 50;
  const skip = (page - 1) * limit;

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        displayName: true,
        plan: true,
        createdAt: true,
        sessions: {
          orderBy: { expires: 'desc' },
          take: 1,
          select: { expires: true },
        },
        _count: { select: { relationships: true } },
      },
    }),
    prisma.user.count(),
  ]);

  return NextResponse.json({
    users: users.map((u: { id: string; email: string | null; displayName: string | null; plan: string; createdAt: Date; sessions: { expires: Date }[]; _count: { relationships: number } }) => ({
      id: u.id,
      email: u.email,
      displayName: u.displayName,
      plan: u.plan,
      createdAt: u.createdAt,
      lastLogin: u.sessions[0]?.expires || null,
      relationshipCount: u._count.relationships,
    })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}
