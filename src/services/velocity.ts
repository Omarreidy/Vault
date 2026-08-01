import { VelocityScore, TierName } from '../types';
import { TIERS } from '../constants/theme';
import { supabase, callFunction, currentUserId } from './supabase';
import { tierFromScore } from './plaidMath';

// Thresholds live in plaidMath.ts so client and server can never disagree.
export function getTierFromScore(score: number): TierName {
  return tierFromScore(score);
}

export function getTierProgress(score: number): number {
  const tier = TIERS[getTierFromScore(score)];
  const range = tier.maxScore - tier.minScore;
  return Math.min(Math.max((score - tier.minScore) / range, 0), 1);
}

export function getNextTier(current: TierName): TierName | null {
  const order: TierName[] = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'BLACK'];
  const idx = order.indexOf(current);
  return idx < order.length - 1 ? order[idx + 1] : null;
}

export function getPointsToNextTier(score: number): number {
  const tier = getTierFromScore(score);
  const next = getNextTier(tier);
  if (!next) return 0;
  return TIERS[next].minScore - score;
}

// Fetch real score from Plaid data via Edge Function
// Falls back to profile score (from onboarding) if no Plaid data
export async function fetchLiveScore(): Promise<VelocityScore | null> {
  try {
    // Cached session read, not a network round trip — see currentUserId.
    const userId = await currentUserId();
    if (!userId) return null;

    // Previously a 401 from an expired token was swallowed here and returned as
    // null, which the Score screen renders as a spinner that never resolves.
    // callFunction refreshes and replays first, so that path is now rare — and
    // when it does fail the caller gets null quickly rather than hanging.
    const data = await callFunction('calculate-score', { body: { user_id: userId } });

    return {
      total: data.total,
      savings: data.savings,
      investment: data.investment,
      debt: data.debt,
      spending: data.spending,
      weeklyChange: data.weeklyChange ?? 0,
      percentile: data.percentile,
      tier: data.tier as TierName,
      tierProgress: getTierProgress(data.total),
    };
  } catch {
    return null;
  }
}

// Fetch score from Supabase profile (set during onboarding)
export async function fetchProfileScore(): Promise<VelocityScore | null> {
  try {
    const userId = await currentUserId();
    if (!userId) return null;

    const { data } = await supabase
      .from('profiles')
      .select('score, tier, percentile')
      .eq('id', userId)
      .single();

    if (!data?.score) return null;

    const score = data.score;
    const tier = (data.tier ?? getTierFromScore(score)) as TierName;

    // Onboarding stores a single total (0–1000) — there is no real per-dimension
    // breakdown until accounts are connected and calculate-score runs. Previously
    // this invented one (total × 0.72 / 0.61 / 0.55 / 0.68, capped at 100), which
    // saturated every dimension to a perfect 100/100 for any score above ~140.
    // Project the one number we actually have onto the 0–100 scale instead; the
    // UI already labels this state "Estimated score · Connect accounts for your
    // real score". Never fabricate differentiated dimensions here.
    const projected = Math.max(0, Math.min(Math.round(score / 10), 100));

    return {
      total: score,
      savings: projected,
      investment: projected,
      debt: projected,
      spending: projected,
      weeklyChange: 0,
      percentile: data.percentile ?? Math.min(Math.round(score / 10), 99),
      tier,
      tierProgress: getTierProgress(score),
    };
  } catch {
    return null;
  }
}

export function calculateVelocityScore(data: {
  savingsRate: number;
  investmentRate: number;
  debtPaydownRate: number;
  spendingDiscipline: number;
  actionsTaken: number;
}): VelocityScore {
  // Clamp 0–100 exactly like the server's dimension scores — a negative rate
  // must not produce a negative dimension or drag the total below zero.
  const clamp = (v: number) => Math.min(Math.max(Math.round(v), 0), 100);
  const savings    = clamp(data.savingsRate * 100);
  const investment = clamp(data.investmentRate * 100);
  const debt       = clamp(data.debtPaydownRate * 100);
  const spending   = clamp(data.spendingDiscipline * 100);
  const total      = Math.round(savings * 3 + investment * 2.5 + debt * 2.5 + spending * 2);
  const tier       = getTierFromScore(total);

  return {
    total, savings, investment, debt, spending,
    weeklyChange: Math.round(data.actionsTaken * 8),
    percentile: Math.round(total / 10),
    tier,
    tierProgress: getTierProgress(total),
  };
}
