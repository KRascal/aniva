import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-01-28.clover',
});

// ANIVA課金プラン定義
export const PLANS = {
  FREE: {
    name: 'Free',
    price: 0,
    priceId: null,
    features: ['1日3メッセージ', 'キャラプロフィール閲覧', 'Moments一部閲覧'],
  },
  STANDARD: {
    name: 'Standard',
    price: 980,
    priceId: null as string | null, // Stripe Price IDは後で設定
    features: ['無制限チャット', 'ボイスメッセージ', '全Moments閲覧', 'AI画像受信', 'Live2D（動）'],
  },
  PREMIUM: {
    name: 'Premium', 
    price: 2980,
    priceId: null as string | null,
    features: ['Standard全機能', '音声通話(月60分)', 'Live2D通話', '限定Moments', 'パーソナライズ動画', '優先応答'],
  },
} as const;

/**
 * Stripeの商品とプランを作成（初回セットアップ用）
 */
export async function setupStripeProducts() {
  // Product作成
  const product = await stripe.products.create({
    name: 'ANIVA Subscription',
    description: '推しが実在する世界 - AIキャラクターとの対話プラットフォーム',
  });
  
  // Standard Plan
  const standardPrice = await stripe.prices.create({
    product: product.id,
    unit_amount: 980,
    currency: 'jpy',
    recurring: { interval: 'month' },
    metadata: { plan: 'STANDARD' },
  });
  
  // Premium Plan
  const premiumPrice = await stripe.prices.create({
    product: product.id,
    unit_amount: 2980,
    currency: 'jpy',
    recurring: { interval: 'month' },
    metadata: { plan: 'PREMIUM' },
  });
  
  return {
    productId: product.id,
    standardPriceId: standardPrice.id,
    premiumPriceId: premiumPrice.id,
  };
}
