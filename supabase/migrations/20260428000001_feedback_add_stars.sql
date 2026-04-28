-- Add stars column to feedback table (nullable numeric, e.g. 1.0 – 5.0 in 0.5 steps)
ALTER TABLE feedback
  ADD COLUMN IF NOT EXISTS stars NUMERIC(2,1)
  CHECK (stars IS NULL OR (stars >= 0.5 AND stars <= 5.0 AND (stars * 2) = FLOOR(stars * 2)));
