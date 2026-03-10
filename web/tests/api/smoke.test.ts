import { describe, it, expect } from 'vitest';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3061';

/** Helper: fetch with timeout */
async function apiFetch(path: string, timeoutMs = 5000): Promise<Response> {
  return fetch(`${BASE_URL}${path}`, { signal: AbortSignal.timeout(timeoutMs) });
}

// ---------------------------------------------------------------------------
// Public Endpoints — no auth required, should return 200
// ---------------------------------------------------------------------------
describe('API Smoke Tests - Public Endpoints', () => {
  it('GET /api/health → 200, has status/service/uptime', async () => {
    const res = await apiFetch('/api/health');
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('status', 'ok');
    expect(data).toHaveProperty('service');
    expect(data).toHaveProperty('uptime');
  });

  it('GET /api/characters → 200, array with id/slug/name', async () => {
    const res = await apiFetch('/api/characters');
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('characters');
    expect(Array.isArray(data.characters)).toBe(true);
    if (data.characters.length > 0) {
      const first = data.characters[0];
      expect(first).toHaveProperty('id');
      expect(first).toHaveProperty('slug');
      expect(first).toHaveProperty('name');
    }
  });

  it('GET /api/characters/[slug] → 200, has character with id/slug/name/description', async () => {
    const res = await apiFetch('/api/characters/chopper');
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('character');
    const char = data.character;
    expect(char).toHaveProperty('id');
    expect(char).toHaveProperty('slug');
    expect(char).toHaveProperty('name');
    expect(char).toHaveProperty('description');
  });

  it('GET /api/characters/[slug]/presence → 200, has presence object', async () => {
    const res = await apiFetch('/api/characters/chopper/presence');
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('presence');
    expect(data.presence).toHaveProperty('isAvailable');
  });

  it('GET /api/characters/[slug]/daily-state → 200, object', async () => {
    const res = await apiFetch('/api/characters/chopper/daily-state');
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(typeof data).toBe('object');
    expect(data).not.toBeNull();
  });

  it('GET /api/moments → 200, has moments array', async () => {
    const res = await apiFetch('/api/moments');
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('moments');
    expect(Array.isArray(data.moments)).toBe(true);
  });

  it('GET /api/stories → 200, has stories array', async () => {
    const res = await apiFetch('/api/stories');
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('stories');
    expect(Array.isArray(data.stories)).toBe(true);
  });

  it('GET /api/events → 200, object with date', async () => {
    const res = await apiFetch('/api/events');
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(typeof data).toBe('object');
    expect(data).toHaveProperty('date');
  });

  it('GET /api/geoip → 200, object', async () => {
    const res = await apiFetch('/api/geoip');
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(typeof data).toBe('object');
    expect(data).not.toBeNull();
  });

  it('GET /api/build-id → 200, has buildId', async () => {
    const res = await apiFetch('/api/build-id');
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('buildId');
  });

  it('GET /api/ranking → 200, object with rankings', async () => {
    const res = await apiFetch('/api/ranking');
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(typeof data).toBe('object');
    expect(data).toHaveProperty('rankings');
  });

  it('GET /api/ranking/characters → 200, has ranking array', async () => {
    const res = await apiFetch('/api/ranking/characters');
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(typeof data).toBe('object');
    expect(data).toHaveProperty('ranking');
    expect(Array.isArray(data.ranking)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Auth-Required Endpoints — should return 401 or 403 without auth
// ---------------------------------------------------------------------------
describe('API Smoke Tests - Auth Required (expect 401/403)', () => {
  const authEndpoints = [
    '/api/chat/send',
    '/api/coins/balance',
    '/api/letters',
    '/api/missions',
    '/api/users/me',
    '/api/relationship/all',
    '/api/notifications',
    '/api/gacha/banners',
    '/api/polls/active',
    '/api/story',
  ];

  for (const path of authEndpoints) {
    it(`GET ${path} → 401 or 403 without auth`, async () => {
      const res = await apiFetch(path);
      expect([401, 403]).toContain(res.status);
    });
  }
});
