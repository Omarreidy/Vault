-- ============================================================
-- Server-side rate limiting for the paid / quota'd edge functions
-- (concierge, financial-scanner, company-research, market-data,
-- market-news). Backed by Postgres so the limit is shared across
-- every edge worker/instance — an in-memory counter would reset on
-- deploy and not be shared between isolates.
--
-- Only the service role (our edge functions, which bypass RLS) ever
-- touches this table; there are no anon/authenticated policies and
-- EXECUTE on the function is revoked from public roles.
-- ============================================================

create table if not exists public.rate_limit_hits (
  id         bigint generated always as identity primary key,
  subject    text not null,          -- caller identity (user id)
  bucket     text not null,          -- endpoint name, e.g. 'concierge'
  created_at timestamptz not null default now()
);

create index if not exists rate_limit_hits_lookup_idx
  on public.rate_limit_hits (subject, bucket, created_at desc);

alter table public.rate_limit_hits enable row level security;
-- No policies: client roles (anon/authenticated) can neither read nor write.

-- Atomically records a call and reports whether the caller is within budget.
-- Returns true when the call is ALLOWED (under the limit), false when it should
-- be rejected. Prunes rows well past the window on each call so the table stays
-- small without a separate cron.
create or replace function public.check_rate_limit(
  p_subject text,
  p_bucket text,
  p_max int,
  p_window_seconds int
)
returns boolean
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  recent int;
begin
  -- Opportunistic cleanup of anything far outside the window.
  delete from rate_limit_hits
    where created_at < now() - make_interval(secs => greatest(p_window_seconds, 1) * 4);

  select count(*) into recent
    from rate_limit_hits
    where subject = p_subject
      and bucket = p_bucket
      and created_at > now() - make_interval(secs => greatest(p_window_seconds, 1));

  if recent >= p_max then
    return false;  -- over the limit; do NOT record this rejected call
  end if;

  insert into rate_limit_hits (subject, bucket) values (p_subject, p_bucket);
  return true;     -- allowed
end;
$$;

-- Only the service role may invoke this — clients must never self-report.
-- Revoking from PUBLIC also drops the default grant the service role inherited,
-- so re-grant it explicitly; our edge functions call this RPC as service_role.
revoke execute on function public.check_rate_limit(text, text, int, int)
  from public, anon, authenticated;
grant execute on function public.check_rate_limit(text, text, int, int)
  to service_role;
