/**
 * Client score math: tier boundaries/progress, points-to-next-tier, the
 * client copy of the velocity formula (parity with server clamps), the
 * onboarding estimate (bounds over every answer combination), and the FI
 * trajectory (zero income, zero expenses, negative net worth, huge values).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  getTierFromScore,
  getTierProgress,
  getNextTier,
  getPointsToNextTier,
  calculateVelocityScore,
} from '../src/services/velocity';
import { tierFromScore } from '../src/services/plaidMath';
import { calculateOnboardingScore } from '../src/services/onboarding';
import { computeTrajectory, DEFAULT_TRAJECTORY_INPUTS } from '../src/services/trajectory';

// ── tiers ────────────────────────────────────────────────────────────────────

test('client tier mapping is the shared server mapping for every score 0–1000', () => {
  for (let s = 0; s <= 1000; s++) {
    assert.equal(getTierFromScore(s), tierFromScore(s), `score ${s}`);
  }
});

test('tier progress clamps to [0,1] at and beyond boundaries', () => {
  assert.equal(getTierProgress(0), 0);
  assert.equal(getTierProgress(200), 0);           // first point of SILVER
  assert.ok(Math.abs(getTierProgress(324.5) - 0.5) < 0.01);
  assert.equal(getTierProgress(1000), 1);
  assert.equal(getTierProgress(-50), 0);           // never negative
  assert.equal(getTierProgress(5000), 1);          // never above 1
});

test('points to next tier at boundaries; BLACK has no next tier', () => {
  assert.equal(getPointsToNextTier(0), 200);
  assert.equal(getPointsToNextTier(199), 1);
  assert.equal(getPointsToNextTier(899), 1);
  assert.equal(getPointsToNextTier(900), 0);
  assert.equal(getPointsToNextTier(1000), 0);
  assert.equal(getNextTier('BLACK'), null);
});

// ── client velocity formula (REGRESSION D9) ──────────────────────────────────

test('perfect rates hit exactly 1000/BLACK (weights 3 + 2.5 + 2.5 + 2)', () => {
  const s = calculateVelocityScore({ savingsRate: 1, investmentRate: 1, debtPaydownRate: 1, spendingDiscipline: 1, actionsTaken: 0 });
  assert.equal(s.total, 1000);
  assert.equal(s.tier, 'BLACK');
});

test('REGRESSION D9: negative rates clamp at 0 like the server — never a negative score', () => {
  const s = calculateVelocityScore({ savingsRate: -0.5, investmentRate: -1, debtPaydownRate: -0.2, spendingDiscipline: -3, actionsTaken: 0 });
  assert.equal(s.savings, 0);
  assert.equal(s.investment, 0);
  assert.equal(s.debt, 0);
  assert.equal(s.spending, 0);
  assert.equal(s.total, 0);
  assert.equal(s.tier, 'BRONZE');
});

test('rates above 100% clamp at 100 per dimension', () => {
  const s = calculateVelocityScore({ savingsRate: 2.5, investmentRate: 1.1, debtPaydownRate: 9, spendingDiscipline: 1.01, actionsTaken: 2 });
  assert.equal(s.total, 1000);
  assert.equal(s.weeklyChange, 16);
});

// ── onboarding estimate ──────────────────────────────────────────────────────

test('onboarding score: known-answer check and determinism', () => {
  const answers = { name: 'A', age: '25–34', income: '$70K – $120K', goal: 'Build wealth' };
  const r = calculateOnboardingScore(answers);
  assert.equal(r.score, 343); // round(290 × 1.08 + 30)
  assert.equal(r.tier, 'SILVER');
  assert.equal(r.gaps.length, 3);
  assert.deepEqual(calculateOnboardingScore(answers), r);
});

test('every answer combination lands in the documented [150, 620] band, below PLATINUM', () => {
  const ages = ['18–24', '25–34', '35–44', '45+'];
  const incomes = ['Under $40K', '$40K – $70K', '$70K – $120K', '$120K+'];
  const goals = ['Build wealth', 'Get out of debt', 'Save more', 'Grow investments'];
  for (const age of ages) for (const income of incomes) for (const goal of goals) {
    const r = calculateOnboardingScore({ name: '', age, income, goal });
    assert.ok(r.score >= 150 && r.score <= 620, `${age}/${income}/${goal} → ${r.score}`);
    assert.ok(['BRONZE', 'SILVER', 'GOLD'].includes(r.tier));
    assert.ok(r.gaps.length >= 3);
  }
});

test('unknown answers fall back to safe defaults instead of NaN', () => {
  const r = calculateOnboardingScore({ name: '', age: '??', income: '??', goal: '??' });
  assert.equal(r.score, 310); // 290 × 1.0 + 20
  assert.ok(Number.isFinite(r.percentile));
});

// ── FI trajectory ────────────────────────────────────────────────────────────

const finiteTrajectory = (t: ReturnType<typeof computeTrajectory>) => {
  assert.ok(Number.isFinite(t.fiAge), 'fiAge finite');
  assert.ok(Number.isFinite(t.fiNumber), 'fiNumber finite');
  assert.ok(Number.isFinite(t.currentSavingsRate), 'savings rate finite');
  assert.ok(t.curve.every(p => Number.isFinite(p.netWorth)), 'curve finite');
};

test('REGRESSION D10: zero income no longer poisons every output with NaN', () => {
  const t = computeTrajectory({ ...DEFAULT_TRAJECTORY_INPUTS, annualIncome: 0, annualExpenses: 0, currentNetWorth: 0 });
  finiteTrajectory(t);
  assert.equal(t.currentSavingsRate, 0);
  const t2 = computeTrajectory({ ...DEFAULT_TRAJECTORY_INPUTS, annualIncome: 0, annualExpenses: 40000 });
  finiteTrajectory(t2);
  assert.equal(t2.annualSavings, 0);
});

test('known-answer: default member has a plausible FI plan (4% rule)', () => {
  const t = computeTrajectory(DEFAULT_TRAJECTORY_INPUTS);
  assert.equal(t.fiNumber, 58000 / 0.04);
  assert.equal(t.monthlyPassiveAtFI, Math.round(58000 / 12));
  assert.ok(t.yearsToFI > 5 && t.yearsToFI < 45);
  assert.equal(t.curve[0].netWorth, 34000);
  assert.equal(t.curve[0].age, 28);
});

test('completed actions shave years, never add them; savings rate caps at 80%', () => {
  const base = computeTrajectory(DEFAULT_TRAJECTORY_INPUTS);
  const boosted = computeTrajectory({ ...DEFAULT_TRAJECTORY_INPUTS, actionsCompleted: 20 });
  assert.ok(boosted.yearsToFI <= base.yearsToFI);
  assert.ok(boosted.actionSavings >= 0);
  const capped = computeTrajectory({ ...DEFAULT_TRAJECTORY_INPUTS, annualExpenses: 0, actionsCompleted: 100 });
  assert.equal(capped.currentSavingsRate, 80);
});

test('negative net worth and huge values stay finite and monotonic while saving', () => {
  const t = computeTrajectory({ age: 30, annualIncome: 80000, annualExpenses: 60000, currentNetWorth: -45000, annualReturn: 0.07, actionsCompleted: 0 });
  finiteTrajectory(t);
  for (let i = 1; i < t.curve.length; i++) {
    assert.ok(t.curve[i].netWorth >= t.curve[i - 1].netWorth, 'positive savings → non-decreasing');
  }
  const huge = computeTrajectory({ age: 25, annualIncome: 5_000_000, annualExpenses: 100_000, currentNetWorth: 10_000_000, annualReturn: 0.07, actionsCompleted: 0 });
  finiteTrajectory(huge);
  assert.equal(huge.yearsToFI, 0); // already past the FI number
});
