import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (id) {
    // User detail with coin balance, conversation count, relationship details
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        relationships: {
          include: {
            character: { select: { id: true, name: true, avatarUrl: true } },
            conversations: {
              orderBy: { createdAt: 'desc' },
              take: 3,
              select: { id: true, createdAt: true },
            },
          },
          orderBy: { lastMessageAt: 'desc' },
        },
        subscriptions: { orderBy: { createdAt: 'desc' }, take: 1 },
        characterSubscriptions: {
          where: { status: 'ACTIVE' },
          include: { character: { select: { id: true, name: true, avatarUrl: true } } },
        },
        coinBalance: true,
      },
    });
    if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    type RelWithChar = {
      characterId: string;
      isFollowing: boolean;
      isFanclub: boolean;
      totalMessages: number;
      level: number;
      lastMessageAt: Date | null;
      character: { id: string; name: string; avatarUrl: string | null };
      conversations: { id: string; createdAt: Date }[];
    };
    const rels = user.relationships as RelWithChar[];
    const following = rels.filter((r) => r.isFollowing).map((r) => ({
      characterId: r.characterId,
      name: r.character.name,
      avatarUrl: r.character.avatarUrl,
      level: r.level,
      totalMessages: r.totalMessages,
    }));
    const fanclub = rels.filter((r) => r.isFanclub).map((r) => ({
      characterId: r.characterId,
      name: r.character.name,
      avatarUrl: r.character.avatarUrl,
    }));
    const totalMessages = rels.reduce((s, r) => s + r.totalMessages, 0);
    const totalConversations = rels.reduce((s, r) => s + r.conversations.length, 0);

    return NextResponse.json({
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      plan: user.plan,
      createdAt: user.createdAt,
      following,
      fanclub,
      totalMessages,
      totalConversations,
      coinBalance: (user.coinBalance as { balance: number } | null)?.balance ?? 0,
      activeSubscriptions: (user.characterSubscriptions as { character: { id: string; name: string; avatarUrl: string | null } }[]).map((s) => ({
        characterId: s.character.id,
        name: s.character.name,
        avatarUrl: s.character.avatarUrl,
      })),
      recentActivity: rels
        .filter((r) => r.lastMessageAt)
        .slice(0, 5)
        .map((r) => ({
          characterName: r.character.name,
          level: r.level,
          lastMessageAt: r.lastMessageAt,
          totalMessages: r.totalMessages,
        })),
    });
  }

  // List users with search/filter
  const page = parseInt(searchParams.get('page') || '1', 10);
  const search = searchParams.get('search') || '';
  const planFilter = searchParams.get('plan') || '';
  const limit = 50;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { email: { contains: search, mode: 'insensitive' } },
      { displayName: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (planFilter && ['FREE', 'STANDARD', 'PREMIUM'].includes(planFilter)) {
    where.plan = planFilter;
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
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
        coinBalance: { select: { balance: true } },
        characterSubscriptions: {
          where: { status: 'ACTIVE' },
          select: { id: true },
        },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return NextResponse.json({
    users: users.map((u: {
      id: string;
      email: string | null;
      displayName: string | null;
      plan: string;
      createdAt: Date;
      sessions: { expires: Date }[];
      _count: { relationships: number };
      coinBalance: { balance: number } | null;
      characterSubscriptions: { id: string }[];
    }) => ({
      id: u.id,
      email: u.email,
      displayName: u.displayName,
      plan: u.plan,
      createdAt: u.createdAt,
      lastLogin: u.sessions[0]?.expires || null,
      relationshipCount: u._count.relationships,
      coinBalance: u.coinBalance?.balance ?? 0,
      activeSubscriptionCount: u.characterSubscriptions.length,
    })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}
