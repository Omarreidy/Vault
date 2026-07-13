-- ============================================================
-- D1 fix: make the money/entitlement columns on `profiles`
-- server-authoritative.
--
-- Before this migration, RLS let any authenticated user PATCH their own
-- profile row with the public anon key and set is_premium = true,
-- score = 1000, tier = 'BLACK', percentile, or referral_xp — bypassing the
-- paywall and topping the leaderboard. See qa/FINANCIAL_SPEC.md §12.
--
-- The RLS "update own profile" policy stays (users still edit name, etc.),
-- but a BEFORE UPDATE trigger now freezes the sensitive columns for every
-- caller EXCEPT:
--   * the service role (our edge functions: calculate-score,
--     submit-onboarding, revenuecat-webhook), and
--   * SECURITY DEFINER RPCs that opt in with `set local app.guard_bypass`
--     (the referral RPC, which legitimately writes referral_xp).
-- Frozen columns are silently reverted to their OLD values, so an ordinary
-- `update ... set name = $1` still succeeds — only the protected fields are
-- ignored when written by an untrusted caller.
-- ============================================================

create or replace function public.guard_profile_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  jwt_role text := coalesce(
    nullif(current_setting('request.jwt.claims', true), '')::json ->> 'role',
    ''
  );
  bypass text := coalesce(current_setting('app.guard_bypass', true), '');
begin
  -- Only PostgREST clients carrying an anon/authenticated JWT are untrusted.
  -- Everything else is a trusted writer and passes through unchanged:
  --   * service_role  → our edge functions
  --   * '' (no JWT)   → a direct DB connection (SQL editor, migrations, psql),
  --                     which already required privileged DB credentials
  --   * bypass = 'on' → a SECURITY DEFINER RPC that opted in (referral)
  if jwt_role not in ('authenticated', 'anon') or bypass = 'on' then
    return new;
  end if;

  -- Untrusted client: keep the protected columns exactly as they were,
  -- whatever the client tried to set. A plain `update ... set name = $1`
  -- still succeeds — only these fields are frozen.
  new.is_premium    := old.is_premium;
  new.premium_since := old.premium_since;
  new.score         := old.score;
  new.tier          := old.tier;
  new.tier_progress := old.tier_progress;
  new.percentile    := old.percentile;
  new.referral_xp   := old.referral_xp;
  new.referred_by   := old.referred_by;
  new.referred_at   := old.referred_at;
  return new;
end;
$$;

drop trigger if exists guard_profile_columns_trg on public.profiles;
create trigger guard_profile_columns_trg
  before update on public.profiles
  for each row execute function public.guard_profile_columns();

-- The referral RPC legitimately awards referral_xp to both parties. It runs
-- SECURITY DEFINER but under the CALLER's JWT claims (role = authenticated),
-- so it must explicitly opt past the guard for its own transaction.
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

  -- Trusted write: this RPC is the legitimate writer of referral_xp/referred_*.
  perform set_config('app.guard_bypass', 'on', true); -- local to this txn

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

revoke execute on function public.redeem_referral_code(text) from public, anon;
grant execute on function public.redeem_referral_code(text) to authenticated;
