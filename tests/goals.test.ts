/**
 * Goal generation + progress math: determinism, no-bank users, zero/negative
 * inputs, rounding, completed/overfunded goals, degenerate targets, and the
 * idempotent auto-seed (double-call, corrupt storage, user goals preserved).
 */
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildGoalsFromPlaid,
  loadGoalsWithAutoSeed,
  loadGoals,
  saveGoals,
  getMonthsToGoal,
  getGoalProgress,
  Goal,
  GoalInputs,
} from '../src/services/goals';

const store: Map<string, string> = (globalThis as any).__asyncStore;
beforeEach(() => store.clear());

const inputs = (over: Partial<GoalInputs> = {}): GoalInputs => ({
  checking: 0,
  savings: 0,
  investments: 0,
  creditDebt: 0,
  estimatedMonthlyIncome: 0,
  monthlySpend: 0,
  ...over,
});

const goal = (over: Partial<Goal> = {}): Goal => ({
  id: 'g',
  title: 't',
  emoji: '🎯',
  target: 1000,
  current: 0,
  monthlyContribution: 100,
  color: '#fff',
  category: 'savings',
  ...over,
});

test('generator is pure and deterministic (same input → same goals)', () => {
  const i = inputs({ checking: 3000, savings: 9000, investments: 12000, creditDebt: 2500, estimatedMonthlyIncome: 6000, monthlySpend: 4000 });
  assert.deepEqual(buildGoalsFromPlaid(i), buildGoalsFromPlaid(i));
});

test('user with no connected bank data still gets sensible starter goals', () => {
  const goals = buildGoalsFromPlaid(inputs());
  assert.equal(goals.length, 2); // EF + first investment (no spend → no buffer goal)
  const ef = goals.find(g => g.id === 'auto_emergency')!;
  assert.equal(ef.target, 5000);
  assert.equal(ef.current, 0);
  assert.equal(ef.monthlyContribution, 0); // no surplus known — never invented
  const inv = goals.find(g => g.id === 'auto_invest')!;
  assert.equal(inv.target, 1000);
});

test('negative / non-finite inputs are sanitized to zero, not propagated', () => {
  const goals = buildGoalsFromPlaid(
    inputs({ checking: -500, savings: NaN, investments: -1, creditDebt: -300, estimatedMonthlyIncome: Infinity, monthlySpend: -50 }),
  );
  for (const g of goals) {
    assert.ok(Number.isFinite(g.target), `${g.id} target finite`);
    assert.ok(g.current >= 0 && g.monthlyContribution >= 0, `${g.id} non-negative`);
  }
});

test('surplus split (40/30 or 20/25) and debt-goal threshold at $100', () => {
  const withDebt = buildGoalsFromPlaid(inputs({ estimatedMonthlyIncome: 6000, monthlySpend: 4000, creditDebt: 2500, checking: 1000 }));
  const debtGoal = withDebt.find(g => g.id === 'auto_debt')!;
  assert.equal(debtGoal.target, 2500);
  assert.equal(debtGoal.monthlyContribution, 600); // 30% of $2k surplus
  assert.equal(withDebt.find(g => g.id === 'auto_emergency')!.monthlyContribution, 800); // 40%
  assert.equal(withDebt.find(g => g.id === 'auto_invest')!.monthlyContribution, 500);    // 25%

  const under = buildGoalsFromPlaid(inputs({ estimatedMonthlyIncome: 6000, monthlySpend: 4000, creditDebt: 99.99, checking: 1000 }));
  assert.ok(!under.find(g => g.id === 'auto_debt'), 'sub-$100 balances get a buffer goal instead');
  assert.ok(under.find(g => g.id === 'auto_buffer'));
});

test('emergency-fund target rounds UP to clean numbers; current caps at target', () => {
  const g = buildGoalsFromPlaid(inputs({ monthlySpend: 333, savings: 99999 }));
  const ef = g.find(x => x.id === 'auto_emergency')!;
  assert.equal(ef.target, 1750); // 5×333 = 1665 → next $250 step
  assert.equal(ef.current, 1750); // clamped, never >100% seeded
});

test('investment ladder picks the next milestone above current holdings', () => {
  const at = (invest: number) => buildGoalsFromPlaid(inputs({ investments: invest })).find(g => g.id === 'auto_invest')!.target;
  assert.equal(at(0), 1000);
  assert.equal(at(30000), 50000);
  assert.equal(at(1_000_000), 1_500_000); // above the ladder → 1.5× rounded
});

test('REGRESSION D8: months-to-goal is never negative; funded goals read 0', () => {
  assert.equal(getMonthsToGoal(goal({ target: 1000, current: 1000 })), 0);
  assert.equal(getMonthsToGoal(goal({ target: 1000, current: 2500 })), 0); // overfunded
  assert.equal(getMonthsToGoal(goal({ target: 1000, current: 0, monthlyContribution: 300 })), 4);
  assert.equal(getMonthsToGoal(goal({ target: 1000, current: 0, monthlyContribution: 0 })), 999);
  assert.equal(getMonthsToGoal(goal({ target: 1000, current: 1000, monthlyContribution: 0 })), 0);
});

test('REGRESSION D8: progress is always a finite 0–1 (no NaN/Infinity bars)', () => {
  assert.equal(getGoalProgress(goal({ target: 0, current: 0 })), 0);
  assert.equal(getGoalProgress(goal({ target: 0, current: 500 })), 0);
  assert.equal(getGoalProgress(goal({ target: -100, current: 50 })), 0);
  assert.equal(getGoalProgress(goal({ target: 1000, current: -50 })), 0);
  assert.equal(getGoalProgress(goal({ target: 1000, current: 500 })), 0.5);
  assert.equal(getGoalProgress(goal({ target: 1000, current: 99999 })), 1);
});

test('auto-seed happens exactly once and never touches user-created goals', async () => {
  const mine = goal({ id: 'user_goal', title: 'My boat' });
  await saveGoals([mine]);
  const summary = inputs({ estimatedMonthlyIncome: 5000, monthlySpend: 3000, savings: 2000 });

  const first = await loadGoalsWithAutoSeed(summary);
  assert.ok(first.find(g => g.id === 'user_goal'));
  assert.ok(first.find(g => g.id === 'auto_emergency'));

  const second = await loadGoalsWithAutoSeed(summary); // e.g. a second session
  assert.deepEqual(second, first); // idempotent — no duplicate goals

  const richer = await loadGoalsWithAutoSeed(inputs({ estimatedMonthlyIncome: 9000, monthlySpend: 2000 }));
  assert.deepEqual(richer, first); // seeded flag holds even with new bank data
});

test('no summary (bank never connected) never seeds; corrupt storage yields []', async () => {
  assert.deepEqual(await loadGoalsWithAutoSeed(null), []);
  store.set('@vault_goals_v1', '!!!not json');
  assert.deepEqual(await loadGoals(), []);
  store.set('@vault_goals_v1', JSON.stringify({ a: 1 })); // wrong shape
  assert.deepEqual(await loadGoals(), []);
});
