/**
 * Streaks + daily/weekly stat windows across date boundaries: month-end,
 * year-end, leap day, and — the regression that motivated the fix — evenings
 * in timezones west of UTC (suite runs under TZ=America/New_York).
 * Also covers idempotent same-day updates ("two sessions"), corrupt storage,
 * and weekly velocity snapshots.
 */
import { test, mock, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { updateStreak, getStreak } from '../src/services/streak';
import { loadStats, recordMove, addXP, recordScoreVisit, weeklyVelocityGain } from '../src/services/progressStats';

const store: Map<string, string> = (globalThis as any).__asyncStore;

function at(iso: string) {
  mock.timers.reset();
  mock.timers.enable({ apis: ['Date'], now: new Date(iso).getTime() });
}

beforeEach(() => store.clear());
afterEach(() => mock.timers.reset());

// ── streaks ──────────────────────────────────────────────────────────────────

test('first open starts a 1-day streak; same-day re-opens are idempotent', async () => {
  at('2026-01-15T09:00:00-05:00');
  assert.equal(await updateStreak(), 1);
  assert.equal(await updateStreak(), 1); // second session, same day
  at('2026-01-15T23:59:00-05:00');
  assert.equal(await updateStreak(), 1); // late-night open, still same local day
  assert.equal(await getStreak(), 1);
});

test('REGRESSION D3: consecutive local evenings across the UTC midnight keep the streak', async () => {
  // Mon 6:00 pm EST = 23:00 UTC Monday; Tue 7:30 pm EST = 00:30 UTC *Wednesday*.
  // The old UTC-based day math saw a skipped day here and reset to 1.
  at('2026-03-02T18:00:00-05:00');
  assert.equal(await updateStreak(), 1);
  at('2026-03-03T19:30:00-05:00');
  assert.equal(await updateStreak(), 2);
});

test('streak increments across month-end, year-end, and leap day', async () => {
  at('2026-01-31T20:00:00-05:00');
  assert.equal(await updateStreak(), 1);
  at('2026-02-01T20:00:00-05:00');
  assert.equal(await updateStreak(), 2); // month-end

  store.clear();
  at('2026-12-31T21:00:00-05:00');
  assert.equal(await updateStreak(), 1);
  at('2027-01-01T21:00:00-05:00');
  assert.equal(await updateStreak(), 2); // year-end

  store.clear();
  at('2028-02-28T12:00:00-05:00');
  assert.equal(await updateStreak(), 1);
  at('2028-02-29T12:00:00-05:00');
  assert.equal(await updateStreak(), 2); // leap day exists in 2028
  at('2028-03-01T12:00:00-05:00');
  assert.equal(await updateStreak(), 3);
});

test('skipping a day resets the streak to 1; getStreak reports 0 when broken', async () => {
  at('2026-05-01T10:00:00-04:00');
  await updateStreak();
  at('2026-05-02T10:00:00-04:00');
  assert.equal(await updateStreak(), 2);
  at('2026-05-04T10:00:00-04:00'); // skipped May 3
  assert.equal(await getStreak(), 0); // read-only view sees the broken streak
  assert.equal(await updateStreak(), 1);
});

test('corrupt stored streak recovers instead of persisting NaN', async () => {
  at('2026-05-01T10:00:00-04:00');
  store.set('@vault_streak_days', 'not-a-number');
  store.set('@vault_last_open_date', '2026-04-30');
  const n = await updateStreak();
  assert.equal(n, 1); // corrupt count treated as 0, then incremented
  assert.equal(await getStreak(), 1);
});

test('two interleaved sessions on the same day converge on the same streak', async () => {
  at('2026-06-10T08:00:00-04:00');
  await updateStreak();
  at('2026-06-11T08:00:00-04:00');
  // Both sessions read-then-write concurrently; last write wins with equal values.
  const [a, b] = await Promise.all([updateStreak(), updateStreak()]);
  assert.equal(Math.max(a, b), 2);
  assert.equal(store.get('@vault_streak_days'), '2');
});

// ── daily / weekly stat windows ──────────────────────────────────────────────

test('REGRESSION D3: daily counters survive past 7 pm ET (old UTC reset wiped them)', async () => {
  at('2026-03-02T18:00:00-05:00'); // Mon 6 pm ET (UTC Mon 23:00)
  await recordMove(10);
  at('2026-03-02T20:00:00-05:00'); // Mon 8 pm ET (UTC Tue 01:00 — old code reset here)
  const s = await loadStats();
  assert.equal(s.movesActedToday, 1);
  assert.equal(s.xpTotal, 10);
});

test('daily counters reset on the next local day; lifetime totals persist', async () => {
  at('2026-03-02T18:00:00-05:00');
  await recordMove(10);
  await recordMove(5);
  at('2026-03-03T08:00:00-05:00');
  const s = await loadStats();
  assert.equal(s.movesActedToday, 0);
  assert.equal(s.movesActedTotal, 2);
  assert.equal(s.xpTotal, 15);
  assert.equal(s.movesActedWeek, 2); // same Mon-anchored week
});

test('weekly counters reset on Monday (local), not mid-Sunday-evening UTC', async () => {
  at('2026-03-06T19:00:00-05:00'); // Friday evening
  await recordMove(20);
  await recordScoreVisit(500);
  at('2026-03-08T19:00:00-04:00'); // Sunday evening (UTC Monday already)
  let s = await loadStats();
  assert.equal(s.movesActedWeek, 1); // still the same local week
  assert.equal(s.weekStartScore, 500);
  at('2026-03-09T07:00:00-04:00'); // Monday morning
  s = await loadStats();
  assert.equal(s.movesActedWeek, 0);
  assert.equal(s.xpWeek, 0);
  assert.equal(s.weekStartScore, null); // re-snapshots on next score visit
  assert.equal(s.movesActedTotal, 1);
});

test('weekly velocity gain: snapshot at first visit, never negative', async () => {
  at('2026-03-02T10:00:00-05:00');
  await recordScoreVisit(520);
  let s = await recordScoreVisit(999); // later visit must not move the snapshot
  assert.equal(s.weekStartScore, 520);
  assert.equal(weeklyVelocityGain(s, 585), 65);
  assert.equal(weeklyVelocityGain(s, 500), 0); // score dropped → gain floors at 0
  assert.equal(weeklyVelocityGain({ ...s, weekStartScore: null }, 585), 0);
});

test('corrupt stored stats coerce to safe numbers (no NaN, no string concat)', async () => {
  at('2026-03-02T10:00:00-05:00');
  store.set(
    '@vault_stats_v1',
    JSON.stringify({ movesActedTotal: '7', xpTotal: 'garbage', xpWeek: -3, weekStartScore: 'x', dayStamp: '2026-03-02', weekStamp: '2026-03-02' }),
  );
  const s = await recordMove(10);
  assert.equal(s.movesActedTotal, 8); // '7' coerced to 7, then +1 — not '71'
  assert.equal(s.xpTotal, 10);        // garbage → 0, then +10 — not NaN
  assert.equal(s.xpWeek, 10);         // negative floor → 0, then +10
  assert.equal((await loadStats()).weekStartScore, null);
});

test('unparseable stats JSON falls back to a fresh window', async () => {
  at('2026-03-02T10:00:00-05:00');
  store.set('@vault_stats_v1', '{{{');
  const s = await loadStats();
  assert.equal(s.movesActedTotal, 0);
  assert.equal(s.dayStamp, '2026-03-02');
});
