-- ── rate_limits table ────────────────────────────────────────────────────────
-- Backs the bump_rate_limit RPC used by the analyze-ingredients edge function.
-- Each row tracks a sliding-window counter keyed on an arbitrary string
-- (e.g. "analyze:<hashed-ip>"). The service-role client writes to this table;
-- anon/authenticated users have no access.

CREATE TABLE IF NOT EXISTS rate_limits (
  key          text        PRIMARY KEY,
  count        integer     NOT NULL DEFAULT 1,
  window_start timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- No policies: service role bypasses RLS entirely.
-- Anon and authenticated roles get zero access by default.

-- ── bump_rate_limit RPC ───────────────────────────────────────────────────────
-- Atomically increments (or resets) the counter for a given key.
-- Returns:
--   allowed  boolean  — true if the request is within the limit
--   remaining integer — how many requests are left in the current window
--   reset_at text     — ISO-8601 timestamp when the window resets
--
-- Called with service-role credentials so it runs as the superuser context
-- and can write to rate_limits regardless of RLS.
CREATE OR REPLACE FUNCTION bump_rate_limit(
  p_key            text,
  p_limit          integer,
  p_window_seconds integer
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count        integer;
  v_window_start timestamptz;
  v_window_end   timestamptz;
  v_now          timestamptz := now();
BEGIN
  -- Upsert: insert on first request, update on subsequent ones.
  INSERT INTO rate_limits (key, count, window_start)
  VALUES (p_key, 1, v_now)
  ON CONFLICT (key) DO UPDATE
    SET
      -- If the existing window has expired, reset to a fresh window.
      -- Otherwise increment the counter.
      count        = CASE
                       WHEN rate_limits.window_start + (p_window_seconds || ' seconds')::interval <= v_now
                       THEN 1
                       ELSE rate_limits.count + 1
                     END,
      window_start = CASE
                       WHEN rate_limits.window_start + (p_window_seconds || ' seconds')::interval <= v_now
                       THEN v_now
                       ELSE rate_limits.window_start
                     END
  RETURNING count, window_start
  INTO v_count, v_window_start;

  v_window_end := v_window_start + (p_window_seconds || ' seconds')::interval;

  RETURN json_build_object(
    'allowed',   v_count <= p_limit,
    'remaining', GREATEST(0, p_limit - v_count),
    'reset_at',  v_window_end
  );
END;
$$;

-- Revoke public execute, grant only to service_role (edge functions use this).
REVOKE EXECUTE ON FUNCTION bump_rate_limit(text, integer, integer) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION bump_rate_limit(text, integer, integer) TO service_role;
