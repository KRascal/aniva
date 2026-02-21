import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const { userId, characterId, amount } = await req.json();
    
    if (!userId || !characterId || !amount || amount < 100) {
      return NextResponse.json({ error: 'Invalid tip amount (min ¥100)' }, { status: 400 });
    }
    
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    
    if (!user.stripeCustomerId) {
      return NextResponse.json({ error: 'No payment method on file' }, { status: 400 });
    }
    
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'jpy',
      customer: user.stripeCustomerId,
      metadata: { userId, characterId, type: 'tip' },
    });
    
    await prisma.transaction.create({
      data: {
        userId,
        characterId,
        type: 'TIP',
        amount,
        stripePaymentIntentId: paymentIntent.id,
      },
    });
    
    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error) {
    console.error('Tip error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
