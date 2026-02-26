import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';
import Stripe from 'stripe';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature')!;
  
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error('Webhook signature verification failed');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }
  
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;

      if (session.metadata?.type === 'COIN_PURCHASE') {
        // コイン購入処理
        const packageId = session.metadata?.packageId;
        const coinAmount = parseInt(session.metadata?.coinAmount ?? '0', 10);

        if (userId && coinAmount > 0) {
          const balance = await prisma.coinBalance.upsert({
            where: { userId },
            create: { userId, balance: coinAmount },
            update: { balance: { increment: coinAmount } },
          });

          await prisma.coinTransaction.create({
            data: {
              userId,
              type: 'PURCHASE',
              amount: coinAmount,
              balanceAfter: balance.balance,
              refId: session.id,
              metadata: { packageId: packageId ?? null },
            },
          });
        }
      } else {
        // サブスクリプション処理
        const plan = session.metadata?.plan as 'STANDARD' | 'PREMIUM';

        if (userId && plan) {
          await prisma.subscription.create({
            data: {
              userId,
              plan,
              stripeSubscriptionId: session.subscription as string,
              status: 'ACTIVE',
              currentPeriodStart: new Date(),
              currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            },
          });

          await prisma.user.update({
            where: { id: userId },
            data: { plan },
          });
        }
      }
      break;
    }
    
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      await prisma.subscription.updateMany({
        where: { stripeSubscriptionId: sub.id },
        data: { status: 'CANCELED' },
      });
      
      const dbSub = await prisma.subscription.findFirst({
        where: { stripeSubscriptionId: sub.id },
      });
      if (dbSub) {
        await prisma.user.update({
          where: { id: dbSub.userId },
          data: { plan: 'FREE' },
        });
      }
      break;
    }
    
    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      const subId = typeof invoice.parent?.subscription_details?.subscription === 'string'
        ? invoice.parent.subscription_details.subscription
        : null;
      if (subId) {
        await prisma.subscription.updateMany({
          where: { stripeSubscriptionId: subId },
          data: { status: 'PAST_DUE' },
        });
      }
      break;
    }
  }
  
  return NextResponse.json({ received: true });
}
