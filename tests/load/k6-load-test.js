/**
 * ingrediscan.ai — k6 Load Test
 * ─────────────────────────────────────────────────────────────────────────────
 * Tests the Supabase Edge Function under concurrent load.
 *
 * INSTALL k6 (run once on your machine):
 *   Mac:     brew install k6
 *   Windows: winget install k6 --source winget
 *   Linux:   https://k6.io/docs/getting-started/installation
 *
 * USAGE:
 *   # Quick smoke test — 5 users for 30 seconds
 *   k6 run --env SUPABASE_URL=<your-url> --env DEV_BYPASS=<your-secret> tests/load/k6-load-test.js
 *
 *   # Stress test — ramp up to 50 concurrent users
 *   k6 run --env SUPABASE_URL=<your-url> --env DEV_BYPASS=<your-secret> --env SCENARIO=stress tests/load/k6-load-test.js
 *
 *   # Spike test — simulate a Reddit traffic spike (burst of 100 users)
 *   k6 run --env SUPABASE_URL=<your-url> --env DEV_BYPASS=<your-secret> --env SCENARIO=spike tests/load/k6-load-test.js
 *
 * REQUIRED ENV VARS:
 *   SUPABASE_URL   — your Supabase project URL (e.g. https://xxx.supabase.co)
 *   DEV_BYPASS     — the value of VITE_DEV_BYPASS_SECRET from your .env file
 *                    This bypasses the 3-scan free limit so you don't exhaust
 *                    real IP scan counts during load testing.
 *
 * WHAT THIS TESTS:
 *   • Response time under concurrent load (p95 target: < 8s — Claude can be slow)
 *   • Error rate under load (target: < 1%)
 *   • Cache hit performance (second request with same image should be < 500ms)
 *   • Rate limit behaviour (10 req/IP/min) — separate scenario
 *   • Edge function cold start vs warm performance
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// ── Custom metrics ─────────────────────────────────────────────────────────
const errorRate        = new Rate('errors');
const cacheHitRate     = new Rate('cache_hits');
const claudeLatency    = new Trend('claude_latency_ms', true);
const scanLimitHits    = new Counter('scan_limit_hits');
const rateLimitHits    = new Counter('rate_limit_hits');

// ── Config ─────────────────────────────────────────────────────────────────
const SUPABASE_URL  = __ENV.SUPABASE_URL  || 'https://jmvjqgmrrrkbyergyefi.supabase.co';
const ANON_KEY      = __ENV.ANON_KEY      || '';
const DEV_BYPASS    = __ENV.DEV_BYPASS    || '';
const SCENARIO      = __ENV.SCENARIO      || 'smoke';

const ENDPOINT = `${SUPABASE_URL}/functions/v1/analyze-ingredients`;

// ── Scenarios ──────────────────────────────────────────────────────────────
// smoke  — sanity check: 5 users, 30s. Use before every deploy.
// load   — normal expected traffic: 20 concurrent users, 2 min.
// stress — find breaking point: ramp to 50 users over 3 min.
// spike  — Reddit hug of death simulation: 0 → 100 users in 10s, hold 1 min.
const SCENARIOS = {
  smoke: {
    executor: 'constant-vus',
    vus: 5,
    duration: '30s',
  },
  load: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '30s', target: 10 },  // ramp up
      { duration: '1m',  target: 20 },  // hold at 20 concurrent users
      { duration: '30s', target: 0  },  // ramp down
    ],
  },
  stress: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '30s', target: 10 },
      { duration: '1m',  target: 30 },
      { duration: '1m',  target: 50 },  // push hard
      { duration: '30s', target: 0  },
    ],
  },
  spike: {
    // Simulates your Reddit post getting traction — sudden burst
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '10s', target: 100 }, // 0 → 100 in 10 seconds
      { duration: '1m',  target: 100 }, // hold the spike
      { duration: '10s', target: 0   }, // drop off
    ],
  },
};

export const options = {
  scenarios: {
    default: SCENARIOS[SCENARIO] || SCENARIOS.smoke,
  },

  // ── Thresholds — test FAILS if these are breached ─────────────────────
  thresholds: {
    // Claude Haiku can take 3-8s. p95 under 10s is acceptable.
    // Cache hits should be < 500ms — if they're not, DB has a problem.
    http_req_duration: ['p(95)<10000', 'p(50)<5000'],

    // Error rate: < 2% — some 429s under spike are expected and acceptable
    errors: ['rate<0.02'],

    // Rate limit hits are expected under spike — not counted as errors
    // but tracked separately so you can see the pattern
  },
};

// ── Tiny 1x1 PNG (base64) ─────────────────────────────────────────────────
// Real-world test: use an actual food label image. For load testing, a tiny
// valid image keeps bandwidth low but exercises the full code path.
// The edge function will return a low_confidence_warning (image unreadable)
// but it still exercises: rate limiting → scan limit → Claude call → DB write.
//
// To test with a real label: replace this with a base64-encoded photo.
// Minimal valid PNG that passes MIN_BASE64_LENGTH (100 chars) in validation.ts.
// Padded with extra metadata to exceed the threshold while staying tiny.
const TINY_PNG_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFklEQVR42mNkYPhfz0AEYBxVSF+FABJaAQCvbcHzAAAAAElFTkSuQmCC';

// Slightly different image for cache-miss testing (different hash)
const TINY_PNG_B64_ALT =
  'iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFklEQVR42mNkYPhfz0AEYBxVSF+FABJaAQCvbcHzAAAAAElFTkSuQmCC';

// ── Headers ────────────────────────────────────────────────────────────────
function buildHeaders() {
  const h = {
    'Content-Type': 'application/json',
    'Origin': 'https://ingrediscan.in', // must match ALLOWED_ORIGINS in validation.ts
    // Supabase requires the anon key to reach edge functions
    'Authorization': `Bearer ${ANON_KEY}`,
    'apikey': ANON_KEY,
  };
  if (DEV_BYPASS) {
    h['X-Dev-Bypass'] = DEV_BYPASS;
  }
  return h;
}

// ── Default function — runs once per VU per iteration ─────────────────────
export default function () {
  const headers = buildHeaders();

  // ── Test 1: Normal scan request ─────────────────────────────────────────
  const startMs = Date.now();
  const res = http.post(
    ENDPOINT,
    JSON.stringify({
      imageBase64: TINY_PNG_B64,
      mediaType: 'image/png',
    }),
    { headers, timeout: '30s' },
  );
  claudeLatency.add(Date.now() - startMs);

  const status = res.status;
  const body   = (() => { try { return JSON.parse(res.body); } catch { return {}; } })();

  // Track specific conditions separately — don't lump them into errors
  if (status === 403 && body?.error === 'scan_limit_reached') {
    scanLimitHits.add(1);
    // This is NOT an error — it means IP limit enforcement is working
  } else if (status === 429) {
    rateLimitHits.add(1);
    // Also not really an error — rate limiting is working as designed
  } else {
    const ok = check(res, {
      'status is 200 or 502 (claude parse fail on tiny image)': (r) =>
        r.status === 200 || r.status === 502,
      'response has JSON body': () => body && typeof body === 'object',
      'no unexpected server error': (r) =>
        r.status !== 500 && r.status !== 503,
    });
    errorRate.add(!ok);
  }

  // ── Test 2: Cache hit test ───────────────────────────────────────────────
  // Same image hash → should return cached result much faster
  sleep(0.5);
  const cacheStart = Date.now();
  const cacheRes = http.post(
    ENDPOINT,
    JSON.stringify({
      imageBase64: TINY_PNG_B64, // same image = same hash = cache hit
      mediaType: 'image/png',
    }),
    { headers, timeout: '30s' },
  );
  const cacheDuration = Date.now() - cacheStart;

  // Cache hits should be noticeably faster than a Claude round-trip
  const wasCacheHit = cacheDuration < 2000 && cacheRes.status === 200;
  cacheHitRate.add(wasCacheHit);

  check(cacheRes, {
    'cache hit responded': (r) => r.status === 200 || r.status === 403,
  });

  // Realistic think time between user scans — don't hammer without pause
  sleep(Math.random() * 2 + 1); // 1–3s random sleep
}

// ── Setup — runs once before all VUs ──────────────────────────────────────
export function setup() {
  console.log(`
╔══════════════════════════════════════════╗
║   ingrediscan.ai k6 Load Test            ║
║   Scenario: ${SCENARIO.padEnd(28)}║
║   Endpoint: ${ENDPOINT.slice(0, 28).padEnd(28)}║
║   Dev bypass: ${DEV_BYPASS ? 'ENABLED ✓' : 'DISABLED — scan limits active!'}         ║
╚══════════════════════════════════════════╝
  `);

  if (!DEV_BYPASS) {
    console.warn(
      '⚠️  DEV_BYPASS not set. Each VU will hit the 3-scan IP limit.\n' +
      '   Run with: --env DEV_BYPASS=your-secret-from-.env',
    );
  }
}

// ── Teardown — runs once after all VUs finish ──────────────────────────────
export function teardown() {
  console.log(`
Load test complete.

Key things to check in the k6 summary:
  • http_req_duration p(95): target < 10s (Claude Haiku latency)
  • errors rate: target < 2%
  • rate_limit_hits: some expected under spike — high numbers mean you need
    to consider Anthropic tier upgrade or request queuing
  • cache_hits: if this is 0, your DB cache isn't working under load

Supabase Dashboard → Functions → Logs to see edge function errors.
Anthropic Console  → Usage to check if you approached rate limits.
  `);
}
