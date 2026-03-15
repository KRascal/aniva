import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

function toCSV(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(',')];
  for (const row of rows) {
    const values = headers.map((h) => {
      const val = row[h];
      if (val === null || val === undefined) return '';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return '"' + str.replace(/"/g, '""') + '"';
      }
      return str;
    });
    lines.push(values.join(','));
  }
  return lines.join('\n');
}

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireRole('super_admin');
    if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const target = searchParams.get('target'); // users | conversations | revenue | characters
    const format = searchParams.get('format') ?? 'json'; // json | csv
    const from = searchParams.get('from') ?? undefined;
    const to = searchParams.get('to') ?? undefined;

    if (!target || !['users', 'conversations', 'revenue', 'characters'].includes(target)) {
      return NextResponse.json({ error: 'Invalid target' }, { status: 400 });
    }

    const dateFilter: Record<string, Date> = {};
    if (from) dateFilter.gte = new Date(from);
    if (to) dateFilter.lte = new Date(to + 'T23:59:59.999Z');

    let data: Record<string, unknown>[] = [];
    let filename = '';

    if (target === 'users') {
      const users = await prisma.user.findMany({
        where: Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {},
        select: {
          id: true,
          email: true,
          displayName: true,
          plan: true,
          createdAt: true,
          _count: { select: { relationships: true } },
          coinBalance: { select: { balance: true } },
          characterSubscriptions: {
            where: { status: 'ACTIVE' },
            select: { id: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 10000,
      });
      data = users.map((u) => ({
        id: u.id,
        email: u.email,
        displayName: u.displayName,
        plan: u.plan,
        createdAt: u.createdAt?.toISOString(),
        relationshipCount: u._count.relationships,
        coinBalance: u.coinBalance?.balance ?? 0,
        activeSubscriptions: u.characterSubscriptions.length,
      }));
      filename = 'users';

    } else if (target === 'conversations') {
      const messages = await prisma.message.findMany({
        where: {
          role: { not: 'SYSTEM' },
          ...(Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}),
        },
        select: {
          id: true,
          role: true,
          content: true,
          createdAt: true,
          conversation: {
            select: {
              id: true,
              relationship: {
                select: {
                  userId: true,
                  characterId: true,
                  user: { select: { email: true } },
                  character: { select: { name: true } },
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 10000,
      });
      data = messages.map((m) => ({
        id: m.id,
        conversationId: m.conversation.id,
        userId: m.conversation.relationship.userId,
        userEmail: m.conversation.relationship.user.email,
        characterId: m.conversation.relationship.characterId,
        characterName: m.conversation.relationship.character.name,
        role: m.role,
        content: m.content,
        createdAt: m.createdAt?.toISOString(),
      }));
      filename = 'conversations';

    } else if (target === 'revenue') {
      const txns = await prisma.coinTransaction.findMany({
        where: {
          type: 'PURCHASE',
          ...(Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}),
        },
        select: {
          id: true,
          userId: true,
          amount: true,
          balanceAfter: true,
          description: true,
          createdAt: true,
          user: { select: { email: true, displayName: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 10000,
      });
      data = txns.map((t) => ({
        id: t.id,
        userId: t.userId,
        userEmail: t.user.email,
        displayName: t.user.displayName,
        coinsAmount: t.amount,
        balanceAfter: t.balanceAfter,
        description: t.description,
        createdAt: t.createdAt?.toISOString(),
      }));
      filename = 'revenue';

    } else if (target === 'characters') {
      const characters = await prisma.character.findMany({
        where: Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {},
        select: {
          id: true,
          name: true,
          slug: true,
          tagline: true,
          description: true,
          isActive: true,
          isPremium: true,
          createdAt: true,
          _count: {
            select: { relationships: true, subscribers: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 1000,
      });
      data = characters.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        tagline: c.tagline,
        description: c.description,
        isActive: c.isActive,
        isPremium: c.isPremium,
        createdAt: c.createdAt?.toISOString(),
        relationshipCount: c._count.relationships,
        subscriberCount: c._count.subscribers,
      }));
      filename = 'characters';
    }

    const dateStr = new Date().toISOString().split('T')[0];
    const fullFilename = `aniva-${filename}-${dateStr}.${format}`;

    if (format === 'csv') {
      const csv = toCSV(data);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${fullFilename}"`,
        },
      });
    } else {
      const json = JSON.stringify(data, null, 2);
      return new NextResponse(json, {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${fullFilename}"`,
        },
      });
    }
  } catch (error) {
    logger.error('[admin/export] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
