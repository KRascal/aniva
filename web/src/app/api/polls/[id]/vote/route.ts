/**
 * POST /api/polls/[id]/vote
 * 投票（body: { choiceId }）
 * - 期間外は403
 * - 重複投票は上書き（upsert）
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const { choiceId } = body as { choiceId?: string };

  if (!choiceId) {
    return NextResponse.json({ error: 'choiceId is required' }, { status: 400 });
  }

  try {
    const poll = await prisma.storyPoll.findUnique({
      where: { id },
    });

    if (!poll) {
      return NextResponse.json({ error: 'Poll not found' }, { status: 404 });
    }

    const now = new Date();
    if (!poll.isActive || poll.startsAt > now || poll.endsAt < now) {
      return NextResponse.json({ error: 'Poll is not currently active' }, { status: 403 });
    }

    // choiceId の存在確認
    const choices = poll.choices as Array<{ id: string; text: string }>;
    const validChoice = choices.find((c) => c.id === choiceId);
    if (!validChoice) {
      return NextResponse.json({ error: 'Invalid choiceId' }, { status: 400 });
    }

    // upsert: 重複投票は上書き
    const vote = await prisma.storyPollVote.upsert({
      where: {
        userId_pollId: {
          userId: session.user.id,
          pollId: id,
        },
      },
      create: {
        userId: session.user.id,
        pollId: id,
        choiceId,
      },
      update: {
        choiceId,
        votedAt: new Date(),
      },
    });

    // 最新の投票集計を返す
    const allVotes = await prisma.storyPollVote.findMany({
      where: { pollId: id },
      select: { choiceId: true },
    });

    const voteCountMap: Record<string, number> = {};
    for (const choice of choices) {
      voteCountMap[choice.id] = 0;
    }
    for (const v of allVotes) {
      if (voteCountMap[v.choiceId] !== undefined) {
        voteCountMap[v.choiceId]++;
      }
    }

    const totalVotes = allVotes.length;
    const choicesWithCounts = choices.map((choice) => ({
      id: choice.id,
      text: choice.text,
      voteCount: voteCountMap[choice.id] ?? 0,
      percentage: totalVotes > 0 ? Math.round(((voteCountMap[choice.id] ?? 0) / totalVotes) * 100) : 0,
    }));

    return NextResponse.json({
      success: true,
      vote: { id: vote.id, choiceId: vote.choiceId, votedAt: vote.votedAt.toISOString() },
      choices: choicesWithCounts,
      totalVotes,
    });
  } catch (error) {
    console.error('[polls/vote] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
