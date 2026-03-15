import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/rbac';
import { logger } from '@/lib/logger';
import Redis from 'ioredis';

const REDIS_KEY = 'aniva:auto-posts:config';

export type PostType = 'autonomous-post' | 'community-posts' | 'stories-post' | 'character-comments';

export interface CharacterPostConfig {
  enabled: boolean;
  normalRatio: number;   // 0-100, PREMIUM = 100 - normalRatio
}

export interface AutoPostsConfig {
  characters: Record<string, CharacterPostConfig>;  // characterId -> config
  globalEnabled: boolean;
  defaultNormalRatio: number;
  enabledTypes: PostType[];
}

const DEFAULTS: AutoPostsConfig = {
  characters: {},
  globalEnabled: true,
  defaultNormalRatio: 85,
  enabledTypes: ['autonomous-post', 'community-posts', 'stories-post', 'character-comments'],
};

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

export async function getAutoPostsConfig(): Promise<AutoPostsConfig> {
  try {
    const r = getRedis();
    const raw = await r.get(REDIS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AutoPostsConfig>;
      return { ...DEFAULTS, ...parsed };
    }
  } catch {
    // Redis障害時はデフォルト値
  }
  return { ...DEFAULTS };
}

export async function GET(_req: NextRequest) {
  try {
    const ctx = await requireRole('editor');
    if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const config = await getAutoPostsConfig();
    return NextResponse.json({ config, defaults: DEFAULTS });
  } catch (error) {
    logger.error('[admin/auto-posts] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireRole('editor');
    if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json() as Partial<AutoPostsConfig>;

    // Validate normalRatio range
    if (body.defaultNormalRatio !== undefined) {
      const ratio = Number(body.defaultNormalRatio);
      if (isNaN(ratio) || ratio < 0 || ratio > 100) {
        return NextResponse.json({ error: 'defaultNormalRatioは0〜100の範囲で指定してください' }, { status: 400 });
      }
    }

    // Validate per-character ratios
    if (body.characters) {
      for (const [charId, cfg] of Object.entries(body.characters)) {
        if (cfg.normalRatio < 0 || cfg.normalRatio > 100) {
          return NextResponse.json({ error: `キャラ ${charId} のnormalRatioが不正です` }, { status: 400 });
        }
      }
    }

    const current = await getAutoPostsConfig();
    const updated: AutoPostsConfig = {
      ...current,
      ...body,
      characters: { ...current.characters, ...(body.characters ?? {}) },
    };

    const r = getRedis();
    await r.set(REDIS_KEY, JSON.stringify(updated));

    logger.info('[admin/auto-posts] Config updated by', ctx.email);
    return NextResponse.json({ ok: true, config: updated });
  } catch (error) {
    logger.error('[admin/auto-posts] POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
