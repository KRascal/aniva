import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    // セッションからuserIdを取得（リクエストbodyのuserIdを信頼しない）
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // JWT IDでユーザーを検証、なければemailでfallback
    let user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!user && session.user.email) {
      user = await prisma.user.findUnique({ where: { email: session.user.email } });
    }
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    const userId = user.id;

    const subscription = await prisma.subscription.findFirst({
      where: { userId, status: 'ACTIVE' },
    });

    if (!subscription?.stripeSubscriptionId) {
      return NextResponse.json({ error: 'No active subscription' }, { status: 404 });
    }

    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { canceledAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Subscription cancel error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
