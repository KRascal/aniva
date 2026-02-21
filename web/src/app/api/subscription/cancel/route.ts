import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();
    
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
