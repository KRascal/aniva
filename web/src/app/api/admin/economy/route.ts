import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/rbac';
import { logger } from '@/lib/logger';
import Redis from 'ioredis';

const REDIS_KEY = 'aniva:economy:config';

// デフォルト値（環境変数 or ハードコード）
const DEFAULTS = {
  chatCoinCost:          Number(process.env.CHAT_COIN_COST)              || 10,
  imageCoinCost:         Number(process.env.IMAGE_COIN_COST)             || 15,
  deepChatCoinCost:      Number(process.env.DEEP_CHAT_COIN_COST)         || 20,
  crosstalkCostPerChar:  Number(process.env.CROSSTALK_COIN_COST_PER_CHAR)|| 10,
  gachaSingleCost:       Number(process.env.GACHA_SINGLE_COST)           || 100,
  gacha10Cost:           Number(process.env.GACHA_10_COST)               || 900,
  fcFreeMessagesPerDay:  Number(process.env.FC_FREE_MESSAGES_PER_DAY)    || 50,
  fcFreeCoinsPerMonth:   Number(process.env.FC_FREE_COINS_PER_MONTH)     || 500,
};

export type EconomyConfig = typeof DEFAULTS;

let _redis: Redis | null = null;
function getRedis(): Redis {
  if (!_redis) {
    _redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: 1,
      lazyConnect: true,
      connectTimeout: 3000,
    });
    _redis.on('error', () => {});
  }
  return _redis;
}

export async function getEconomyConfig(): Promise<EconomyConfig> {
  try {
    const r = getRedis();
    const raw = await r.get(REDIS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<EconomyConfig>;
      return { ...DEFAULTS, ...parsed };
    }
  } catch {
    // Redis障害時はデフォルト値使用
  }
  return { ...DEFAULTS };
}

export async function GET(_req: NextRequest) {
  try {
    const ctx = await requireRole('editor');
    if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const config = await getEconomyConfig();
    return NextResponse.json({ config, defaults: DEFAULTS });
  } catch (error) {
    logger.error('[admin/economy] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireRole('super_admin');
    if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json() as Partial<EconomyConfig>;

    // バリデーション: 全値は正の整数
    const validated: Partial<EconomyConfig> = {};
    for (const [key, val] of Object.entries(body)) {
      if (key in DEFAULTS) {
        const num = Number(val);
        if (!Number.isInteger(num) || num < 0) {
          return NextResponse.json(
            { error: `${key} must be a non-negative integer` },
            { status: 400 }
          );
        }
        (validated as Record<string, number>)[key] = num;
      }
    }

    // Redisに保存（TTLなし = 永続）
    const r = getRedis();
    await r.set(REDIS_KEY, JSON.stringify(validated));

    logger.info('[admin/economy] Config updated', { adminEmail: ctx.email, validated });

    const config = await getEconomyConfig();
    return NextResponse.json({ config, message: '保存しました' });
  } catch (error) {
    logger.error('[admin/economy] POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest) {
  try {
    const ctx = await requireRole('super_admin');
    if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const r = getRedis();
    await r.del(REDIS_KEY);

    logger.info('[admin/economy] Config reset to defaults by', ctx.email);
    return NextResponse.json({ config: DEFAULTS, message: 'デフォルト値にリセットしました' });
  } catch (error) {
    logger.error('[admin/economy] DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
