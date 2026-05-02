-- ── Token usage + real cost tracking on scans ─────────────────────────────
-- Adds nullable columns for Claude API token counts and computed INR cost.
-- All columns are nullable — existing rows are unaffected.
-- New scans (after edge function deploy) will have accurate values.
-- No RLS changes needed: these columns are server-side only (service_role writes).

ALTER TABLE scans
  ADD COLUMN IF NOT EXISTS input_tokens          INTEGER,
  ADD COLUMN IF NOT EXISTS output_tokens         INTEGER,
  ADD COLUMN IF NOT EXISTS cache_creation_tokens INTEGER,
  ADD COLUMN IF NOT EXISTS cache_read_tokens     INTEGER,
  ADD COLUMN IF NOT EXISTS cost_inr              NUMERIC(10, 6);

-- Index on cost_inr so the dashboard can SUM efficiently as the table grows.
CREATE INDEX IF NOT EXISTS scans_cost_inr_idx ON scans (cost_inr)
  WHERE cost_inr IS NOT NULL;
