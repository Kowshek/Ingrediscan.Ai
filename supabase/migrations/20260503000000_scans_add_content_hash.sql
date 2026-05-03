-- Add content_hash column to scans table.
--
-- content_hash = sha256(sorted normalised ingredient names)
-- ingredient_hash (existing) = sha256(raw image bytes) — kept as primary cache key
--
-- The two-hash strategy lets us:
--   1. Fast-path cache: look up by ingredient_hash (imageHash) → same photo = instant hit
--   2. Dedup on insert: look up by content_hash → same product, different photo = no new row
--
-- Existing rows pre-migration were stored with ingredient_hash = contentHash (the broken
-- interim state). Those rows will have content_hash = NULL and will be treated as cache
-- misses until re-scanned, at which point a fresh row is inserted correctly.

ALTER TABLE scans
  ADD COLUMN IF NOT EXISTS content_hash TEXT;

-- Index for the dedup lookup (eq on content_hash before every new insert).
CREATE INDEX IF NOT EXISTS idx_scans_content_hash ON scans (content_hash);
