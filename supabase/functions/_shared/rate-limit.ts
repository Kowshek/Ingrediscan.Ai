// Postgres-backed rate limiter. Replaces the previous in-memory Map approach,
// which was per-instance and reset on cold start — i.e. effectively cosmetic.
// This implementation uses a `rate_limits` table with a server-side `bump`
// function so the count + reset logic happens atomically on the database side.
//
// Required: a Supabase service-role client (NOT the anon client). The
// service role bypasses RLS so the function can write counters even though
// the table is locked down to anon/authenticated users.

export type RateLimitClient = {
  rpc(name: string, args: Record<string, unknown>): Promise<{
    data: { allowed: boolean; remaining: number; reset_at: string } | null
    error: { message: string } | null
  }>
}

export type RateLimitResult =
  | { allowed: true; remaining: number; resetAt: Date }
  | { allowed: false; resetAt: Date; retryAfterSeconds: number }

export async function checkRateLimit(
  client: RateLimitClient,
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const { data, error } = await client.rpc('bump_rate_limit', {
    p_key: key,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  })

  // Fail-OPEN on infrastructure error (DB unavailable). The alternative is
  // failing closed, which would take the entire app down whenever Postgres
  // burps. Log + alert separately.
  if (error || !data) {
    console.error('[rate-limit] db error, failing open:', error?.message)
    const resetAt = new Date(Date.now() + windowSeconds * 1000)
    return { allowed: true, remaining: 0, resetAt }
  }

  const resetAt = new Date(data.reset_at)
  if (data.allowed) {
    return { allowed: true, remaining: data.remaining, resetAt }
  }
  const retryAfterSeconds = Math.max(1, Math.ceil((resetAt.getTime() - Date.now()) / 1000))
  return { allowed: false, resetAt, retryAfterSeconds }
}
