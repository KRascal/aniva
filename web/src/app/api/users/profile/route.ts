/**
 * ユーザープロフィール更新 API
 * PATCH /api/users/profile
 * - displayName を更新する（キャラが呼ぶ名前）
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { displayName?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { displayName } = body;
  if (displayName === undefined) {
    return NextResponse.json({ error: 'displayName is required' }, { status: 400 });
  }

  // 20文字以内・空白トリム
  const trimmed = String(displayName).trim().slice(0, 20);

  const user = await prisma.user.update({
    where: { email: session.user.email },
    data: { displayName: trimmed || null },
    select: { id: true, displayName: true },
  });

  return NextResponse.json({ displayName: user.displayName });
}
