import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { recoverStreak } from '@/lib/streak-system';

const RECOVERY_COST = 50; // コイン

export async function POST(req: NextRequest) {
  const token = await getToken({ req });
  if (!token?.sub) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { relationshipId } = body;
  if (!relationshipId) {
    return NextResponse.json({ error: 'relationshipId required' }, { status: 400 });
  }

  const result = await recoverStreak(relationshipId, token.sub, RECOVERY_COST);

  if (!result.success) {
    const statusMap: Record<string, number> = {
      relationship_not_found: 404,
      streak_not_broken: 400,
      insufficient_coins: 402,
    };
    return NextResponse.json(
      { error: result.error, newStreak: result.newStreak },
      { status: statusMap[result.error ?? ''] ?? 500 },
    );
  }

  return NextResponse.json({
    success: true,
    newStreak: result.newStreak,
    cost: RECOVERY_COST,
    message: 'ストリーク復活！🔥',
  });
}
