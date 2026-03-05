/**
 * GET /api/polls/active
 * アクティブな投票一覧（期間内）
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();

  try {
    const polls = await prisma.storyPoll.findMany({
      where: {
        isActive: true,
        startsAt: { lte: now },
        endsAt: { gte: now },
      },
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
          },
        },
      },
      orderBy: { endsAt: 'asc' },
    });

    const result = polls.map((poll) => {
      const remainingMs = poll.endsAt.getTime() - now.getTime();
      const remainingHours = Math.ceil(remainingMs / (1000 * 60 * 60));

      // 選択肢ごとの投票数を集計
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

      // ユーザーの投票
      const myVote = poll.votes.find((v) => v.userId === session.user!.id)?.choiceId ?? null;
      const totalVotes = poll.votes.length;

      const choicesWithCounts = choices.map((choice) => ({
        id: choice.id,
        text: choice.text,
        voteCount: voteCountMap[choice.id] ?? 0,
        percentage: totalVotes > 0 ? Math.round(((voteCountMap[choice.id] ?? 0) / totalVotes) * 100) : 0,
      }));

      return {
        id: poll.id,
        characterId: poll.characterId,
        title: poll.title,
        description: poll.description,
        choices: choicesWithCounts,
        startsAt: poll.startsAt.toISOString(),
        endsAt: poll.endsAt.toISOString(),
        isActive: poll.isActive,
        remainingHours,
        myVote,
        totalVotes,
        character: poll.character,
      };
    });

    return NextResponse.json({ polls: result });
  } catch (error) {
    console.error('[polls/active] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
