/**
 * GET /api/gacha/pity?bannerId=xxx
 * ユーザーの天井進捗を返す
 */

import { NextResponse } from 'next/server';
import { getVerifiedUserId } from '@/lib/auth-helpers';
import { getPityInfo } from '@/lib/gacha-system';

export async function GET(req: Request) {
  const userId = await getVerifiedUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const bannerId = searchParams.get('bannerId');
  if (!bannerId) return NextResponse.json({ error: 'bannerId is required' }, { status: 400 });

  try {
    const pityInfo = await getPityInfo(userId, bannerId);
    return NextResponse.json(pityInfo);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to get pity info';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
