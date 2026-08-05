/**
 * The Daily Vault Open economy: deterministic XP (no randomness, ever),
 * brief/close state boundaries, daily velocity snapshots + rollover,
 * action-based streaks, and the weekly recap copy.
 */
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  xpForMove, XP_BY_EFFORT, XP_PERSONALIZED_BONUS,
  buildBriefState, formatDelta, buildWeeklyRecapBody, DAILY_MOVES_TARGET,
  VAULT_CLOSED_HEADLINES, pickVaultClosedHeadline,
} from '../src/services/ritual';
import { loadStats, recordDailyScore, dailyDelta, hasRealDelta } from '../src/services/progressStats';
import { recordActionStreak, getStreak } from '../src/services/streak';

const store: Map<string, string> = (globalThis as any).__asyncStore;

// Streaks now read and write the server too, so each test starts signed out
// with no profile row — the offline case — and opts in via withRemoteProfile.
// Without this reset a remote streak would leak into every later test.
beforeEach(() => {
  store.clear();
  const mock: any = (globalThis as any).__supabaseMock;
  mock.auth.getSession = async () => ({ data: { session: null }, error: null });
  mock.from = () => ({
    select: () => mock.from(),
    update: () => mock.from(),
    eq: () => mock.from(),
    maybeSingle: async () => ({ data: null, error: null }),
    then: (res: any) => Promise.resolve({ data: null, error: null }).then(res),
  });
});

const localDay = (offset: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
};

// ── Deterministic XP ─────────────────────────────────────────────────────────

test('xpForMove is a fixed function of effort + provenance', () => {
  assert.equal(xpForMove({ effort: 'instant' }), XP_BY_EFFORT.instant);
  assert.equal(xpForMove({ effort: 'quick' }), XP_BY_EFFORT.quick);
  assert.equal(xpForMove({ effort: 'medium' }), XP_BY_EFFORT.medium);
  assert.equal(
    xpForMove({ effort: 'medium', personalized: true }),
    XP_BY_EFFORT.medium + XP_PERSONALIZED_BONUS,
  );
  // Same input → same output, every time.
  for (let i = 0; i < 10; i++) assert.equal(xpForMove({ effort: 'quick' }), XP_BY_EFFORT.quick);
});

test('xpForMove falls back to the quick rate for unknown efforts', () => {
  assert.equal(xpForMove({ effort: 'weird' as any }), XP_BY_EFFORT.quick);
});

// ── Brief / close state ──────────────────────────────────────────────────────

test('vault closes exactly at the daily target', () => {
  assert.equal(buildBriefState({ delta: 0, movesToday: DAILY_MOVES_TARGET - 1 }).closed, false);
  assert.equal(buildBriefState({ delta: 0, movesToday: DAILY_MOVES_TARGET }).closed, true);
  assert.equal(buildBriefState({ delta: 0, movesToday: DAILY_MOVES_TARGET + 5 }).closed, true);
});

test('streak is secured by the first move of the day', () => {
  assert.equal(buildBriefState({ delta: null, movesToday: 0 }).streakSecured, false);
  assert.equal(buildBriefState({ delta: null, movesToday: 1 }).streakSecured, true);
});

test('brief state clamps garbage move counts', () => {
  assert.equal(buildBriefState({ delta: 0, movesToday: -3 }).movesToday, 0);
  assert.equal(buildBriefState({ delta: 0, movesToday: 1.9 }).movesToday, 1);
});

test('formatDelta signs correctly, ASCII only (no glyphs that can render as tofu on-device)', () => {
  assert.equal(formatDelta(12), '+12');
  assert.equal(formatDelta(-4), '-4');
  assert.equal(formatDelta(0), '0');
  for (const s of [formatDelta(12), formatDelta(-4), formatDelta(0)]) {
    assert.match(s, /^[\x00-\x7F]*$/, `"${s}" must be pure ASCII`);
  }
});

test('vault-closed headline always comes from the known set', () => {
  assert.ok(VAULT_CLOSED_HEADLINES.length > 0);
  for (let i = 0; i < 25; i++) {
    assert.ok(VAULT_CLOSED_HEADLINES.includes(pickVaultClosedHeadline()));
  }
});

test('weekly recap copy leads with the gain, degrades gracefully', () => {
  assert.equal(buildWeeklyRecapBody(12), '+12 Wealth Velocity this week — see what moved.');
  assert.match(buildWeeklyRecapBody(0), /weekly wealth recap is ready/);
  assert.match(buildWeeklyRecapBody(), /weekly wealth recap is ready/);
});

// ── Daily velocity snapshot ──────────────────────────────────────────────────

test('first score ever becomes its own baseline (delta 0, not a fake jump)', async () => {
  const stats = await recordDailyScore(741);
  assert.equal(stats.prevDayScore, 741);
  assert.equal(stats.lastKnownScore, 741);
  assert.equal(dailyDelta(stats, 741), 0);
});

test('same-day score changes move the delta but not the baseline', async () => {
  await recordDailyScore(700);
  const stats = await recordDailyScore(712);
  assert.equal(stats.prevDayScore, 700);
  assert.equal(dailyDelta(stats, 712), 12);
});

test('day rollover promotes yesterday closing score to the new baseline', async () => {
  const yesterdayStats = await recordDailyScore(700);
  // Rewind the stored day stamp so loadStats sees a new day.
  store.set('@vault_stats_v1', JSON.stringify({ ...yesterdayStats, dayStamp: localDay(-1) }));
  const rolled = await loadStats();
  assert.equal(rolled.prevDayScore, 700);
  const stats = await recordDailyScore(715);
  assert.equal(dailyDelta(stats, 715), 15);
});

test('recordDailyScore anchors the weekly snapshot for feed-only users', async () => {
  const stats = await recordDailyScore(500);
  assert.equal(stats.weekStartScore, 500);
});

test('delta is null until any baseline exists; NaN scores are ignored', async () => {
  const empty = await loadStats();
  assert.equal(dailyDelta(empty, 700), null);
  const stats = await recordDailyScore(NaN);
  assert.equal(stats.lastKnownScore, null);
});

// ── Daily Open zero-state gating (hasRealDelta) ──────────────────────────────

test('zero-state: first day has no REAL delta yet (Daily Open shows the placeholder)', async () => {
  const empty = await loadStats();
  assert.equal(hasRealDelta(empty), false, 'no baseline → forming');
  const firstDay = await recordDailyScore(741);
  // The delta is a synthetic 0 on day one — must NOT count as a real movement.
  assert.equal(dailyDelta(firstDay, 741), 0);
  assert.equal(hasRealDelta(firstDay), false, 'synthetic day-one 0 is not a real delta');
});

test('zero-state: same-day intra-day changes on day one are still "forming"', async () => {
  await recordDailyScore(300);        // estimated on install
  const afterConnect = await recordDailyScore(480); // connect a bank same day
  assert.equal(hasRealDelta(afterConnect), false, 'no prior calendar day yet');
});

test('zero-state: a genuine calendar rollover makes the delta real', async () => {
  const day1 = await recordDailyScore(700);
  assert.equal(hasRealDelta(day1), false);
  // Rewind the day stamp so loadStats performs a real rollover.
  store.set('@vault_stats_v1', JSON.stringify({ ...day1, dayStamp: localDay(-1) }));
  const rolled = await loadStats();
  assert.equal(hasRealDelta(rolled), true, 'a real prior day now anchors the baseline');
  const day2 = await recordDailyScore(715);
  assert.equal(hasRealDelta(day2), true);
  assert.equal(dailyDelta(day2, 715), 15, 'and the real delta shows through');
});

test('zero-state: a genuine no-change day is still a REAL delta of 0 (not forming)', async () => {
  const day1 = await recordDailyScore(700);
  store.set('@vault_stats_v1', JSON.stringify({ ...day1, dayStamp: localDay(-1) }));
  const rolled = await loadStats();
  const day2 = await recordDailyScore(700); // identical score next day
  assert.equal(dailyDelta(day2, 700), 0);
  assert.equal(hasRealDelta(day2), true, 'held-steady is real info, not the placeholder');
});

test('zero-state: corrupt/legacy stored flag coerces to false (no crash)', async () => {
  store.set('@vault_stats_v1', JSON.stringify({ deltaBaselineReady: 'yes', prevDayScore: 500 }));
  const s = await loadStats();
  assert.equal(s.deltaBaselineReady, false, 'non-boolean coerces to false');
  assert.equal(hasRealDelta(s), false);
});

// ── Action-based streak ──────────────────────────────────────────────────────

test('first move of the day extends the streak; repeats are idempotent', async () => {
  const first = await recordActionStreak();
  assert.deepEqual(first, { streak: 1, extended: true });
  const second = await recordActionStreak();
  assert.deepEqual(second, { streak: 1, extended: false });
});

test('acting on consecutive days grows the streak', async () => {
  store.set('@vault_last_open_date', localDay(-1));
  store.set('@vault_streak_days', '5');
  const r = await recordActionStreak();
  assert.deepEqual(r, { streak: 6, extended: true });
  assert.equal(await getStreak(), 6);
});

test('a day with no moves breaks the streak', async () => {
  store.set('@vault_last_open_date', localDay(-3));
  store.set('@vault_streak_days', '9');
  assert.equal(await getStreak(), 0, 'read shows broken streak');
  const r = await recordActionStreak();
  assert.deepEqual(r, { streak: 1, extended: true }, 'next action restarts at 1');
});

test('corrupt streak storage never yields NaN', async () => {
  store.set('@vault_last_open_date', localDay(-1));
  store.set('@vault_streak_days', 'garbage');
  const r = await recordActionStreak();
  assert.equal(r.streak, 1);
});

// ── Server-persisted streaks ─────────────────────────────────────────────────
//
// Streaks used to live only in AsyncStorage, so reinstalling the app or moving
// to a new phone silently reset them to zero. profiles.streak_days /
// streak_last_action are now the durable copy, with the device as an offline
// cache. These cover the reconciliation between the two.

/** Sign a user in and serve/capture a profiles row through the supabase stub. */
function withRemoteProfile(row: { streak_days: number; streak_last_action: string | null } | null) {
  const writes: any[] = [];
  const mock: any = (globalThis as any).__supabaseMock;
  mock.auth.getSession = async () => ({
    data: { session: { user: { id: 'user-1' }, access_token: 't', expires_at: 9e9 } },
    error: null,
  });
  mock.from = () => {
    const api: any = {
      select: () => api,
      update: (patch: any) => { writes.push(patch); return api; },
      eq: () => api,
      maybeSingle: async () => ({ data: row, error: null }),
      then: (res: any) => Promise.resolve({ data: null, error: null }).then(res),
    };
    return api;
  };
  return writes;
}

test('a wiped device restores its streak from the server', async () => {
  // Nothing in AsyncStorage — the state after a reinstall or a new phone.
  withRemoteProfile({ streak_days: 12, streak_last_action: localDay(-1) });
  assert.equal(await getStreak(), 12, 'streak survives the wipe');
  const r = await recordActionStreak();
  assert.deepEqual(r, { streak: 13, extended: true }, 'and keeps growing from there');
});

test('the more recent copy wins, so a stale backup cannot undo a live streak', async () => {
  store.set('@vault_last_open_date', localDay(-9));
  store.set('@vault_streak_days', '40');            // old restore, long dead
  withRemoteProfile({ streak_days: 3, streak_last_action: localDay(0) }); // acted today
  assert.equal(await getStreak(), 3);
});

test('on the same day the longer streak is kept, so upgrading costs nobody a day', async () => {
  store.set('@vault_last_open_date', localDay(0));
  store.set('@vault_streak_days', '21');            // earned locally pre-upgrade
  withRemoteProfile({ streak_days: 0, streak_last_action: localDay(0) }); // server never written
  assert.equal(await getStreak(), 21);
});

test('completing a move writes the streak through to the server', async () => {
  store.set('@vault_last_open_date', localDay(-1));
  store.set('@vault_streak_days', '6');
  const writes = withRemoteProfile({ streak_days: 6, streak_last_action: localDay(-1) });
  const r = await recordActionStreak();
  assert.deepEqual(r, { streak: 7, extended: true });
  assert.deepEqual(
    writes.at(-1),
    { streak_days: 7, streak_last_action: localDay(0) },
    'server received the advanced streak',
  );
});

test('a broken streak stays broken even when the server agrees it is old', async () => {
  store.set('@vault_last_open_date', localDay(-4));
  store.set('@vault_streak_days', '30');
  withRemoteProfile({ streak_days: 30, streak_last_action: localDay(-4) });
  assert.equal(await getStreak(), 0, 'four days idle is not a live streak');
});
