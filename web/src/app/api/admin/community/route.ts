/**
 * GET /api/admin/community — FanThread/FanReply 一覧
 * DELETE /api/admin/community — 投稿削除
 * PATCH /api/admin/community — ピン留め切替
 * super_admin専用
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireRole('super_admin');
    if (!ctx) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'thread'; // thread | reply
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 100);
    const skip = (page - 1) * limit;
    const reportedOnly = searchParams.get('reportedOnly') === 'true';
    const characterId = searchParams.get('characterId') || undefined;

    if (type === 'thread') {
      const where: Record<string, unknown> = {};
      if (characterId) where.characterId = characterId;

      // 通報フラグ付きフィルタ: Reportテーブルと照合
      if (reportedOnly) {
        const reportedIds = await prisma.report.findMany({
          where: { targetType: 'community_thread' },
          select: { targetId: true },
          distinct: ['targetId'],
        });
        where.id = { in: reportedIds.map((r) => r.targetId) };
      }

      const [threads, total] = await Promise.all([
        prisma.fanThread.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            character: { select: { id: true, name: true, avatarUrl: true } },
            user: { select: { id: true, displayName: true, nickname: true } },
            _count: { select: { replies: true } },
          },
        }),
        prisma.fanThread.count({ where }),
      ]);

      return NextResponse.json({
        type: 'thread',
        threads,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    } else {
      // replies
      const where: Record<string, unknown> = {};
      if (reportedOnly) {
        const reportedIds = await prisma.report.findMany({
          where: { targetType: 'community_reply' },
          select: { targetId: true },
          distinct: ['targetId'],
        });
        where.id = { in: reportedIds.map((r) => r.targetId) };
      }

      const [replies, total] = await Promise.all([
        prisma.fanReply.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            thread: { select: { id: true, title: true } },
            user: { select: { id: true, displayName: true, nickname: true } },
            character: { select: { id: true, name: true, avatarUrl: true } },
          },
        }),
        prisma.fanReply.count({ where }),
      ]);

      return NextResponse.json({
        type: 'reply',
        replies,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    }
  } catch (error) {
    logger.error('GET /api/admin/community error', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const ctx = await requireRole('super_admin');
    if (!ctx) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { id, type } = body; // type: 'thread' | 'reply'

    if (!id || !type) {
      return NextResponse.json({ error: 'id and type are required' }, { status: 400 });
    }

    if (type === 'thread') {
      await prisma.fanThread.delete({ where: { id } });
      logger.info('Admin: FanThread deleted', { adminId: ctx.id, threadId: id });
    } else if (type === 'reply') {
      await prisma.fanReply.delete({ where: { id } });
      logger.info('Admin: FanReply deleted', { adminId: ctx.id, replyId: id });
    } else {
      return NextResponse.json({ error: 'type must be thread or reply' }, { status: 400 });
    }

    return NextResponse.json({ deleted: true, id, type });
  } catch (error) {
    logger.error('DELETE /api/admin/community error', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const ctx = await requireRole('super_admin');
    if (!ctx) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { id, isPinned } = body;

    if (!id || typeof isPinned !== 'boolean') {
      return NextResponse.json({ error: 'id and isPinned are required' }, { status: 400 });
    }

    const updated = await prisma.fanThread.update({
      where: { id },
      data: { isPinned },
    });

    logger.info('Admin: FanThread pin toggled', { adminId: ctx.id, threadId: id, isPinned });

    return NextResponse.json({ updated: true, thread: updated });
  } catch (error) {
    logger.error('PATCH /api/admin/community error', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
