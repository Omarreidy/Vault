-- ============================================================
-- Cohort social layer: real activity feed, reactions, referrals,
-- and RLS-safe cross-user aggregates.
--
-- profiles RLS only lets a user read their own row, so every
-- cross-user read (member counts, leaderboard rank, feed names)
-- goes through a security-definer function that exposes only
-- anonymized, non-sensitive fields.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Cohort activity feed
-- ------------------------------------------------------------
create table if not exists public.cohort_activity (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  type text not null check (type in (
    'move_complete', 'streak_milestone', 'tier_progress',
    'net_worth_badge', 'goal_hit', 'challenge_complete', 'joined'
  )),
  headline text not null check (char_length(headline) between 1 and 120),
  sub text check (sub is null or char_length(sub) <= 200),
  xp integer check (xp is null or (xp >= 0 and xp <= 1000)),
  created_at timestamptz default now()
);

create index if not exists cohort_activity_created_idx
  on public.cohort_activity (created_at desc);

alter table public.cohort_activity enable row level security;

create policy "Users can insert own activity"
  on public.cohort_activity for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Members can read activity"
  on public.cohort_activity for select
  to authenticated
  using (true);

create policy "Users can delete own activity"
  on public.cohort_activity for delete
  to authenticated
  using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 2. Reactions on activity
-- ------------------------------------------------------------
create table if not exists public.cohort_reactions (
  activity_id uuid references public.cohort_activity(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  label text not null check (label in ('locked_in', 'building', 'witnessed')),
  created_at timestamptz default now(),
  primary key (activity_id, user_id, label)
);

alter table public.cohort_reactions enable row level security;

create policy "Users can insert own reaction"
  on public.cohort_reactions for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can delete own reaction"
  on public.cohort_reactions for delete
  to authenticated
  using (auth.uid() = user_id);

create policy "Members can read reactions"
  on public.cohort_reactions for select
  to authenticated
  using (true);

-- ------------------------------------------------------------
-- 3. Referrals
-- ------------------------------------------------------------
alter table public.profiles
  add column if not exists referral_code text,
  add column if not exists referred_by uuid references auth.users(id) on delete set null,
  add column if not exists referred_at timestamptz,
  add column if not exists referral_xp integer not null default 0;

create unique index if not exists profiles_referral_code_idx
  on public.profiles (referral_code);

-- Code alphabet omits ambiguous characters (0/O, 1/I/L).
create or replace function public.generate_referral_code()
returns text
language plpgsql volatile
set search_path = public
as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  code text;
begin
  loop
    code := '';
    for i in 1..6 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from profiles where referral_code = code);
  end loop;
  return code;
end;
$$;

update public.profiles
  set referral_code = public.generate_referral_code()
  where referral_code is null;

-- New signups get a code immediately.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, referral_code)
  values (new.id, public.generate_referral_code());
  return new;
end;
$$;

-- ------------------------------------------------------------
-- 4. Shared helper: anonymize a display name to "First L."
-- ------------------------------------------------------------
create or replace function public.anon_name(raw text)
returns text
language sql immutable
as $$
  select case
    when coalesce(trim(raw), '') = '' then 'Vault member'
    else split_part(trim(raw), ' ', 1)
         || case when position(' ' in trim(raw)) > 0
                 then ' ' || upper(left(split_part(trim(raw), ' ', 2), 1)) || '.'
                 else '' end
  end;
$$;

-- ------------------------------------------------------------
-- 5. Cross-user aggregates
-- ------------------------------------------------------------
create or replace function public.member_count()
returns integer
language sql stable security definer
set search_path = public
as $$
  select count(*)::int from profiles where onboarding_complete;
$$;

create or replace function public.tier_member_count(cohort_tier text)
returns integer
language sql stable security definer
set search_path = public
as $$
  select count(*)::int from profiles
  where onboarding_complete and upper(tier) = upper(cohort_tier);
$$;

create or replace function public.get_leaderboard_stats()
returns json
language plpgsql stable security definer
set search_path = public
as $$
declare
  total integer;
  my_score integer;
  ahead integer;
begin
  select count(*)::int into total from profiles where onboarding_complete;
  select score into my_score from profiles where id = auth.uid();

  if coalesce(my_score, 0) = 0 or coalesce(total, 0) = 0 then
    return json_build_object(
      'total_members', coalesce(total, 0),
      'user_rank', null,
      'top_percent', null
    );
  end if;

  select count(*)::int into ahead
  from profiles
  where onboarding_complete and score > my_score;

  return json_build_object(
    'total_members', total,
    'user_rank', ahead + 1,
    'top_percent', greatest(1, round((ahead + 1)::numeric / total * 100)::int)
  );
end;
$$;

-- ------------------------------------------------------------
-- 6. Cohort feed (anonymized names + reaction aggregates)
-- ------------------------------------------------------------
create or replace function public.get_cohort_feed(feed_limit integer default 40)
returns table (
  id uuid,
  member_name text,
  is_me boolean,
  activity_type text,
  headline text,
  sub text,
  xp integer,
  created_at timestamptz,
  locked_in integer,
  building integer,
  witnessed integer,
  my_reactions text[]
)
language sql stable security definer
set search_path = public
as $$
  select
    a.id,
    case when a.user_id = auth.uid() then 'You'
         else public.anon_name(p.name) end as member_name,
    a.user_id = auth.uid() as is_me,
    a.type as activity_type,
    a.headline,
    a.sub,
    a.xp,
    a.created_at,
    count(*) filter (where r.label = 'locked_in')::int as locked_in,
    count(*) filter (where r.label = 'building')::int as building,
    count(*) filter (where r.label = 'witnessed')::int as witnessed,
    coalesce(
      array_agg(r.label) filter (where r.user_id = auth.uid()),
      '{}'
    ) as my_reactions
  from cohort_activity a
  left join profiles p on p.id = a.user_id
  left join cohort_reactions r on r.activity_id = a.id
  group by a.id, p.name
  order by a.created_at desc
  limit least(greatest(coalesce(feed_limit, 40), 1), 100);
$$;

-- ------------------------------------------------------------
-- 7. Referral RPCs
-- ------------------------------------------------------------
create or replace function public.redeem_referral_code(invite_code text)
returns json
language plpgsql volatile security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  reward constant integer := 75;
  referrer_id uuid;
  already uuid;
begin
  if me is null then
    return json_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select referred_by into already from profiles where id = me;
  if already is not null then
    return json_build_object('ok', false, 'error', 'already_redeemed');
  end if;

  select id into referrer_id from profiles
  where referral_code = upper(trim(invite_code));

  if referrer_id is null then
    return json_build_object('ok', false, 'error', 'invalid_code');
  end if;
  if referrer_id = me then
    return json_build_object('ok', false, 'error', 'own_code');
  end if;

  update profiles
    set referred_by = referrer_id,
        referred_at = now(),
        referral_xp = referral_xp + reward
    where id = me;

  update profiles
    set referral_xp = referral_xp + reward
    where id = referrer_id;

  return json_build_object('ok', true, 'xp', reward);
end;
$$;

-- Volatile (not stable) because it heals missing codes on read.
create or replace function public.get_referral_stats()
returns json
language plpgsql volatile security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  my_code text;
  my_xp integer;
  redeemed boolean;
  joined json;
begin
  if me is null then
    return json_build_object('ok', false);
  end if;

  select referral_code, coalesce(referral_xp, 0), referred_by is not null
    into my_code, my_xp, redeemed
    from profiles where id = me;

  -- A profile created before this migration's trigger update may
  -- have no code yet — generate one on first read.
  if my_code is null then
    my_code := public.generate_referral_code();
    update profiles set referral_code = my_code where id = me;
  end if;

  select coalesce(json_agg(json_build_object(
      'name', public.anon_name(p.name),
      'days_ago', greatest(0, extract(day from now() - coalesce(p.referred_at, p.created_at))::int)
    ) order by coalesce(p.referred_at, p.created_at) desc), '[]'::json)
    into joined
    from profiles p
    where p.referred_by = me;

  return json_build_object(
    'ok', true,
    'code', my_code,
    'xp_earned', my_xp,
    'redeemed', redeemed,
    'invites', joined
  );
end;
$$;

-- ------------------------------------------------------------
-- 8. Only signed-in users may call these functions
-- ------------------------------------------------------------
revoke execute on function public.member_count() from public, anon;
revoke execute on function public.tier_member_count(text) from public, anon;
revoke execute on function public.get_leaderboard_stats() from public, anon;
revoke execute on function public.get_cohort_feed(integer) from public, anon;
revoke execute on function public.redeem_referral_code(text) from public, anon;
revoke execute on function public.get_referral_stats() from public, anon;
revoke execute on function public.generate_referral_code() from public, anon;
revoke execute on function public.anon_name(text) from public, anon;

grant execute on function public.member_count() to authenticated;
grant execute on function public.tier_member_count(text) to authenticated;
grant execute on function public.get_leaderboard_stats() to authenticated;
grant execute on function public.get_cohort_feed(integer) to authenticated;
grant execute on function public.redeem_referral_code(text) to authenticated;
grant execute on function public.get_referral_stats() to authenticated;
