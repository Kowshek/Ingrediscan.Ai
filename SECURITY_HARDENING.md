# Security hardening pass — what shipped & what you do next

> Branch (uncommitted, sitting in your working tree): `hardening/security-pass`
> Status: code is written + locally tested (67/67 unit tests passing, lint clean,
> build succeeds). Sandbox can't push from here — you finish in 5 minutes.

---

## 0 · The 60-second summary

Four workstreams landed on this branch:

1. **CodeRabbit** is configured (`.coderabbit.yaml`) with assertive review,
   per-path rules tuned for Supabase Edge Functions / React / SQL, and tools
   (gitleaks, semgrep, checkov, eslint) wired in. **You install the GitHub App.**
2. **Vitest + Playwright** are wired up with 67 passing unit tests and a smoke
   E2E suite. CI workflow (`.github/workflows/ci.yml`) runs all of it on PR.
3. **7 security holes** in the Edge Function + `analyzeImage.js` are patched.
   A SQL migration adds the backing table for the rate-limiter and locks
   down RLS on `scans`. **You apply the migration with `supabase db push`.**
4. **Alert system + 1,000 scan/day hard cap.** Postgres-backed daily counter
   fires email alerts at 70%, 90%, 100% — and HARD-BLOCKS new requests once
   the cap is hit. Spike detectors page on Claude 429s, function 502s, and
   rate-limit blocks. **You set Resend env vars + an Anthropic budget cap.**

---

## 1 · Run on your machine

Open a terminal in the project root.

```bash
# 1. Make sure you're on the new branch
git checkout -b hardening/security-pass    # or `git switch` if it already exists

# 2. Pick up the new devDeps (vitest, playwright, testing-library, etc.)
rm -rf node_modules package-lock.json      # only if you hit cross-platform binary errors
npm install

# 3. Delete the visual-regression test that'll fight UI iteration
rm src/components/ScoreCircle.test.jsx

# 4. Verify everything is green BEFORE you push
npm run lint                                # should be 0 errors
npm test                                    # should print "67 passed"
npm run build                               # should produce dist/

# 5. (Optional) Try Playwright locally — needs a one-time browser install
npx playwright install chromium
npm run test:e2e
```

If any of those fail, ping me — don't push a red branch.

---

## 2 · Commit and push

```bash
git add .coderabbit.yaml \
        .github/ \
        eslint.config.js \
        package.json \
        playwright.config.js \
        src/lib/hash.test.js \
        src/utils/analyzeImage.js \
        src/utils/analyzeImage.test.js \
        supabase/functions/_shared/ \
        supabase/functions/analyze-ingredients/index.ts \
        supabase/migrations/ \
        tests/ \
        tests/unit/alerts.test.js \
        vite.config.js \
        vitest.setup.js \
        SECURITY_HARDENING.md
# Stage the deletion of the trimmed test
git rm src/components/ScoreCircle.test.jsx 2>/dev/null || true

git commit -m "hardening: security pass + CI/test infra + CodeRabbit config"

git push -u origin hardening/security-pass
```

Then open a PR against `main` from the GitHub UI (or `gh pr create`). Title:
`Security hardening: rate-limit, CORS, schema validation, CI, tests`.

---

## 3 · Install CodeRabbit on the repo

Click-by-click:

1. Go to **<https://app.coderabbit.ai>** → **Sign in with GitHub** as
   `Kowshek` (the org/owner of the repo).
2. Click **Add Repositories** → grant access to **`Kowshek/Ingrediscan.Ai`**
   only (don't grant org-wide unless you want it).
3. CodeRabbit shows your repo card. Click **Configure**.
4. The dashboard will detect the `.coderabbit.yaml` already in the repo and
   say "Using config from repository." That's what you want — don't override
   anything in the dashboard, since the YAML wins on conflicts.
5. Plan: Free tier is fine for a personal repo. Pro is needed if you're on a
   GitHub org (org repos require Pro).
6. Push your branch (step 2 above) and open the PR. Within ~60 seconds
   CodeRabbit posts a "Walkthrough" + "Summary" comment, then in-line
   comments on flagged lines.

**If CodeRabbit doesn't comment within 5 minutes:**

- Check **Repo Settings → Webhooks** → look for `coderabbit.ai` → recent
  delivery should be `200 OK`. If it's red, click **Redeliver**.
- Check **app.coderabbit.ai → Logs** for the run. Most common cause: PR base
  branch isn't `main` or `develop` (those are the only auto-review branches
  in the config — change it in `.coderabbit.yaml` if needed).

---

## 4 · Apply the SQL migrations

There are TWO migrations on this branch. Both are idempotent — safe to re-run.

| File | What it adds |
|---|---|
| `20260424000000_rate_limits_and_scans_rls.sql` | `rate_limits` table + `bump_rate_limit` RPC. Locks down RLS on `scans`. |
| `20260424000001_usage_metrics_and_alerts.sql` | `usage_metrics` + `alerts_sent` tables. `bump_usage_metric` + `claim_alert` RPCs. Backs the daily cap + email alerts. |

**Option A — Supabase CLI (recommended):**

```bash
# From the project root, with your project already linked
supabase db push
```

**Option B — Dashboard:**

Open **Supabase → SQL Editor → New Query**, paste the contents of each
migration file (in order), hit **Run** for each.

After the migrations, redeploy the Edge Function so it picks up the new
`_shared/` helpers:

```bash
supabase functions deploy analyze-ingredients
```

Then set the function secrets:

```bash
# Required — without this the rate-limit + alert system silently no-ops
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<your service role key>

# Required for email alerts (see section 4b)
supabase secrets set RESEND_API_KEY=<resend api key>
supabase secrets set ALERT_EMAIL_TO=tophat5822@gmail.com
supabase secrets set ALERT_EMAIL_FROM=alerts@<your-verified-domain>
```

Get the service role key from **Supabase → Settings → API → service_role**.
**Never put this key in the browser bundle.** It bypasses RLS.

---

## 4b · Set up Resend (email transport for alerts)

If you skip this step, the alert system still works — it just logs the
alert to the function logs and never emails you. So nothing breaks, but
you'll miss the "we're at 70% of the cap" warning.

1. Go to **<https://resend.com>** → sign up with your GitHub account.
2. **Domains → Add Domain.** Add a domain you control (e.g. `ingrediscan.in`).
   You don't need to send marketing email from it — alerts only.
3. Add the DNS records Resend gives you (TXT, MX, optional DKIM) at your
   registrar. Verification usually takes 5–15 minutes.
4. **API Keys → Create API Key** → name it `ingrediscan-edge-alerts`,
   permission: **Sending access**, domain: the one you just added.
   Copy the key (starts with `re_`). You only see it once.
5. Set the three secrets shown in section 4 above. `ALERT_EMAIL_FROM` must
   be a sender on the verified domain (e.g. `alerts@ingrediscan.in`).

**Free tier covers 100 emails/day, 3,000/month** — plenty for an alert system
that fires at most ~6 times a day (3 thresholds + 3 spike alerts, all
deduped by `claim_alert` so each fires at most once per day).

**Don't have a domain yet?** Resend lets you send from
`onboarding@resend.dev` for testing only — set `ALERT_EMAIL_FROM=onboarding@resend.dev`.
Replace it before launch.

---

## 4c · Cap your Anthropic spend

The 1,000-scan/day hard block in the Edge Function protects you against
runaway USAGE. It does NOT protect you against an Anthropic billing bug, a
miscount, or a bypass you missed. Set a budget cap server-side too:

1. Go to **<https://console.anthropic.com/settings/billing>**.
2. Under **Usage limits**, set a **monthly spend cap**. Math at current
   Haiku pricing (~$0.001/scan with vision): 1,000 scans/day × 30 days ≈
   $30/mo. Set the cap at **$50** for headroom; Anthropic will hard-stop
   the API past that.
3. Under **Budgets & alerts**, set email alerts at 50% / 80% / 100% of the
   cap. This is your independent backstop — if your function alert system
   fails (Resend outage, etc.) you still hear from Anthropic directly.

**Why both?** The function-level cap is your first line: it's instant,
free, and uses YOUR signals. The Anthropic cap is your second line: it
catches anything that bypasses the function (bugs, misconfigured keys,
someone exfiltrating the key into a different app).

---

## 5 · The 7 security holes — what was wrong, what changed

| # | Issue | Where | Fix |
|---|-------|-------|-----|
| 1 | In-memory rate limit reset on every cold start; per-instance, easily bypassed by hitting the function until you land on a fresh container. Result: an attacker burns through your `ANTHROPIC_API_KEY` credits trivially. | `supabase/functions/analyze-ingredients/index.ts` | Postgres-backed limiter via `bump_rate_limit` RPC + `rate_limits` table (service-role only). |
| 2 | CORS silently fell back to `ALLOWED_ORIGINS[0]` for unknown origins, masking misconfigured callers. | same | Now returns 403 + `Access-Control-Allow-Origin: null` for disallowed origins, including on preflight. |
| 3 | `err.message` serialized into the response body — leaked stack details / internal state to attackers. | same | Generic message client-side; details logged with a request id. |
| 4 | `data.content[0].text` unchecked — any unexpected Claude response shape crashes the function with a 500. | same | Optional chaining + `parseClaudeText` helper that never throws. |
| 5 | No timeout on the Claude fetch — a slow upstream could pin the function until the platform 30s timeout. | same | 25s `AbortController` with an explicit 504 response. |
| 6 | `analyzeImage.js` did `catch { /* cache miss */ }` swallowing **every** error, including bugs and DB outages. | `src/utils/analyzeImage.js` | Narrowed to PGRST116 (not-found); other errors logged to console. |
| 7 | Cached `flagged` JSON returned as-is from Postgres. If an attacker can write to `scans` (which depends on RLS), they poison the cache for any victim with the same hash. | `src/utils/analyzeImage.js` + `supabase/migrations/...sql` | Client now schema-validates before trusting cached data. SQL migration enforces RLS — only `service_role` can write to `scans`. |

---

## 5b · The alert system — what it watches & when it pages you

All alerts go to `ALERT_EMAIL_TO`. Each fires AT MOST ONCE per day (the
`claim_alert` RPC dedupes via `INSERT ... ON CONFLICT DO NOTHING`).

| Alert | Threshold | Means | What you do |
|---|---|---|---|
| `daily_70` | 700 scans/day | Heads up — likely viral or organic growth | Watch the next hour. If still climbing, scale up. |
| `daily_90` | 900 scans/day | Within 100 scans of the cap | Decide: raise the cap, or let it block. |
| `daily_100` | 1,000 scans/day | **Hard block engaged.** New requests get 503. | Bump `DAILY_SCAN_CAP` in `_shared/alerts.ts`, redeploy. |
| `claude_429_spike` | 50 Claude 429s/day | Anthropic is rate-limiting US — quota burn or attack | Lower `DAILY_SCAN_CAP` immediately or kill the function. |
| `function_502_spike` | 50 errors/day | Claude or network is flaky | Check Anthropic status, redeploy if needed. |
| `rate_limit_block_spike` | 100 blocks/day | Lots of users (or one attacker) hit the per-IP limit | Probable distributed scrape — raise per-IP limit or add auth. |

**The hard block** at 100% of cap is the only non-email defense — it
returns `503 Service is at capacity` until the daily counter rolls over
at midnight UTC. **It's intentional**: if your alerts are silent (Resend
down, you're asleep), the cap still saves your wallet.

**To raise the cap**, edit `DAILY_SCAN_CAP` in
`supabase/functions/_shared/alerts.ts`, then redeploy. No DB change needed.

---

## 6 · What I did NOT do (your call to make)

- **TestSprite.** You picked Vitest+Playwright. If you ever want
  AI-generated black-box tests on top, sign up at testsprite.com and
  point it at this repo. The CI workflow won't conflict.
- **TypeScript migration.** ESLint catches a lot but TS would catch more
  in `analyzeImage.js`. Big lift; not on this branch.
- **Sentry / error reporting.** All my new error paths use `console.error`.
  You should pipe those into Sentry or a similar tool — otherwise nobody
  ever sees the rate-limit DB failures, 502s from Claude, etc.
- **CSP headers.** `vercel.json` has no `Content-Security-Policy`. Add one
  before launch if you care about XSS containment.
- **Content moderation on uploads.** Users can upload anything that's a
  valid JPEG/PNG/WebP under 5MB. If the app goes public, you'll want to
  scan for CSAM/abusive content (Cloudflare CSAM Scanning Tool is free).

---

## 7 · How I verified

Tests run cleanly in a clean install:

```
✓ tests/unit/alerts.test.js        (26 tests)
✓ tests/unit/validation.test.js    (28 tests)
✓ src/utils/analyzeImage.test.js   (6 tests)
✓ src/lib/hash.test.js             (7 tests)

Test Files  4 passed (4)
     Tests  67 passed (67)
```

Only stable-code tests remain. Component visual-regression tests were
intentionally cut so they don't fight you during UI iteration.

`npm run lint` → 0 errors, 0 warnings.
`npm run build` → succeeds, 629 KB main bundle (gzipped 193 KB — see
section 8 for the next thing to fix).

---

## 8 · Next things I'd hit if I were you

1. **Bundle is 629 KB** — framer-motion + gsap + lucide-react are heavy.
   Code-split the onboarding flow with `React.lazy`; ditch one of the two
   animation libraries (you're paying for both right now).
2. **No `prefers-reduced-motion` handling** in the components I read. The
   smoke E2E only checks the page renders — actual respect for the
   preference is on you.
3. **No 401 handling** on the analyze endpoint — anyone with the anon key
   (which is in the browser) can call it. Add Supabase Auth in front so
   abuse maps to a user account, not an IP.
