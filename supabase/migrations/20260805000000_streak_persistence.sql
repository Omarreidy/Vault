-- Persist streaks server-side (2026-08-05).
--
-- Streaks lived only in AsyncStorage under '@vault_streak_days' and
-- '@vault_last_open_date'. That made them device-local: deleting the app,
-- switching phones, or restoring from a backup without app data silently reset
-- a streak to zero, and an iPhone and iPad kept separate counts. For a feature
-- whose whole weight is "don't break the chain", losing it to a phone upgrade
-- is the worst failure it can have.
--
-- public.profiles.streak_days already existed from the initial schema but was
-- never read or written by any code — the only in-app reference was the
-- similarly-named AsyncStorage key. This gives it a companion date column so
-- the server can tell a live streak from a stale one, and starts writing both.
--
-- streak_last_action holds the DEVICE's local calendar date, not UTC. Deriving
-- it from UTC wrongly broke streaks for anyone west of UTC acting in the
-- evening, since two consecutive local days can straddle a UTC day boundary.
-- src/services/streak.ts computes the string; the column just stores it.
--
-- Existing RLS on profiles already restricts select/update to auth.uid() = id,
-- so a member can only ever see or advance their own streak.
--
-- Safe to re-run.

alter table public.profiles
  add column if not exists streak_last_action date;

comment on column public.profiles.streak_days is
  'Consecutive days with at least one completed wealth move. Device-local calendar days.';

comment on column public.profiles.streak_last_action is
  'Device-local calendar date (YYYY-MM-DD) of the most recent completed move. A streak is live only when this is today or yesterday.';

-- Reading own streak is already covered by the existing "Users can read own
-- profile" policy; updating by "Users can update own profile". No new policies
-- are needed, and none are added — widening access here would expose one
-- member's activity to another.
