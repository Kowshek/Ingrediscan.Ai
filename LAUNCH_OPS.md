# ingrediscan.ai — Pre-Launch Ops Checklist

Everything you need to set up and verify before posting to Reddit.
These are one-time setups (except the launch-day section).

---

## 1. Sentry — Error Monitoring

**What it does:** Catches every unhandled JS exception and promise rejection in your React app,
with a full stack trace mapped back to your real source code. You'll know something broke
before users email you.

### Setup (15 min)

1. Go to https://sentry.io → create a free account → New Project → React
2. Copy your DSN (looks like `https://xxx@yyy.ingest.sentry.io/zzz`)
3. Add to Vercel environment variables:
   ```
   VITE_SENTRY_DSN = <your DSN>
   ```
4. For source map uploads (required for readable stack traces), also add to Vercel:
   ```
   SENTRY_AUTH_TOKEN = <generate at sentry.io → Settings → Auth Tokens>
   SENTRY_ORG       = <your org slug from sentry.io URL>
   SENTRY_PROJECT   = <your project slug>
   ```
5. Redeploy. Verify: open your app, trigger a fake error in dev, check Sentry dashboard.

**Free tier limits:** 5,000 errors/month, 10,000 performance transactions.
For a Reddit MVP launch, you won't come close to these.

**What to watch on launch day:**
- Issues tab → sort by "First seen" to spot new errors immediately
- Set up email alert: Alerts → Create Alert → "New issue" → your email

---

## 2. UptimeRobot — Uptime Monitoring

**What it does:** Pings your site every 5 minutes. Sends you an email/SMS the moment it
goes down. Free forever.

### Setup (5 min)

1. Go to https://uptimerobot.com → free account
2. Add Monitor → HTTP(s) → URL: `https://ingrediscan.ai`
3. Alert contacts → add your email (and phone for SMS if you want)
4. Also add your Supabase Edge Function URL as a separate monitor:
   `https://jmvjqgmrrrkbyergyefi.supabase.co/functions/v1/analyze-ingredients`
   - Method: GET (it'll return 405 but that confirms the function is alive)

**Why two monitors:** Vercel going down and Supabase Edge Functions going down are
independent failure modes. You want to know which one is broken.

---

## 3. k6 Load Testing

**What it does:** Simulates concurrent users hitting your edge function. Tells you how
many users you can handle before response times degrade or things break.

### Install k6

```bash
# Mac
brew install k6

# Windows
winget install k6 --source winget

# Linux / WSL
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update && sudo apt-get install k6
```

### Run the tests

```bash
# 1. Smoke test — run this first. 5 users, 30 seconds.
#    Confirms the endpoint is reachable and returning 200s.
k6 run \
  --env SUPABASE_URL=https://jmvjqgmrrrkbyergyefi.supabase.co \
  --env DEV_BYPASS=dev-bypass-ingrediscan-2024 \
  tests/load/k6-load-test.js

# 2. Load test — 20 concurrent users for 2 minutes.
#    This simulates moderate traffic (your first 100 Reddit upvotes).
k6 run \
  --env SUPABASE_URL=https://jmvjqgmrrrkbyergyefi.supabase.co \
  --env DEV_BYPASS=dev-bypass-ingrediscan-2024 \
  --env SCENARIO=load \
  tests/load/k6-load-test.js

# 3. Spike test — 100 users in 10 seconds.
#    This simulates the Reddit hug of death. Run this last.
k6 run \
  --env SUPABASE_URL=https://jmvjqgmrrrkbyergyefi.supabase.co \
  --env DEV_BYPASS=dev-bypass-ingrediscan-2024 \
  --env SCENARIO=spike \
  tests/load/k6-load-test.js
```

### What the results mean

| Metric | Target | If failing |
|--------|--------|------------|
| `http_req_duration p(95)` | < 10s | Claude Haiku is slow under load — check Anthropic Console for rate limit errors |
| `errors rate` | < 2% | Edge function is crashing — check Supabase Dashboard → Functions → Logs |
| `rate_limit_hits` | Some OK | Many = you need queue or Anthropic tier upgrade |
| `cache_hits` | > 0 after warmup | If 0, Supabase DB cache isn't working |

### Your real bottlenecks (in order of likely failure)

1. **Anthropic API rate limits** — Claude Haiku free tier: 5 req/min. Tier 1: 50 req/min.
   If you go viral, you WILL hit this. The edge function already retries on 429/529
   but users will see slow responses. Fix: upgrade Anthropic tier before posting.

2. **Supabase Edge Function concurrency** — Free plan: handles concurrent requests well
   but has a 500MB memory limit per invocation. You're sending base64 images (~500KB-2MB),
   so watch memory if you hit sustained high traffic.

3. **Vercel CDN** — Not a real concern. Static SPA, globally distributed. Will handle
   thousands of concurrent visitors without issue.

---

## 4. PostHog — Already Integrated ✓

You already have PostHog in `src/lib/analytics.js`. It's tracking:
- `scan_started`
- `scan_completed` (with score, harmful/moderate counts)
- `scan_error`
- `scan_limit_reached`
- `onboarding_completed`
- `waitlist_submitted`

**What to watch on launch day (PostHog dashboard):**
- Live view → see real users in real time
- Funnel: `scan_started` → `scan_completed` — if this is < 80%, your Claude calls are failing
- `scan_limit_reached` count — tells you how many people want more than 3 scans
- `scan_error` count — if this spikes, edge function is down

---

## 5. Launch Day Monitoring Checklist

Run through this 30 min before posting to Reddit:

- [ ] `npm run build` succeeds locally with no TS/lint errors
- [ ] Deployed to Vercel → preview URL opens without white screen
- [ ] Scan one real product label end-to-end in prod (not dev)
- [ ] Sentry dashboard open in a tab — verify you see no pre-existing errors
- [ ] UptimeRobot showing green for both monitors
- [ ] PostHog Live View open in a tab
- [ ] Supabase Dashboard → Edge Functions → Logs open in a tab
- [ ] Anthropic Console → Usage tab open — know your current rate limit tier
- [ ] Your phone notifications enabled for UptimeRobot alerts

**If you get overwhelmed with traffic and Claude starts failing:**
The edge function already handles this gracefully (retry on 429, user sees
"high demand" message). But if you want to proactively throttle:
→ Supabase Dashboard → Edge Functions → you can temporarily disable the function
  which triggers the 503 path and shows users a friendly error instead of a timeout.

---

## 6. Known Limits to Communicate on Reddit

Be upfront about these in your post — Reddit appreciates honesty:

- **3 free scans per IP** (server-enforced, not just localStorage)
- **Response time 3–8 seconds** — Claude Haiku is doing real AI analysis
- **Best on food products with clear English ingredient labels** — cosmetics and medicines
  return an unsupported message

---

## Quick Reference — Dashboards to Bookmark

| Service | URL |
|---------|-----|
| Sentry | https://sentry.io/organizations/YOUR_ORG/issues/ |
| UptimeRobot | https://dashboard.uptimerobot.com |
| PostHog | https://us.posthog.com/project/YOUR_ID/activity/live |
| Supabase Logs | https://supabase.com/dashboard/project/jmvjqgmrrrkbyergyefi/functions |
| Anthropic Usage | https://console.anthropic.com/settings/usage |
| Vercel Deploys | https://vercel.com/dashboard |
