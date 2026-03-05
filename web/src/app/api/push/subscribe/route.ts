import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { endpoint?: string; p256dh?: string; auth?: string; subscription?: { endpoint: string; keys: { p256dh: string; auth: string } } };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  // 2つの形式に対応: フラット形式 or ネスト形式
  const endpoint = body.endpoint || body.subscription?.endpoint;
  const p256dh = body.p256dh || body.subscription?.keys?.p256dh;
  const authKey = body.auth || body.subscription?.keys?.auth;

  if (!endpoint || !p256dh || !authKey) {
    return NextResponse.json({ error: 'Missing subscription data' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  await prisma.pushSubscription.upsert({
    where: { endpoint },
    update: { p256dh, auth: authKey, userId: user.id },
    create: {
      userId: user.id,
      endpoint,
      p256dh,
      auth: authKey,
    },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { endpoint } = await req.json();
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await prisma.pushSubscription.deleteMany({
    where: { endpoint, userId: user.id },
  });
  return NextResponse.json({ ok: true });
}
