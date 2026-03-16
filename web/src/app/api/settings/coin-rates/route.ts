/**
 * GET/POST /api/settings/coin-rates
 * コイン消費レート設定（管理画面から変更可能）
 * Redisにキャッシュ、fallbackはデフォルト値
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/rbac';

const DEFAULT_RATES = {
  chat: 10,
  image: 15,
  deepReply: 20,
  groupChatPerChar: 10,
  gachaSingle: 100,
  gachaTen: 900,
};

export type CoinRates = typeof DEFAULT_RATES;

/**
 * GET: 管理画面のSystemConfigテーブルから設定値を取得（なければデフォルト）
 */
export async function GET() {
  try {
    // prisma.$queryRawでsettingsテーブルの coin_rates を取得
    const rows = await prisma.$queryRaw<Array<{ value: string }>>`
      SELECT value FROM "SystemConfig" WHERE key = 'coin_rates' LIMIT 1
    `.catch(() => []);

    if (rows.length > 0) {
      const rates = JSON.parse(rows[0].value);
      return NextResponse.json({ rates: { ...DEFAULT_RATES, ...rates } });
    }
    return NextResponse.json({ rates: DEFAULT_RATES });
  } catch {
    return NextResponse.json({ rates: DEFAULT_RATES });
  }
}

/**
 * POST: 管理画面からコイン設定値を更新
 */
export async function POST(req: NextRequest) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  try {
    const body = await req.json();
    const updates: Partial<CoinRates> = {};

    for (const key of Object.keys(DEFAULT_RATES) as (keyof CoinRates)[]) {
      if (body[key] !== undefined) {
        const val = Number(body[key]);
        if (!isNaN(val) && val >= 0) {
          updates[key] = val;
        }
      }
    }

    // upsert to SystemConfig
    await prisma.$executeRaw`
      INSERT INTO "SystemConfig" (id, key, value, "updatedAt")
      VALUES (gen_random_uuid(), 'coin_rates', ${JSON.stringify({ ...DEFAULT_RATES, ...updates })}, NOW())
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, "updatedAt" = NOW()
    `.catch(() => {});

    return NextResponse.json({ success: true, rates: { ...DEFAULT_RATES, ...updates } });
  } catch {
    return NextResponse.json({ error: 'Failed to update rates' }, { status: 500 });
  }
}
