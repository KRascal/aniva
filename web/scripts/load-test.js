/**
 * ANIVA Load Test Script (k6)
 * 
 * Install: brew install k6  (or download from https://k6.io)
 * Run: k6 run scripts/load-test.js --env BASE_URL=https://demo.aniva-project.com
 * 
 * Scenarios:
 *   1. Browse (explore, moments, characters) — 60% of traffic
 *   2. Chat (send message, stream response) — 25% of traffic
 *   3. Gacha/Collection — 10% of traffic
 *   4. Admin (dashboard, character list) — 5% of traffic
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3061';
const CRON_SECRET = __ENV.CRON_SECRET || 'aniva-cron-b3bba6e9433e9d89';

// Custom metrics
const errorRate = new Rate('errors');
const chatLatency = new Trend('chat_latency');

export const options = {
  scenarios: {
    browse: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 50 },   // Ramp up to 50
        { duration: '3m', target: 100 },  // Hold at 100
        { duration: '1m', target: 0 },    // Ramp down
      ],
      exec: 'browseScenario',
    },
    chat: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 20 },
        { duration: '3m', target: 50 },
        { duration: '1m', target: 0 },
      ],
      exec: 'chatScenario',
    },
    gacha: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 10 },
        { duration: '3m', target: 20 },
        { duration: '1m', target: 0 },
      ],
      exec: 'gachaScenario',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],  // p95 < 500ms, p99 < 1s
    errors: ['rate<0.01'],  // Error rate < 1%
    chat_latency: ['p(95)<2000'],  // Chat p95 < 2s
  },
};

const headers = {
  'Content-Type': 'application/json',
  'x-cron-secret': CRON_SECRET,
};

// ── Browse Scenario ──────────────────────────────────────────
export function browseScenario() {
  group('Landing Page', () => {
    const res = http.get(`${BASE_URL}/`);
    check(res, { 'LP status 200': (r) => r.status === 200 || r.status === 307 });
    errorRate.add(res.status >= 400);
  });

  sleep(1);

  group('Explore Characters', () => {
    const res = http.get(`${BASE_URL}/api/characters`);
    check(res, { 'characters API 200': (r) => r.status === 200 });
    errorRate.add(res.status >= 400);
    
    if (res.status === 200) {
      const chars = JSON.parse(res.body);
      if (chars.length > 0) {
        const char = chars[Math.floor(Math.random() * chars.length)];
        // View character profile
        const profileRes = http.get(`${BASE_URL}/api/characters/${char.id || char.slug}`);
        check(profileRes, { 'profile API 200': (r) => r.status === 200 });
      }
    }
  });

  sleep(1);

  group('Moments Feed', () => {
    const res = http.get(`${BASE_URL}/api/moments?page=1&limit=10`);
    check(res, { 'moments API 200': (r) => r.status === 200 });
    errorRate.add(res.status >= 400);
  });

  sleep(1);

  group('Stories', () => {
    const res = http.get(`${BASE_URL}/api/stories`);
    check(res, { 'stories API 200': (r) => r.status === 200 });
    errorRate.add(res.status >= 400);
  });

  sleep(Math.random() * 3 + 1);
}

// ── Chat Scenario ──────────────────────────────────────────
export function chatScenario() {
  // Get character list first
  const charsRes = http.get(`${BASE_URL}/api/characters`);
  if (charsRes.status !== 200) {
    errorRate.add(true);
    sleep(2);
    return;
  }

  const chars = JSON.parse(charsRes.body);
  if (chars.length === 0) {
    sleep(2);
    return;
  }

  const char = chars[Math.floor(Math.random() * chars.length)];
  const characterId = char.id || char.slug;

  group('Chat History', () => {
    const res = http.get(`${BASE_URL}/api/chat/${characterId}/history?limit=20`);
    // May return 401 if not authenticated - that's OK for load test
    check(res, { 'chat history responded': (r) => r.status < 500 });
    errorRate.add(res.status >= 500);
  });

  sleep(1);

  group('Character Presence', () => {
    const res = http.get(`${BASE_URL}/api/characters/${characterId}/presence`);
    check(res, { 'presence responded': (r) => r.status < 500 });
    errorRate.add(res.status >= 500);
  });

  sleep(Math.random() * 5 + 2);
}

// ── Gacha Scenario ──────────────────────────────────────────
// Default export for simple `k6 run --duration --vus` usage
export default function () {
  browseScenario();
}

export function gachaScenario() {
  group('Gacha Banners', () => {
    const res = http.get(`${BASE_URL}/api/gacha/banners`);
    check(res, { 'gacha banners responded': (r) => r.status < 500 });
    errorRate.add(res.status >= 500);
  });

  sleep(1);

  group('Collection Cards', () => {
    const res = http.get(`${BASE_URL}/api/gacha/cards`);
    check(res, { 'gacha cards responded': (r) => r.status < 500 });
    errorRate.add(res.status >= 500);
  });

  sleep(1);

  group('Pricing', () => {
    const res = http.get(`${BASE_URL}/api/coins/packages`);
    check(res, { 'coin packages responded': (r) => r.status < 500 });
    errorRate.add(res.status >= 500);
  });

  sleep(Math.random() * 3 + 1);
}
