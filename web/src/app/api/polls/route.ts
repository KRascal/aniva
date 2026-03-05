/**
 * GET /api/polls  全投票一覧（admin）
 * POST /api/polls 新規投票作成（admin）
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

async function isAdmin(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  return !!(user?.email?.endsWith('@nin-japan.com') || user?.email === 'keisuke.arai501@gmail.com');
}

// ── GET: 全投票一覧（admin） ──────────────────────────────────────────────────

export async function GET(_request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!(await isAdmin(session.user.id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const polls = await prisma.storyPoll.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        character: { select: { id: true, name: true, slug: true, avatarUrl: true } },
        votes: { select: { id: true } },
      },
    });

    return NextResponse.json({
      polls: polls.map((p) => ({
        id: p.id,
        characterId: p.characterId,
        title: p.title,
        description: p.description,
        choices: p.choices,
        startsAt: p.startsAt.toISOString(),
        endsAt: p.endsAt.toISOString(),
        isActive: p.isActive,
        resultChoiceId: p.resultChoiceId,
        voteCount: p.votes.length,
        character: p.character,
        createdAt: p.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('[polls GET] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ── POST: 新規投票作成（admin） ───────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!(await isAdmin(session.user.id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { characterId, title, description, choices, startsAt, endsAt } = body;

  if (!characterId || !title || !choices || !startsAt || !endsAt) {
    return NextResponse.json(
      { error: 'characterId, title, choices, startsAt, endsAt は必須です' },
      { status: 400 }
    );
  }

  if (!Array.isArray(choices) || choices.length < 2) {
    return NextResponse.json({ error: '選択肢は2つ以上必要です' }, { status: 400 });
  }

  // choices を {id, text} の形式に正規化
  const normalizedChoices = choices.map((c: { id?: string; text: string }, idx: number) => ({
    id: c.id ?? String.fromCharCode(97 + idx), // a, b, c ...
    text: c.text,
  }));

  try {
    const poll = await prisma.storyPoll.create({
      data: {
        characterId,
        title,
        description: description ?? null,
        choices: normalizedChoices,
        startsAt: new Date(startsAt),
        endsAt: new Date(endsAt),
        isActive: true,
      },
      include: {
        character: { select: { id: true, name: true, slug: true, avatarUrl: true } },
      },
    });

    return NextResponse.json({ poll }, { status: 201 });
  } catch (error) {
    console.error('[polls POST] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
