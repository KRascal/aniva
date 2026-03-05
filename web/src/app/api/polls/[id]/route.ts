/**
 * GET /api/polls/[id]    投票詳細（結果含む）
 * PATCH /api/polls/[id]  投票更新（admin）
 * DELETE /api/polls/[id] 投票削除（admin）
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const poll = await prisma.storyPoll.findUnique({
      where: { id },
      include: {
        character: {
          select: {
            id: true,
            name: true,
            slug: true,
            avatarUrl: true,
            franchise: true,
          },
        },
        votes: {
          select: {
            choiceId: true,
            userId: true,
            votedAt: true,
          },
        },
      },
    });

    if (!poll) {
      return NextResponse.json({ error: 'Poll not found' }, { status: 404 });
    }

    const now = new Date();
    const isExpired = poll.endsAt < now;
    const remainingMs = isExpired ? 0 : poll.endsAt.getTime() - now.getTime();
    const remainingHours = isExpired ? 0 : Math.ceil(remainingMs / (1000 * 60 * 60));

    const choices = poll.choices as Array<{ id: string; text: string }>;
    const voteCountMap: Record<string, number> = {};
    for (const choice of choices) {
      voteCountMap[choice.id] = 0;
    }
    for (const vote of poll.votes) {
      if (voteCountMap[vote.choiceId] !== undefined) {
        voteCountMap[vote.choiceId]++;
      }
    }

    const myVote = poll.votes.find((v) => v.userId === session.user!.id)?.choiceId ?? null;
    const totalVotes = poll.votes.length;

    const choicesWithCounts = choices.map((choice) => ({
      id: choice.id,
      text: choice.text,
      voteCount: voteCountMap[choice.id] ?? 0,
      percentage: totalVotes > 0 ? Math.round(((voteCountMap[choice.id] ?? 0) / totalVotes) * 100) : 0,
    }));

    // 結果: 投票数最大の選択肢
    const winningChoice = isExpired
      ? choicesWithCounts.reduce((prev, curr) =>
          curr.voteCount > prev.voteCount ? curr : prev,
          choicesWithCounts[0]
        )
      : null;

    return NextResponse.json({
      poll: {
        id: poll.id,
        characterId: poll.characterId,
        title: poll.title,
        description: poll.description,
        choices: choicesWithCounts,
        startsAt: poll.startsAt.toISOString(),
        endsAt: poll.endsAt.toISOString(),
        isActive: poll.isActive,
        isExpired,
        remainingHours,
        myVote,
        totalVotes,
        resultChoiceId: poll.resultChoiceId ?? winningChoice?.id ?? null,
        character: poll.character,
      },
    });
  } catch (error) {
    console.error('[polls/[id]] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ── PATCH: 投票更新（admin） ──────────────────────────────────────────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // admin check: email or role
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { email: true } });
  const isAdmin = user?.email?.endsWith('@nin-japan.com') || user?.email === 'keisuke.arai501@gmail.com';
  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  const updateData: Record<string, unknown> = {};
  if (body.title !== undefined) updateData.title = body.title;
  if (body.description !== undefined) updateData.description = body.description;
  if (body.isActive !== undefined) updateData.isActive = body.isActive;
  if (body.startsAt !== undefined) updateData.startsAt = new Date(body.startsAt);
  if (body.endsAt !== undefined) updateData.endsAt = new Date(body.endsAt);
  if (body.resultChoiceId !== undefined) updateData.resultChoiceId = body.resultChoiceId;
  if (body.choices !== undefined) updateData.choices = body.choices;

  try {
    const updated = await prisma.storyPoll.update({ where: { id }, data: updateData });
    return NextResponse.json({ poll: updated });
  } catch (error) {
    console.error('[polls/[id] PATCH] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ── DELETE: 投票削除（admin） ─────────────────────────────────────────────────

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { email: true } });
  const isAdmin = user?.email?.endsWith('@nin-japan.com') || user?.email === 'keisuke.arai501@gmail.com';
  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;

  try {
    // まず関連する votes を削除
    await prisma.storyPollVote.deleteMany({ where: { pollId: id } });
    await prisma.storyPoll.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[polls/[id] DELETE] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
