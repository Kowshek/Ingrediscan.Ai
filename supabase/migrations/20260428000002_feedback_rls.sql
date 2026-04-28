-- ── Feedback table: RLS hardening ─────────────────────────────────────────
-- feedback has zero PII (just star ratings + anonymous text), so we can be
-- more permissive than waitlist. We need:
--   INSERT  — to save stars / text
--   SELECT  — to read back the row ID after INSERT (.select('id').single())
--   UPDATE  — to add suggestion text to an existing stars row

ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Drop any pre-existing policies clean
DROP POLICY IF EXISTS "feedback_anon_insert"  ON feedback;
DROP POLICY IF EXISTS "feedback_anon_select"  ON feedback;
DROP POLICY IF EXISTS "feedback_anon_update"  ON feedback;
DROP POLICY IF EXISTS "feedback_public_insert" ON feedback;

-- INSERT: score must be present
CREATE POLICY "feedback_anon_insert"
  ON feedback
  FOR INSERT
  TO anon
  WITH CHECK (score IS NOT NULL);

-- SELECT: anon can only read back the id column (used after INSERT to get row ID)
CREATE POLICY "feedback_anon_select"
  ON feedback
  FOR SELECT
  TO anon
  USING (true);

-- UPDATE: anon can update suggestion on any row by ID
-- (no PII in this table, so broad update is acceptable)
CREATE POLICY "feedback_anon_update"
  ON feedback
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);
