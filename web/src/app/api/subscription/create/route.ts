import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const { userId, plan, priceId } = await req.json();
    
    if (!userId || !plan || !priceId) {
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
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.NEXTAUTH_URL}/chat?subscription=success`,
      cancel_url: `${process.env.NEXTAUTH_URL}/pricing?subscription=canceled`,
      metadata: { userId, plan },
    });
    
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Subscription create error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
