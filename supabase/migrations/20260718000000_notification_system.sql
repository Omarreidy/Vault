-- ============================================================
-- Server-side notification pipeline.
--
-- Three pieces:
--   1. profiles.timezone — IANA zone the client reports, so the
--      dispatcher computes each member's LOCAL hour (quiet hours,
--      send windows) instead of assuming one timezone.
--   2. notification_prefs — cross-device preference sync: category
--      toggles (same JSON shape the client stores locally), quiet
--      hours, and pause/resume.
--   3. notification_log — the delivery ledger. Every server push is
--      a row here first; the unique (user_id, dedupe_key) makes
--      duplicate sends impossible at the database level, and status
--      tracking gives retries, receipts, and a dead-letter queue.
--
-- The dispatcher (supabase/functions/push-dispatch) is invoked by
-- pg_cron every 15 minutes. The cron job authenticates with a shared
-- secret read from Supabase Vault — SETUP REQUIRED, see bottom.
-- ============================================================

alter table public.profiles
  add column if not exists timezone text;

-- ── Preference sync ─────────────────────────────────────────────

create table if not exists public.notification_prefs (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  -- Same shape the client persists: {moves, streak, score, weekly, insight}
  prefs        jsonb not null default '{}'::jsonb,
  quiet_start  smallint not null default 22 check (quiet_start between 0 and 23),
  quiet_end    smallint not null default 8  check (quiet_end between 0 and 23),
  -- Set → all server pushes suppressed until this instant (null = active).
  paused_until timestamptz,
  updated_at   timestamptz not null default now()
);

alter table public.notification_prefs enable row level security;

create policy notif_prefs_select_own on public.notification_prefs
  for select to authenticated using (user_id = auth.uid());
create policy notif_prefs_insert_own on public.notification_prefs
  for insert to authenticated with check (user_id = auth.uid());
create policy notif_prefs_update_own on public.notification_prefs
  for update to authenticated using (user_id = auth.uid());

-- ── Delivery ledger ─────────────────────────────────────────────

create table if not exists public.notification_log (
  id             bigint generated always as identity primary key,
  user_id        uuid not null references auth.users(id) on delete cascade,
  category       text not null,            -- dormant_7 | dormant_30 | tier_up | premium_welcome | manual
  dedupe_key     text not null,            -- e.g. 'tier:GOLD', 'dormant7:2026-W29'
  title          text not null,
  body           text not null,
  data           jsonb not null default '{}'::jsonb,
  -- queued → sent → delivered; failures: queued (retrying) → dead
  status         text not null default 'queued'
                   check (status in ('queued','sent','delivered','failed','dead')),
  attempts       int not null default 0,
  expo_ticket_id text,
  error          text,
  created_at     timestamptz not null default now(),
  sent_at        timestamptz,
  checked_at     timestamptz,
  unique (user_id, dedupe_key)
);

create index if not exists notification_log_status_idx
  on public.notification_log (status, created_at);
create index if not exists notification_log_user_sent_idx
  on public.notification_log (user_id, sent_at desc);

alter table public.notification_log enable row level security;
-- No client policies: only the service role (dispatcher) reads or writes.

-- ── Cron dispatch ───────────────────────────────────────────────
-- SETUP (one-time, run in the SQL editor before this does anything):
--   select vault.create_secret('<random-long-string>', 'cron_secret');
-- and set the same value for the function:
--   supabase secrets set CRON_SECRET=<random-long-string>

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Re-scheduling must be idempotent across repeated migrations.
do $$
begin
  perform cron.unschedule('vault-push-dispatch');
exception when others then
  null; -- job didn't exist yet
end $$;

select cron.schedule(
  'vault-push-dispatch',
  '*/15 * * * *',
  $$
  select net.http_post(
    url     := 'https://gvdfypehwmemootjizmd.supabase.co/functions/v1/push-dispatch',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret',
      coalesce((select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret' limit 1), '')
    ),
    body    := '{}'::jsonb
  );
  $$
);
