-- ============================================================================
-- Usage metrics + alert dedupe
-- ============================================================================
-- Backs the daily-cap hard block + email alerts on the analyze-ingredients
-- edge function. Atomic counter increment via RPC so the threshold check
-- can't race with concurrent requests.
-- Apply with: supabase db push
-- ----------------------------------------------------------------------------

create table if not exists public.usage_metrics (
    date    date    not null,
    metric  text    not null,
    count   integer not null default 0,
    primary key (date, metric)
);

create index if not exists usage_metrics_date_idx on public.usage_metrics (date desc);

alter table public.usage_metrics enable row level security;
revoke all on public.usage_metrics from anon, authenticated;

-- Dedupe so we never send the same alert twice in one day.
create table if not exists public.alerts_sent (
    date         date        not null,
    alert_key    text        not null,
    sent_at      timestamptz not null default now(),
    primary key (date, alert_key)
);

alter table public.alerts_sent enable row level security;
revoke all on public.alerts_sent from anon, authenticated;

-- ── bump_usage_metric ───────────────────────────────────────────────────────
-- Atomic increment, returns the NEW count and the OLD count so the caller
-- can detect "we just crossed threshold X" without a separate query.

create or replace function public.bump_usage_metric(
    p_metric  text,
    p_amount  integer default 1
)
returns table (new_count integer, old_count integer)
language plpgsql
security definer
set search_path = public
as $$
declare
    v_today    date := current_date;
    v_old      integer;
    v_new      integer;
begin
    select count into v_old
    from public.usage_metrics
    where date = v_today and metric = p_metric;

    insert into public.usage_metrics (date, metric, count)
    values (v_today, p_metric, p_amount)
    on conflict (date, metric) do update
        set count = public.usage_metrics.count + p_amount
    returning public.usage_metrics.count into v_new;

    return query select v_new, coalesce(v_old, 0);
end;
$$;

revoke all on function public.bump_usage_metric(text, integer)
    from anon, authenticated, public;
grant execute on function public.bump_usage_metric(text, integer) to service_role;

-- ── claim_alert ─────────────────────────────────────────────────────────────
-- Returns true if THIS caller is the one allowed to send the alert today.
-- All other callers get false. Prevents duplicate sends across instances.

create or replace function public.claim_alert(p_alert_key text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
    v_inserted boolean;
begin
    insert into public.alerts_sent (date, alert_key)
    values (current_date, p_alert_key)
    on conflict (date, alert_key) do nothing;

    get diagnostics v_inserted = row_count;
    return v_inserted;
end;
$$;

revoke all on function public.claim_alert(text) from anon, authenticated, public;
grant execute on function public.claim_alert(text) to service_role;

comment on table public.usage_metrics is
    'Daily counters for the analyze-ingredients function. Service-role only.';
comment on table public.alerts_sent is
    'Dedupe table — one row per alert per day. Service-role only.';
