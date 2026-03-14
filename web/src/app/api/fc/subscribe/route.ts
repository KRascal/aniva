import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { stripe } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { paymentLimiter, rateLimitResponse } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const userId = (session?.user as { id?: string })?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limit: 5回/分（課金API保護）
    const rl = await paymentLimiter.check(userId);
    if (!rl.success) return rateLimitResponse(rl);

    const { characterId } = await req.json() as { characterId?: string };
    if (!characterId) {
      return NextResponse.json({ error: 'characterId is required' }, { status: 400 });
    }

    // キャラクター情報取得（スキーマ最新版フィールドはanyで取得）
    const character = await (prisma.character.findUnique as Function)({
      where: { id: characterId },
      select: {
        id: true,
        name: true,
        fcMonthlyPriceJpy: true,
        fcIncludedCallMin: true,
        fcMonthlyCoins: true,
      },
    }) as {
      id: string;
      name: string;
      fcMonthlyPriceJpy: number | null;
      fcIncludedCallMin: number | null;
      fcMonthlyCoins: number | null;
    } | null;

    if (!character) {
      return NextResponse.json({ error: 'Character not found' }, { status: 404 });
    }

    // 既存のアクティブなFC加入チェック
    const existing = await prisma.characterSubscription.findFirst({
      where: { userId, characterId, status: 'ACTIVE' },
    });
    if (existing) {
      return NextResponse.json({ error: 'Already subscribed' }, { status: 409 });
    }

    // Stripe Customer取得 or 作成
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { stripeCustomerId: true, email: true },
    });
    let customerId = dbUser?.stripeCustomerId ?? null;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: dbUser?.email ?? undefined,
        metadata: { userId },
      });
      customerId = customer.id;
      await prisma.user.update({
        where: { id: userId },
        data: { stripeCustomerId: customerId },
      });
    }

    const priceJpy = character.fcMonthlyPriceJpy ?? 3480;
    const fcCallMin = character.fcIncludedCallMin ?? 30;
    const fcCoins = character.fcMonthlyCoins ?? 500;
    const baseUrl = process.env.NEXTAUTH_URL ?? 'https://demo.aniva-project.com';

    // デモモード: Stripe不要で即FC加入
    const DEMO_MODE = process.env.DEMO_MODE === 'true' || !process.env.STRIPE_SECRET_KEY;
    if (DEMO_MODE) {
      await prisma.characterSubscription.create({
        data: {
          userId,
          characterId,
          status: 'ACTIVE',
          pricePaidJpy: priceJpy,
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });
      return NextResponse.json({ success: true, demoMode: true });
    }

    // Stripe Checkout Session作成（動的価格 price_data を使用）
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'jpy',
            product_data: {
              name: `${character.name} FC会員`,
              description: `チャット無制限 / 月${fcCallMin}分通話 / 月${fcCoins}コイン付与`,
              metadata: { characterId: character.id },
            },
            unit_amount: priceJpy,
            recurring: { interval: 'month' },
          },
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/chat/${characterId}?fc_success=1`,
      cancel_url: `${baseUrl}/chat/${characterId}`,
      metadata: { userId, characterId, type: 'fc_subscription' },
      subscription_data: {
        metadata: { userId, characterId, type: 'fc_subscription' },
      },
    });

    return NextResponse.json({ checkoutUrl: checkoutSession.url });
  } catch (error) {
    logger.error('FC subscribe error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
