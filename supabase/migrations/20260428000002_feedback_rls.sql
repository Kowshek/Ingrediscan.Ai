-- ── Feedback table: RLS hardening ─────────────────────────────────────────
-- Same pattern as waitlist: anon key is browser-exposed, so lock to INSERT only.
-- Nobody should be able to read, update, or delete feedback rows via the client.

ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Drop any pre-existing policies clean
DROP POLICY IF EXISTS "feedback_anon_insert" ON feedback;
DROP POLICY IF EXISTS "feedback_public_insert" ON feedback;

-- Anon can INSERT only. score must be present (it always is — sent by the app).
-- stars and suggestion are both nullable (user may only do one or the other).
CREATE POLICY "feedback_anon_insert"
  ON feedback
  FOR INSERT
  TO anon
  WITH CHECK (
    score IS NOT NULL
  );

-- No SELECT / UPDATE / DELETE for anon — ever.
-- service_role (your dashboard) is unrestricted by default.
