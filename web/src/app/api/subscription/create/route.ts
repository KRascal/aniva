import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    // セッションから認証済みユーザーIDを取得（bodyのuserIdは信頼しない）
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;

    const { plan, priceId } = await req.json();
    
    if (!plan || !priceId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    
    // Stripe Customer取得or作成
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { userId: user.id },
      });
      customerId = customer.id;
      await prisma.user.update({
        where: { id: userId },
        data: { stripeCustomerId: customerId },
      });
    }
    
    // Checkout Session作成
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.NEXTAUTH_URL}/chat?subscription=success`,
      cancel_url: `${process.env.NEXTAUTH_URL}/pricing?subscription=canceled`,
      metadata: { userId, plan },
    });
    
    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error('Subscription create error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
