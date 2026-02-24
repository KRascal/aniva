import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';
import { CoinTxType } from '@prisma/client';

interface PurchaseRequest {
  packageId: string;
  successUrl?: string;
  cancelUrl?: string;
}

const DEMO_MODE = process.env.DEMO_MODE === 'true' || !process.env.STRIPE_SECRET_KEY;

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const userId = (session?.user as any)?.id;
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body: PurchaseRequest = await req.json();
    const { packageId, successUrl, cancelUrl } = body;

    if (!packageId) {
      return NextResponse.json({ error: 'packageId is required' }, { status: 400 });
    }

    // DBからCoinPackageを取得
    const coinPackage = await prisma.coinPackage.findUnique({
      where: { id: packageId, isActive: true },
    });

    if (!coinPackage) {
      return NextResponse.json({ error: 'Package not found' }, { status: 404 });
    }

    const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000';
    const defaultSuccessUrl = `${baseUrl}/coins?status=success`;
    const defaultCancelUrl = `${baseUrl}/coins?status=cancel`;

    // デモモード: Stripeをスキップして直接コイン付与
    if (DEMO_MODE) {
      const result = await prisma.$transaction(async (tx) => {
        const coinBalance = await tx.coinBalance.upsert({
          where: { userId },
          create: { userId, balance: 0 },
          update: {},
        });

        const newBalance = coinBalance.balance + coinPackage.coinAmount;

        await tx.coinBalance.update({
          where: { userId },
          data: { balance: newBalance },
        });

        await tx.coinTransaction.create({
          data: {
            userId,
            type: CoinTxType.PURCHASE,
            amount: coinPackage.coinAmount,
            balanceAfter: newBalance,
            description: `[DEMO] ${coinPackage.name} 購入`,
            metadata: { packageId, packageName: coinPackage.name, demoMode: true },
          },
        });

        return newBalance;
      });

      return NextResponse.json({ success: true, balance: result });
    }

    // 本番: Stripe Checkout Session作成
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

    // Stripe Customer取得or作成
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: { userId: user.id },
      });
      customerId = customer.id;
      await prisma.user.update({
        where: { id: userId },
        data: { stripeCustomerId: customerId },
      });
    }

    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'jpy',
            unit_amount: coinPackage.priceWebJpy,
            product_data: {
              name: coinPackage.name,
              description: `${coinPackage.coinAmount.toLocaleString()}コイン`,
            },
          },
          quantity: 1,
        },
      ],
      success_url: successUrl ?? defaultSuccessUrl,
      cancel_url: cancelUrl ?? defaultCancelUrl,
      metadata: {
        type: 'COIN_PURCHASE',
        userId,
        packageId,
        coinAmount: String(coinPackage.coinAmount),
      },
    });

    return NextResponse.json({ checkoutUrl: checkoutSession.url });
  } catch (error) {
    console.error('Coin purchase error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
