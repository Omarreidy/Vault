-- Append-only audit log of legal acceptances (Terms, Privacy, Disclosures).
-- One row per acceptance event; re-acceptance after a version bump adds a new
-- row. No update/delete policies exist by design — the trail is immutable
-- from the client's perspective.

create table if not exists public.legal_acceptances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  terms_version text not null,
  privacy_version text not null,
  disclosures_version text not null,
  app_version text not null,
  platform text not null,
  accepted_at timestamptz not null default now()
);

create index if not exists legal_acceptances_user_idx
  on public.legal_acceptances (user_id, accepted_at desc);

alter table public.legal_acceptances enable row level security;

create policy "users insert own acceptance"
  on public.legal_acceptances for insert
  with check (auth.uid() = user_id);

create policy "users read own acceptances"
  on public.legal_acceptances for select
  using (auth.uid() = user_id);
