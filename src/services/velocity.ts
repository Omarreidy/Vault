import { VelocityScore, TierName } from '../types';
import { TIERS } from '../constants/theme';
import { supabase } from './supabase';

const SUPABASE_URL = 'https://gvdfypehwmemootjizmd.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_tHoiSHF-49L1_p0OLRPeKw_5mfSi0fs';

export function getTierFromScore(score: number): TierName {
  if (score >= 900) return 'BLACK';
  if (score >= 700) return 'PLATINUM';
  if (score >= 450) return 'GOLD';
  if (score >= 200) return 'SILVER';
  return 'BRONZE';
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const res = await fetch(`${SUPABASE_URL}/functions/v1/calculate-score`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ user_id: user.id }),
    });

    const data = await res.json();
    if (data.error) return null;

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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data } = await supabase
      .from('profiles')
      .select('score, tier, percentile')
      .eq('id', user.id)
      .single();

    if (!data?.score) return null;

    const score = data.score;
    const tier = (data.tier ?? getTierFromScore(score)) as TierName;

    return {
      total: score,
      savings: Math.round(score * 0.72),
      investment: Math.round(score * 0.61),
      debt: Math.round(score * 0.55),
      spending: Math.round(score * 0.68),
      weeklyChange: 0,
      percentile: data.percentile ?? Math.round(score / 10),
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
  const savings    = Math.min(Math.round(data.savingsRate * 100), 100);
  const investment = Math.min(Math.round(data.investmentRate * 100), 100);
  const debt       = Math.min(Math.round(data.debtPaydownRate * 100), 100);
  const spending   = Math.min(Math.round(data.spendingDiscipline * 100), 100);
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
