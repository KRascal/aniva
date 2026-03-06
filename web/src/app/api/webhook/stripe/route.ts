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
            create: { userId, paidBalance: coinAmount, freeBalance: 0, balance: coinAmount },
            update: { paidBalance: { increment: coinAmount }, balance: { increment: coinAmount } },
          }) as { paidBalance: number; freeBalance: number };

          await prisma.coinTransaction.create({
            data: {
              userId,
              type: 'PURCHASE',
              amount: coinAmount,
              balanceAfter: (balance.paidBalance ?? 0) + (balance.freeBalance ?? 0),
              refId: session.id,
              metadata: { packageId: packageId ?? null },
            },
          });
        }
      } else if (session.metadata?.type === 'fc_subscription') {
        // FCファンクラブ加入処理（キャラクター別）
        const characterId = session.metadata?.characterId;
        if (userId && characterId) {
          const character = await prisma.character.findUnique({
            where: { id: characterId },
            select: { fcMonthlyCoins: true, fcIncludedCallMin: true, fcMonthlyPriceJpy: true },
          }) as { fcMonthlyCoins: number | null; fcIncludedCallMin: number | null; fcMonthlyPriceJpy: number | null } | null;
          const fcCoins = character?.fcMonthlyCoins ?? 500;
          const fcCallMin = character?.fcIncludedCallMin ?? 30;
          const fcPrice = character?.fcMonthlyPriceJpy ?? 3480;

          // CharacterSubscription作成（既存のACTIVEがあればスキップ）
          try {
            await prisma.characterSubscription.create({
              data: {
                userId,
                characterId,
                stripeSubscriptionId: session.subscription as string,
                status: 'ACTIVE',
                currentPeriodStart: new Date(),
                currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                pricePaidJpy: fcPrice,
                callMinutesTotal: fcCallMin,
                callMinutesRemaining: fcCallMin,
              },
            });
          } catch (_e) {
            // 既に存在する場合は更新
            await prisma.characterSubscription.updateMany({
              where: { userId, characterId },
              data: {
                stripeSubscriptionId: session.subscription as string,
                status: 'ACTIVE',
                currentPeriodStart: new Date(),
                currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                callMinutesTotal: fcCallMin,
                callMinutesRemaining: fcCallMin,
              },
            });
          }

          // 月次コイン付与（paidBalance）
          if (fcCoins > 0) {
            const balance = await prisma.coinBalance.upsert({
              where: { userId },
              create: { userId, paidBalance: fcCoins, freeBalance: 0, balance: fcCoins },
              update: { paidBalance: { increment: fcCoins }, balance: { increment: fcCoins } },
            }) as { paidBalance: number; freeBalance: number };

            await prisma.coinTransaction.create({
              data: {
                userId,
                type: 'PURCHASE', // FC月次コイン付与（スキーマにEARNがなければPURCHASEで代用）
                amount: fcCoins,
                balanceAfter: (balance.paidBalance ?? 0) + (balance.freeBalance ?? 0),
                refId: session.id,
                metadata: { source: 'fc_monthly_coins', characterId },
              },
            });
          }
        }
      } else {
        // サブスクリプション処理（汎用プラン）
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

      // CharacterSubscription（FC）のキャンセル
      await prisma.characterSubscription.updateMany({
        where: { stripeSubscriptionId: sub.id },
        data: { status: 'CANCELED', canceledAt: new Date() },
      });

      // 汎用Subscriptionのキャンセル
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
