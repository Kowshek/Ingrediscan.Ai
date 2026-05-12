/**
 * ingrediscan.ai — k6 Load Test Suite
 * ─────────────────────────────────────────────────────────────────────────────
 * Four explicit scenarios. Pick one per run via --env SCENARIO=<name>
 *
 *   SCENARIO=light   →    5 concurrent users  (sanity check)
 *   SCENARIO=load    →   50 concurrent users  (normal traffic pressure)
 *   SCENARIO=stress  →  100 concurrent users  (pre-Reddit stress)
 *   SCENARIO=idle    → 1000 concurrent users  (NO API calls — just sitting)
 *
 * ─── INSTALL (once) ─────────────────────────────────────────────────────────
 *   Mac:     brew install k6
 *   Windows: winget install k6 --source winget
 *   Linux:   https://k6.io/docs/getting-started/installation
 *
 * ─── RUN ────────────────────────────────────────────────────────────────────
 *   # 5 users hitting the scan endpoint
 *   k6 run --env SCENARIO=light tests/load/k6-load-test.js
 *
 *   # 50 users
 *   k6 run --env SCENARIO=load tests/load/k6-load-test.js
 *
 *   # 100 users
 *   k6 run --env SCENARIO=stress tests/load/k6-load-test.js
 *
 *   # 1000 users sitting idle (no scan calls — pure connection pressure)
 *   k6 run --env SCENARIO=idle tests/load/k6-load-test.js
 *
 *   # Override any env var on the fly
 *   k6 run --env SCENARIO=load \
 *           --env SUPABASE_URL=https://jmvjqgmrrrkbyergyefi.supabase.co \
 *           --env DEV_BYPASS=dev-bypass-ingrediscan-2024 \
 *           tests/load/k6-load-test.js
 *
 * ─── DEFAULTS (pre-filled to YOUR project) ──────────────────────────────────
 *   SUPABASE_URL = https://jmvjqgmrrrkbyergyefi.supabase.co
 *   ANON_KEY     = your project's anon key (from .env)
 *   DEV_BYPASS   = dev-bypass-ingrediscan-2024
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// ── Custom metrics ────────────────────────────────────────────────────────────
const errorRate     = new Rate('errors');
const cacheHitRate  = new Rate('cache_hits');
const claudeLatency = new Trend('claude_latency_ms', true);
const scanLimitHits = new Counter('scan_limit_hits');
const rateLimitHits = new Counter('rate_limit_hits');
const pageLoadTime  = new Trend('page_load_ms', true);

// ── Config ────────────────────────────────────────────────────────────────────
const SUPABASE_URL = __ENV.SUPABASE_URL || 'https://jmvjqgmrrrkbyergyefi.supabase.co';
const ANON_KEY     = __ENV.ANON_KEY     || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImptdmpxZ21ycnJrYnllcmd5ZWZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0ODY4NzksImV4cCI6MjA5MjA2Mjg3OX0.nh8QQ9Wny_-XW2rBK2lLyeh2bJ0CChygoTMN7EDFuNU';
const DEV_BYPASS   = __ENV.DEV_BYPASS   || 'dev-bypass-ingrediscan-2024';
const SCENARIO     = __ENV.SCENARIO     || 'light';

const SCAN_ENDPOINT = `${SUPABASE_URL}/functions/v1/analyze-ingredients`;
const AUTH_ENDPOINT = `${SUPABASE_URL}/auth/v1/`;
const REST_ENDPOINT = `${SUPABASE_URL}/rest/v1/`;

// ── Tiny valid PNG (base64) ───────────────────────────────────────────────────
// Small enough to keep bandwidth low, valid enough to pass the edge function's
// MIN_BASE64_LENGTH check. Claude will return low_confidence_warning — fine.
// We're stress-testing infrastructure, not evaluating Claude's vision.
const TINY_PNG_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFklEQVR42mNkYPhfz0AEYBxVSF+FABJaAQCvbcHzAAAAAElFTkSuQmCC';

// ── Scenario definitions ──────────────────────────────────────────────────────
const SCENARIOS = {

  // 5 users — sanity. Run this first. If this breaks, nothing else matters.
  light: {
    executor: 'constant-vus',
    vus: 5,
    duration: '1m',
    exec: 'scanUser',
  },

  // 50 users — normal viral moment. Product Hunt, a tweet with 500 likes.
  load: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '20s', target: 25 },  // ramp to half
      { duration: '1m',  target: 50 },  // hold at 50
      { duration: '20s', target: 0  },  // wind down
    ],
    exec: 'scanUser',
  },

  // 100 users — Reddit front page pressure.
  // This is the "see what breaks" run. Some 429s expected. Panic at 500s.
  stress: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '30s', target: 50  },
      { duration: '1m',  target: 100 },
      { duration: '30s', target: 0   },
    ],
    exec: 'scanUser',
  },

  // 1000 idle users — NO scan calls, NO Claude, NO heavy work.
  // Simulates 1000 people who clicked the link, the tab is open, but they
  // haven't scanned yet. What this actually tests:
  //   • Supabase connection pool under ~1000 concurrent auth sessions
  //   • Whether Supabase free tier (200 conn limit) drops connections
  //   • Vercel edge function cold-start budget on auth checks
  // Supabase free tier will start refusing connections around ~200–300 VUs.
  // That's a real finding — upgrade to Pro or set up pgBouncer.
  idle: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '30s', target: 500  }, // ramp to 500
      { duration: '1m',  target: 1000 }, // hold at 1000
      { duration: '30s', target: 0    }, // ramp down
    ],
    exec: 'idleUser',
  },

};

// ── Thresholds — test FAILS if these are breached ─────────────────────────────
export const options = {
  scenarios: {
    default: SCENARIOS[SCENARIO] || SCENARIOS.light,
  },
  thresholds: {
    // Claude Haiku can take 3-8s. p95 < 12s. p50 < 6s.
    // If p95 blows past 12s you need request queuing, not just scaling.
    http_req_duration: ['p(95)<12000', 'p(50)<6000'],

    // Real error rate (excludes 429 and scan_limit) must stay under 2%
    errors: ['rate<0.02'],

    // Idle scenario: auth ping must be fast (it's a cached Supabase call)
    page_load_ms: ['p(95)<3000'],
  },
};

// ── Headers ───────────────────────────────────────────────────────────────────
function buildScanHeaders() {
  return {
    'Content-Type': 'application/json',
    'Origin': 'https://ingrediscan.in',
    'Authorization': `Bearer ${ANON_KEY}`,
    'apikey': ANON_KEY,
    'X-Dev-Bypass': DEV_BYPASS,
  };
}

function buildAuthHeaders() {
  return {
    'apikey': ANON_KEY,
    'Authorization': `Bearer ${ANON_KEY}`,
    'Content-Type': 'application/json',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SCAN USER — used by light / load / stress
//
// Each VU simulates a user who:
//   1. Scans a product (fires the edge function → Claude → DB write)
//   2. Reads the result (think time)
//   3. Scans the same product again (should be a cache hit → fast)
//   4. Leaves or scans something else
// ─────────────────────────────────────────────────────────────────────────────
export function scanUser() {
  const headers = buildScanHeaders();

  // ── Scan #1 ───────────────────────────────────────────────────────────────
  const t0  = Date.now();
  const res = http.post(
    SCAN_ENDPOINT,
    JSON.stringify({ imageBase64: TINY_PNG_B64, mediaType: 'image/png' }),
    { headers, timeout: '40s' },
  );
  claudeLatency.add(Date.now() - t0);

  const status = res.status;
  const body   = safeParse(res.body);

  if (status === 403 && body?.error === 'scan_limit_reached') {
    // Scan limit fired. DEV_BYPASS should prevent this.
    // If you're seeing many of these, the bypass env var isn't set on the edge function.
    scanLimitHits.add(1);
  } else if (status === 429) {
    // Rate limiter working. Expected under stress/spike. NOT counted as error.
    rateLimitHits.add(1);
  } else {
    const ok = check(res, {
      'scan #1 — 200 or 502 (tiny image, Claude warns but doesn\'t crash)': (r) =>
        r.status === 200 || r.status === 502,
      'scan #1 — body is valid JSON': () => body !== null,
      'scan #1 — no 500/503': (r) => r.status !== 500 && r.status !== 503,
    });
    errorRate.add(!ok);
  }

  // User reads the analysis result
  sleep(randomBetween(2, 5));

  // ── Scan #2 — same image → should be a cache hit ─────────────────────────
  const t1        = Date.now();
  const cacheRes  = http.post(
    SCAN_ENDPOINT,
    JSON.stringify({ imageBase64: TINY_PNG_B64, mediaType: 'image/png' }),
    { headers, timeout: '40s' },
  );
  const cacheDuration = Date.now() - t1;

  // Cache hit = same hash, status 200, response under 2s (no Claude round-trip)
  cacheHitRate.add(cacheDuration < 2000 && cacheRes.status === 200);

  check(cacheRes, {
    'scan #2 (cache) — responded': (r) => r.status !== 0,
    'scan #2 (cache) — no 5xx':    (r) => r.status < 500,
  });

  // User exits or thinks before scanning again
  sleep(randomBetween(1, 3));
}

// ─────────────────────────────────────────────────────────────────────────────
// IDLE USER — used by the idle/1000-user scenario
//
// No scan, no Claude. Just what happens when the React app mounts:
//   1. supabase.auth.getSession() fires an auth check
//   2. App fetches initial REST data
//   3. User sits there reading / deciding what to scan
//
// This tests whether Supabase can hold ~1000 concurrent sessions open.
// Supabase free tier: 200 connection limit. Expect drops above that.
// ─────────────────────────────────────────────────────────────────────────────
export function idleUser() {
  const headers = buildAuthHeaders();

  // Simulate supabase.auth.getSession() on React app mount
  const t0      = Date.now();
  const authRes = http.get(`${AUTH_ENDPOINT}`, { headers, timeout: '10s' });
  pageLoadTime.add(Date.now() - t0);

  check(authRes, {
    'idle — auth endpoint reachable': (r) => r.status !== 0,
    'idle — auth not 5xx':           (r) => r.status < 500,
  });

  // Simulate REST API ping (Supabase client init does this)
  http.get(`${REST_ENDPOINT}`, { headers, timeout: '10s' });

  // User has the tab open but isn't doing anything
  // Sleep 30–90s to simulate different attention spans across VUs
  // With 1000 VUs this means ~1000 concurrent open "sessions" doing nothing
  sleep(randomBetween(30, 90));
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function safeParse(body) {
  try { return JSON.parse(body); } catch { return null; }
}

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

// ── Setup — fires once before any VU starts ───────────────────────────────────
export function setup() {
  const labels = {
    light:  '5 concurrent users    → scan endpoint',
    load:   '50 concurrent users   → scan endpoint',
    stress: '100 concurrent users  → scan endpoint',
    idle:   '1000 idle users       → NO scan calls (auth + sleep only)',
  };

  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║   ingrediscan.ai — k6 Load Test                                  ║
╠══════════════════════════════════════════════════════════════════╣
║   Scenario : ${SCENARIO.padEnd(51)}║
║   Target   : ${(labels[SCENARIO] || '?').padEnd(51)}║
║   Endpoint : ${SCAN_ENDPOINT.slice(0, 51).padEnd(51)}║
║   Bypass   : ${(DEV_BYPASS ? 'ENABLED ✓' : 'DISABLED — scan limits WILL fire!').padEnd(51)}║
╚══════════════════════════════════════════════════════════════════╝
  `);

  if (SCENARIO !== 'idle' && !DEV_BYPASS) {
    console.warn(
      '\n⚠️  DEV_BYPASS not set — VUs will exhaust the 3-scan IP limit immediately.\n' +
      '   Add: --env DEV_BYPASS=dev-bypass-ingrediscan-2024\n',
    );
  }
}

// ── Teardown — fires once after all VUs finish ────────────────────────────────
export function teardown() {
  console.log(`
─────────────────────────────────────────────────────────────────
What to read in the k6 summary above:

  light (5 users)
    p95 > 8s     → cold starts on edge function. Not a scale issue yet.
    errors > 0   → something is fundamentally broken. Fix before proceeding.

  load (50 users)
    p95 > 12s    → you're hitting Anthropic rate limits.
                   Check Anthropic Console → Usage → Requests per minute.
    scan_limit_hits > 0 → DEV_BYPASS not reaching the edge function.
                           Check Supabase edge function env vars.

  stress (100 users)
    Some 429s expected — that's the rate limiter working.
    errors > 2%  → real failures (5xx). Supabase or Claude is rejecting load.
    p95 > 15s    → need request queuing (e.g. Upstash QStash) before Reddit.

  idle (1000 users)
    page_load_ms p95 > 3s  → Supabase is queuing or dropping auth requests.
    Connection errors       → You've hit Supabase free tier's 200-connection limit.
                              Upgrade to Pro ($25/mo) or enable pgBouncer.

─────────────────────────────────────────────────────────────────
  Where to look after each run:
    Supabase Dashboard → Edge Functions → Logs (filter: error)
    Supabase Dashboard → Database → Connection pooling
    Anthropic Console  → Usage → Token spend & request count
─────────────────────────────────────────────────────────────────
  `);
}
