import { NextRequest, NextResponse } from 'next/server';
import { getVerifiedUserId } from '@/lib/auth-helpers';
import { recoverStreak } from '@/lib/streak-system';

const RECOVERY_COST = 50; // コイン

export async function POST(req: NextRequest) {
  const userId = await getVerifiedUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { relationshipId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { relationshipId } = body;
  if (!relationshipId) {
    return NextResponse.json({ error: 'relationshipId required' }, { status: 400 });
  }

  const result = await recoverStreak(relationshipId, userId, RECOVERY_COST);

  if (!result.success) {
    const statusMap: Record<string, number> = {
      relationship_not_found: 404,
      streak_not_broken: 400,
      insufficient_coins: 402,
    };
    return NextResponse.json(
      {
        error: result.error,
        newStreak: result.newStreak,
        coinsSpent: 0,
      },
      { status: statusMap[result.error ?? ''] ?? 500 },
    );
  }

  return NextResponse.json({
    success: true,
    newStreak: result.newStreak,   // 復活後のstreakDays（直前の値を保持）
    coinsSpent: RECOVERY_COST,     // 消費コイン数
    message: 'ストリーク復活！🔥',
  });
}
