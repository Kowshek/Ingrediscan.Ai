-- ── Waitlist table: RLS hardening ─────────────────────────────────────────
-- The anon key is exposed in the browser bundle (VITE_ prefix).
-- Without RLS anyone with the key can read/delete every waitlist entry.
-- This migration locks it down to insert-only for anonymous users.

-- 1. Enable RLS (no-op if already on, safe to run twice)
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

-- 2. Drop any existing policies so we start clean
DROP POLICY IF EXISTS "waitlist_anon_insert" ON waitlist;
DROP POLICY IF EXISTS "waitlist_anon_select" ON waitlist;
DROP POLICY IF EXISTS "waitlist_public_insert" ON waitlist;
DROP POLICY IF EXISTS "waitlist_public_select" ON waitlist;

-- 3. Allow anyone (including unauthenticated browser clients) to INSERT only.
--    This is intentional — the form is public.
CREATE POLICY "waitlist_anon_insert"
  ON waitlist
  FOR INSERT
  TO anon
  WITH CHECK (
    -- Basic server-side guards: name and email must be present, email must look valid
    name  IS NOT NULL AND length(trim(name))  > 0 AND
    email IS NOT NULL AND email LIKE '%@%.%'
  );

-- 4. No SELECT, UPDATE, or DELETE for anon — ever.
--    Authenticated (service_role) access is unrestricted by default in Supabase,
--    so your dashboard / admin queries still work fine.
