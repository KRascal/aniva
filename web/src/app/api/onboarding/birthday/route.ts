/**
 * POST /api/onboarding/birthday
 * ユーザーの生年月日を保存
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { birthday } = await req.json() as { birthday: string };

  // バリデーション: YYYY-MM-DD形式
  if (!birthday || !/^\d{4}-\d{2}-\d{2}$/.test(birthday)) {
    return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
  }

  // 年齢チェック（13歳以上）
  const birthDate = new Date(birthday);
  const now = new Date();
  const age = now.getFullYear() - birthDate.getFullYear();
  if (age < 13 || age > 120) {
    return NextResponse.json({ error: 'Invalid age' }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { birthday: birthDate },
  });

  return NextResponse.json({ ok: true });
}
