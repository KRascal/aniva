import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireRole('super_admin');
    if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q')?.trim() ?? '';

    if (!query) {
      return NextResponse.json({ error: 'Query required (email or user ID)' }, { status: 400 });
    }

    // Find user by email or id
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: query, mode: 'insensitive' } },
          { id: query },
        ],
      },
      include: {
        relationships: {
          include: {
            character: { select: { id: true, name: true } },
            conversations: {
              orderBy: { createdAt: 'asc' },
              take: 1,
              select: { createdAt: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        characterSubscriptions: {
          orderBy: { createdAt: 'asc' },
          include: { character: { select: { id: true, name: true } } },
        },
        coinTransactions: {
          where: { type: 'PURCHASE' },
          orderBy: { createdAt: 'asc' },
          take: 100,
          select: { id: true, amount: true, createdAt: true, description: true },
        },
        sessions: {
          orderBy: { expires: 'desc' },
          take: 1,
          select: { expires: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Build timeline events
    type TimelineEvent = {
      type: string;
      label: string;
      detail: string;
      date: Date;
    };

    const timeline: TimelineEvent[] = [];

    // Registration
    timeline.push({
      type: 'registered',
      label: '登録',
      detail: `${user.email ?? '不明'} として登録`,
      date: user.createdAt,
    });

    // First chat (earliest conversation)
    const allConversations = (user.relationships as Array<{
      character: { id: string; name: string };
      conversations: { createdAt: Date }[];
    }>).flatMap((r) =>
      r.conversations.map((c) => ({ date: c.createdAt, character: r.character.name }))
    );
    if (allConversations.length > 0) {
      allConversations.sort((a, b) => a.date.getTime() - b.date.getTime());
      timeline.push({
        type: 'first_chat',
        label: '初回チャット',
        detail: `${allConversations[0].character} と初チャット`,
        date: allConversations[0].date,
      });
    }

    // FC join (first fan club subscription)
    const firstFc = (user.characterSubscriptions as Array<{
      createdAt: Date;
      character: { id: string; name: string };
    }>).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0];
    if (firstFc) {
      timeline.push({
        type: 'fc_join',
        label: 'FC加入',
        detail: `${firstFc.character.name} のFCに加入`,
        date: firstFc.createdAt,
      });
    }

    // Coin purchases
    const purchases = user.coinTransactions as Array<{ id: string; amount: number; createdAt: Date; description: string | null }>;
    if (purchases.length > 0) {
      purchases.forEach((p) => {
        timeline.push({
          type: 'purchase',
          label: '課金',
          detail: `${p.amount.toLocaleString()} コイン購入${p.description ? ' — ' + p.description : ''}`,
          date: p.createdAt,
        });
      });
    }

    // Sort timeline
    timeline.sort((a, b) => a.date.getTime() - b.date.getTime());

    // Last login
    const lastLoginDate = (user.sessions as Array<{ expires: Date }>)[0]?.expires ?? null;
    if (lastLoginDate) {
      timeline.push({
        type: 'last_login',
        label: '最終ログイン',
        detail: '最終ログイン',
        date: lastLoginDate,
      });
    }

    // Determine lifecycle status
    const now = new Date();
    const daysSinceLastLogin = lastLoginDate
      ? (now.getTime() - lastLoginDate.getTime()) / (1000 * 60 * 60 * 24)
      : 999;

    let status: 'active' | 'dormant' | 'churn_risk' | 'churn_planned';
    if (daysSinceLastLogin <= 7) status = 'active';
    else if (daysSinceLastLogin <= 30) status = 'dormant';
    else if (daysSinceLastLogin <= 90) status = 'churn_risk';
    else status = 'churn_planned';

    const activeSubscriptions = (user.characterSubscriptions as Array<{
      status: string;
      character: { id: string; name: string };
      canceledAt: Date | null;
    }>).filter((s) => s.status === 'ACTIVE');

    const totalPurchaseAmount = purchases.reduce((s, p) => s + p.amount, 0);

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        plan: user.plan,
        createdAt: user.createdAt,
        lastLogin: lastLoginDate,
        status,
        totalPurchases: purchases.length,
        totalCoinsPurchased: totalPurchaseAmount,
        activeSubscriptions: activeSubscriptions.map((s) => s.character.name),
        relationshipCount: user.relationships.length,
      },
      timeline: timeline.map((e) => ({
        type: e.type,
        label: e.label,
        detail: e.detail,
        date: e.date,
      })),
    });
  } catch (error) {
    logger.error('[admin/user-lifecycle] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
