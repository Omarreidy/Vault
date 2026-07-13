/**
 * Server-authoritative onboarding score (src/services/onboardingScore.ts,
 * mirrored to supabase/functions/_shared/onboarding.ts). The edge function
 * recomputes the score from raw answers so a client can never inflate it (D1).
 * These pin the exact numbers, bounds, and client/server parity.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { computeOnboardingScore, tierFromScore, tierProgress } from '../src/services/onboardingScore';
import { calculateOnboardingScore } from '../src/services/onboarding';

test('parity: onboardingScore.ts and _shared/onboarding.ts are byte-identical', () => {
  const a = fs.readFileSync(path.join(__dirname, '../src/services/onboardingScore.ts'), 'utf8');
  const b = fs.readFileSync(path.join(__dirname, '../supabase/functions/_shared/onboarding.ts'), 'utf8');
  assert.equal(a, b, 'edit both copies together — see file header');
});

test('the client reveal helper delegates to the shared formula (same numbers persisted)', () => {
  const answers = { name: 'X', age: '25–34', income: '$70K – $120K', goal: 'Build wealth' };
  const client = calculateOnboardingScore(answers);
  const shared = computeOnboardingScore(answers);
  assert.equal(client.score, shared.score);
  assert.equal(client.tier, shared.tier);
  assert.equal(client.percentile, shared.percentile);
  assert.equal(client.tierProgress, shared.tierProgress);
});

test('known-answer score is exact and deterministic', () => {
  const r = computeOnboardingScore({ age: '25–34', income: '$70K – $120K', goal: 'Build wealth' });
  assert.equal(r.score, 343); // round(290 × 1.08 + 30)
  assert.equal(r.tier, 'SILVER');
  assert.deepEqual(r, computeOnboardingScore({ age: '25–34', income: '$70K – $120K', goal: 'Build wealth' }));
});

test('every answer combination stays in [150, 620] and below PLATINUM', () => {
  const ages = ['18–24', '25–34', '35–44', '45+'];
  const incomes = ['Under $40K', '$40K – $70K', '$70K – $120K', '$120K+'];
  const goals = ['Build wealth', 'Get out of debt', 'Save more', 'Grow investments'];
  for (const age of ages) for (const income of incomes) for (const goal of goals) {
    const r = computeOnboardingScore({ age, income, goal });
    assert.ok(r.score >= 150 && r.score <= 620, `${age}/${income}/${goal} → ${r.score}`);
    assert.ok(['BRONZE', 'SILVER', 'GOLD'].includes(r.tier));
    assert.ok(r.gaps.length >= 3);
    assert.ok(r.tierProgress >= 0 && r.tierProgress <= 1);
  }
});

test('unknown answers fall back to safe defaults, never NaN', () => {
  const r = computeOnboardingScore({ age: '??', income: '??', goal: '??' });
  assert.equal(r.score, 310); // 290 × 1.0 + 20
  assert.ok(Number.isFinite(r.percentile));
  assert.equal(r.gaps.length, 3); // default → Build wealth gaps
});

test('shared tier helpers match the app thresholds', () => {
  assert.equal(tierFromScore(199), 'BRONZE');
  assert.equal(tierFromScore(200), 'SILVER');
  assert.equal(tierFromScore(450), 'GOLD');
  assert.equal(tierProgress(200), 0);
  assert.equal(tierProgress(324.5), 0.5);
});
