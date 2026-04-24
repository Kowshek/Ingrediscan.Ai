-- ============================================================================
-- Rate limits + scans table RLS hardening
-- ============================================================================
-- Apply with: supabase db push
-- ----------------------------------------------------------------------------

-- ── rate_limits ─────────────────────────────────────────────────────────────
-- Replaces the in-memory Map() that was previously used in the analyze-
-- ingredients edge function. That implementation reset on every cold start
-- and was per-instance, making it trivially bypassable.

create table if not exists public.rate_limits (
    key          text primary key,
    count        integer     not null default 0,
    reset_at     timestamptz not null,
    updated_at   timestamptz not null default now()
);

create index if not exists rate_limits_reset_at_idx
    on public.rate_limits (reset_at);

alter table public.rate_limits enable row level security;

-- No grants to anon / authenticated. Only the service role (used inside the
-- edge function) may read/write. There is no policy because there should be
-- no row-level access for end users at all.
revoke all on public.rate_limits from anon, authenticated;

-- ── bump_rate_limit RPC ─────────────────────────────────────────────────────
-- Atomic increment-or-reset. SECURITY DEFINER so the edge function can call
-- it via the service role without per-call permissions wrangling. Returns
-- whether the request is allowed plus the window reset time.

create or replace function public.bump_rate_limit(
    p_key             text,
    p_limit           integer,
    p_window_seconds  integer
)
returns table (allowed boolean, remaining integer, reset_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
    v_now        timestamptz := now();
    v_reset_at   timestamptz;
    v_count      integer;
begin
    insert into public.rate_limits (key, count, reset_at, updated_at)
    values (p_key, 1, v_now + make_interval(secs => p_window_seconds), v_now)
    on conflict (key) do update
        set count      = case
                            when public.rate_limits.reset_at < v_now then 1
                            else public.rate_limits.count + 1
                         end,
            reset_at   = case
                            when public.rate_limits.reset_at < v_now
                                then v_now + make_interval(secs => p_window_seconds)
                            else public.rate_limits.reset_at
                         end,
            updated_at = v_now
    returning public.rate_limits.count, public.rate_limits.reset_at
        into v_count, v_reset_at;

    return query select
        v_count <= p_limit,
        greatest(0, p_limit - v_count),
        v_reset_at;
end;
$$;

revoke all on function public.bump_rate_limit(text, integer, integer)
    from anon, authenticated, public;
grant execute on function public.bump_rate_limit(text, integer, integer)
    to service_role;

-- ── scans table RLS ─────────────────────────────────────────────────────────
-- This table caches AI analysis results keyed by ingredient_hash. If anon
-- users can write to it, ANYONE can poison the cache for a given hash and
-- the next victim sees attacker-controlled JSON rendered in their UI.
--
-- Lock it down: only service_role (used inside the edge function) can write.
-- Anon may read for client-side cache lookups in analyzeImage.js, but the
-- client also re-validates the row shape before trusting it (defense-in-depth).
--
-- If the `scans` table doesn't exist yet because you created it in the
-- dashboard, comment out the `if exists` guard and run the policy block
-- explicitly after you create the table.

do $$
begin
    if to_regclass('public.scans') is not null then
        execute 'alter table public.scans enable row level security';

        execute 'drop policy if exists "scans read for anon" on public.scans';
        execute $p$create policy "scans read for anon"
                    on public.scans
                    for select
                    to anon, authenticated
                    using (true)$p$;

        execute 'drop policy if exists "scans write service_role only" on public.scans';
        execute $p$create policy "scans write service_role only"
                    on public.scans
                    for all
                    to service_role
                    using (true)
                    with check (true)$p$;

        -- Explicitly REVOKE write privileges from anon/authenticated so that
        -- even if someone adds a permissive policy later, the role-level
        -- grants still block them.
        execute 'revoke insert, update, delete on public.scans from anon, authenticated';
        execute 'grant select on public.scans to anon, authenticated';
    end if;
end$$;

comment on table public.rate_limits is
    'Backing store for the analyze-ingredients edge function rate limiter. '
    'Service-role only — never grant access to anon/authenticated.';
