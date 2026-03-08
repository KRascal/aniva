import { prisma } from '@/lib/prisma';

interface HealthCheck {
  status: 'ok' | 'degraded' | 'down';
  service: string;
  uptime: number;
  timestamp: string;
  checks: {
    database: { ok: boolean; latencyMs?: number; error?: string };
    externalApis?: {
      xai: { ok: boolean; error?: string };
      elevenlabs: { ok: boolean; error?: string };
    };
  };
  stats?: {
    characters: number;
    users: number;
    memoryUsageMB: number;
  };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const detailed = searchParams.get('detailed') === 'true';
  const secret = searchParams.get('secret');
  const cronSecret = process.env.CRON_SECRET;

  const health: HealthCheck = {
    status: 'ok',
    service: 'aniva',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    checks: {
      database: { ok: false },
    },
  };

  // DB check
  try {
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    health.checks.database = { ok: true, latencyMs: Date.now() - start };
  } catch (err) {
    health.checks.database = { ok: false, error: err instanceof Error ? err.message : 'unknown' };
    health.status = 'down';
  }

  // Detailed checks (with auth)
  if (detailed && secret === cronSecret) {
    health.checks.externalApis = {
      xai: { ok: false },
      elevenlabs: { ok: false },
    };

    // xAI API check
    try {
      const res = await fetch('https://api.x.ai/v1/models', {
        headers: { 'Authorization': `Bearer ${process.env.XAI_API_KEY}` },
        signal: AbortSignal.timeout(5000),
      });
      health.checks.externalApis.xai = { ok: res.ok };
    } catch (err) {
      health.checks.externalApis.xai = { ok: false, error: err instanceof Error ? err.message : 'timeout' };
      health.status = 'degraded';
    }

    // ElevenLabs API check
    try {
      const res = await fetch('https://api.elevenlabs.io/v1/user', {
        headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY || '' },
        signal: AbortSignal.timeout(5000),
      });
      health.checks.externalApis.elevenlabs = { ok: res.ok };
    } catch (err) {
      health.checks.externalApis.elevenlabs = { ok: false, error: err instanceof Error ? err.message : 'timeout' };
      health.status = 'degraded';
    }

    // Stats
    try {
      const [charCount, userCount] = await Promise.all([
        prisma.character.count({ where: { isActive: true } }),
        prisma.user.count(),
      ]);
      const mem = process.memoryUsage();
      health.stats = {
        characters: charCount,
        users: userCount,
        memoryUsageMB: Math.round(mem.rss / 1024 / 1024),
      };
    } catch {
      // stats failure is non-critical
    }
  }

  return Response.json(health, {
    status: health.status === 'down' ? 503 : 200,
  });
}
