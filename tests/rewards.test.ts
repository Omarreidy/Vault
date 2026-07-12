/**
 * Achievements + challenges: exact threshold boundaries, bank-gated badges,
 * negative net worth, missing bank data, unlock-timestamp persistence, and
 * the documented-unearnable Debt Slayer badge (D13).
 */
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateAchievements,
  getAchievements,
  buildAchievementContext,
  liquidCash,
  netWorthOf,
  AchievementContext,
} from '../src/services/achievements';
import { evaluateChallenges, ChallengeContext } from '../src/services/challenges';

const store: Map<string, string> = (globalThis as any).__asyncStore;
beforeEach(() => store.clear());

const ctx = (over: Partial<AchievementContext> = {}): AchievementContext => ({
  streak: 0,
  score: 0,
  movesActed: 0,
  plaidConnected: false,
  ...over,
});

const byId = (list: ReturnType<typeof evaluateAchievements>, id: string) => list.find(a => a.id === id)!;

test('score-tier badges unlock at exact thresholds (199/200 … 899/900)', () => {
  for (const [id, threshold] of [['a3', 200], ['a4', 450], ['a7', 700], ['a10', 900]] as const) {
    assert.equal(byId(evaluateAchievements(ctx({ score: threshold - 1 })), id).unlocked, false, `${id} below`);
    assert.equal(byId(evaluateAchievements(ctx({ score: threshold })), id).unlocked, true, `${id} at`);
  }
});

test('streak badges at 7/30/100; progress clamps at target', () => {
  const six = evaluateAchievements(ctx({ streak: 6 }));
  assert.equal(byId(six, 'a5').unlocked, false);
  assert.equal(byId(six, 'a5').progress, 6);
  const big = evaluateAchievements(ctx({ streak: 500 }));
  assert.equal(byId(big, 'a5').unlocked, true);
  assert.equal(byId(big, 'a12').unlocked, true);
  assert.equal(byId(big, 'a12').progress, 100); // clamped for the progress bar
});

test('money badges require a connected bank — profile numbers alone never unlock them', () => {
  const rich = evaluateAchievements(ctx({ plaidConnected: false, savings: 50000, netWorth: 500000 }));
  assert.equal(byId(rich, 'a6').unlocked, false);
  assert.equal(byId(rich, 'a11').unlocked, false);
  const connected = evaluateAchievements(ctx({ plaidConnected: true, savings: 10000, netWorth: 100000 }));
  assert.equal(byId(connected, 'a6').unlocked, true);
  assert.equal(byId(connected, 'a11').unlocked, true);
  assert.equal(byId(evaluateAchievements(ctx({ plaidConnected: true, savings: 9999.99 })), 'a6').unlocked, false);
});

test('10K Club measures liquid cash (checking + savings), by documented intent', () => {
  assert.equal(liquidCash({ checking: 12000, savings: 0 }), 12000);
  assert.equal(liquidCash(null), undefined);
  const c = buildAchievementContext({ streak: 0, score: 0, movesActed: 0, plaidConnected: true, plaid: { checking: 6000, savings: 4000 } });
  assert.equal(byId(evaluateAchievements(c), 'a6').unlocked, true);
});

test('net worth for badges is canonical and can be negative', () => {
  assert.equal(netWorthOf({ checking: 1000, savings: 2000, investments: 3000, creditDebt: 500 }), 5500);
  assert.equal(netWorthOf({ creditDebt: 9000 }), -9000);
  const under = buildAchievementContext({ streak: 0, score: 0, movesActed: 0, plaidConnected: true, plaid: { creditDebt: 9000 } });
  assert.equal(byId(evaluateAchievements(under), 'a11').unlocked, false);
});

test('PINNED D13: Debt Slayer is unearnable — nothing ever supplies debtPaid', () => {
  const maxed = buildAchievementContext({
    streak: 365, score: 1000, movesActed: 999, plaidConnected: true,
    plaid: { checking: 1e6, savings: 1e6, investments: 1e6, creditDebt: 0 },
  });
  assert.equal(byId(evaluateAchievements(maxed), 'a9').unlocked, false);
});

test('unlock timestamps persist on first unlock and never move afterwards', async () => {
  const first = await getAchievements(ctx({ streak: 7 }));
  const t1 = byId(first as any, 'a5').unlockedAt!;
  assert.ok(t1 instanceof Date);
  const again = await getAchievements(ctx({ streak: 30 }));
  assert.equal(byId(again as any, 'a5').unlockedAt!.getTime(), t1.getTime());
});

const cctx = (over: Partial<ChallengeContext> = {}): ChallengeContext => ({
  streak: 0, movesToday: 0, movesWeek: 0, scoreVisitedToday: false, conciergeUsedToday: false, weeklyVelocityGain: 0, ...over,
});

test('challenges complete exactly at target; progress clamps both ways', () => {
  const { daily, weekly } = evaluateChallenges(cctx({ movesToday: 5, movesWeek: -2, weeklyVelocityGain: 99, streak: 7 }));
  const d2 = daily.find(c => c.id === 'd2')!;
  assert.equal(d2.progress, 2); // clamped to target
  assert.equal(d2.completed, true);
  const w2 = weekly.find(c => c.id === 'w2')!;
  assert.equal(w2.progress, 0); // negative clamps to 0
  assert.equal(w2.completed, false);
  const w3 = weekly.find(c => c.id === 'w3')!;
  assert.equal(w3.completed, false); // 99 < 100
  assert.equal(weekly.find(c => c.id === 'w1')!.completed, true);
  const done = evaluateChallenges(cctx({ weeklyVelocityGain: 100 })).weekly.find(c => c.id === 'w3')!;
  assert.equal(done.completed, true);
});
