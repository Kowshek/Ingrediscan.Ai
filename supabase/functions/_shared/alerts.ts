// Lightweight alerting — daily-cap tracking + email via Resend.
// Designed to NEVER block the user request: counter writes use the result for
// hard-block decisions (so they're awaited), but email sends are always
// fire-and-forget. If Resend is down, the user still gets their analysis;
// the operator just doesn't get the ping.
//
// Alert design:
//   - Threshold alerts (70% / 90% / 100% of daily cap) fire ONCE per day
//     via the claim_alert RPC (atomic insert with ON CONFLICT DO NOTHING).
//   - "Spike" alerts (Claude 429s, function 502s) fire when daily count
//     crosses 50 — picked low so a small attack still trips it.

export const DAILY_SCAN_CAP = 1000

export const ALERT_THRESHOLDS = [
  { pct: 70, key: 'daily_70', subject: '[IngrediScan] Daily scans at 70%' },
  { pct: 90, key: 'daily_90', subject: '[IngrediScan] Daily scans at 90% — nearing cap' },
  { pct: 100, key: 'daily_100', subject: '[IngrediScan] DAILY CAP HIT — function blocking new requests' },
] as const

export const SPIKE_ALERTS = {
  claude_429: { threshold: 50, key: 'claude_429_spike', subject: '[IngrediScan] Claude rate-limiting us — possible viral or attack' },
  function_502: { threshold: 50, key: 'function_502_spike', subject: '[IngrediScan] High error rate on analyze function' },
  rate_limit_blocks: { threshold: 100, key: 'rate_limit_block_spike', subject: '[IngrediScan] Lots of rate-limit blocks — possible attack in progress' },
} as const

export type MetricsClient = {
  rpc(name: string, args: Record<string, unknown>): Promise<{
    data: unknown
    error: { message: string } | null
  }>
}

export type BumpResult = { newCount: number; oldCount: number }

// Atomic increment. Returns new + old count so the caller can detect threshold
// crossings without a second query.
export async function bumpMetric(
  client: MetricsClient,
  metric: string,
  amount = 1,
): Promise<BumpResult | null> {
  const { data, error } = await client.rpc('bump_usage_metric', {
    p_metric: metric,
    p_amount: amount,
  })
  if (error) {
    console.error('[alerts] bumpMetric failed:', error.message)
    return null
  }
  // Postgres returns table results as an array of rows.
  const row = Array.isArray(data) ? data[0] : null
  if (!row) return null
  return { newCount: row.new_count, oldCount: row.old_count }
}

// Returns true exactly once per (date, alert_key) — across all function
// instances and concurrent calls. False on subsequent calls.
export async function claimAlert(client: MetricsClient, alertKey: string): Promise<boolean> {
  const { data, error } = await client.rpc('claim_alert', { p_alert_key: alertKey })
  if (error) {
    console.error('[alerts] claimAlert failed:', error.message)
    return false
  }
  return data === true
}

// Pure threshold detector — exported separately so it's unit-testable.
// Returns the alert key/subject IFF this bump just crossed the threshold.
export function detectThresholdCrossing(
  bump: BumpResult,
  cap: number,
): typeof ALERT_THRESHOLDS[number] | null {
  for (const t of ALERT_THRESHOLDS) {
    const limit = Math.floor((cap * t.pct) / 100)
    if (bump.oldCount < limit && bump.newCount >= limit) return t
  }
  return null
}

// Pure spike detector — same pattern.
export function detectSpike(
  bump: BumpResult,
  alert: typeof SPIKE_ALERTS[keyof typeof SPIKE_ALERTS],
): boolean {
  return bump.oldCount < alert.threshold && bump.newCount >= alert.threshold
}

// ── Email transport (Resend) ────────────────────────────────────────────────

export type SendEmailDeps = {
  apiKey: string
  to: string
  from: string
  fetch?: typeof fetch
}

export async function sendAlertEmail(
  deps: SendEmailDeps,
  subject: string,
  body: string,
): Promise<{ ok: boolean; error?: string }> {
  const f = deps.fetch ?? fetch
  try {
    const res = await f('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${deps.apiKey}`,
      },
      body: JSON.stringify({
        from: deps.from,
        to: [deps.to],
        subject,
        text: body,
      }),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return { ok: false, error: `resend ${res.status}: ${text.slice(0, 200)}` }
    }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: (err as Error).message }
  }
}

// Convenience wrapper used by the edge function. NEVER throws — alerting
// problems should not break the user request. Returns silently on missing
// config so dev environments don't get spammed.
export async function fireAlert(
  client: MetricsClient,
  emailDeps: Partial<SendEmailDeps> | null,
  alert: { key: string; subject: string },
  body: string,
): Promise<void> {
  try {
    const claimed = await claimAlert(client, alert.key)
    if (!claimed) return // someone else (or earlier today) already fired this

    if (!emailDeps?.apiKey || !emailDeps.to || !emailDeps.from) {
      console.warn('[alerts] would have sent:', alert.subject, '— Resend env vars missing')
      return
    }

    const result = await sendAlertEmail(emailDeps as SendEmailDeps, alert.subject, body)
    if (!result.ok) {
      console.error('[alerts] email send failed:', result.error)
    }
  } catch (err) {
    console.error('[alerts] fireAlert error:', err)
  }
}
