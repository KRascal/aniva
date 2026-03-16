/**
 * GET/POST /api/settings/coin-rates
 * コイン消費レート設定（管理画面から変更可能）
 * Redisにキャッシュ、fallbackはデフォルト値
 */

import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis-cache';
import { requireAdmin } from '@/lib/rbac';

const COIN_RATES_KEY = 'settings:coin-rates';

const DEFAULT_RATES = {
  chat: 10,
  image: 15,
  deepReply: 20,
  groupChatPerChar: 10,
  gachaSingle: 100,
  gachaTen: 900,
};

export type CoinRates = typeof DEFAULT_RATES;

export async function GET() {
  try {
    if (redis) {
      const cached = await redis.get(COIN_RATES_KEY);
      if (cached) {
        const rates = JSON.parse(cached as string);
        return NextResponse.json({ rates: { ...DEFAULT_RATES, ...rates } });
      }
    }
    return NextResponse.json({ rates: DEFAULT_RATES });
  } catch {
    return NextResponse.json({ rates: DEFAULT_RATES });
  }
}

export async function POST(req: NextRequest) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  try {
    const body = await req.json();
    const updates: Partial<CoinRates> = {};

    // 数値バリデーション
    for (const key of Object.keys(DEFAULT_RATES) as (keyof CoinRates)[]) {
      if (body[key] !== undefined) {
        const val = Number(body[key]);
        if (!isNaN(val) && val >= 0) {
          updates[key] = val;
        }
      }
    }

    if (redis) {
      const current = await redis.get(COIN_RATES_KEY);
      const existing = current ? JSON.parse(current as string) : {};
      await redis.set(COIN_RATES_KEY, JSON.stringify({ ...existing, ...updates }), { ex: 86400 * 365 });
    }

    return NextResponse.json({ success: true, rates: { ...DEFAULT_RATES, ...updates } });
  } catch {
    return NextResponse.json({ error: 'Failed to update rates' }, { status: 500 });
  }
}
