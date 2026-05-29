import { VelocityScore, TierName } from '../types';
import { TIERS } from '../constants/theme';

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
  const progress = (score - tier.minScore) / range;
  return Math.min(Math.max(progress, 0), 1);
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

export function calculateVelocityScore(data: {
  savingsRate: number;
  investmentRate: number;
  debtPaydownRate: number;
  spendingDiscipline: number;
  actionsTaken: number;
}): VelocityScore {
  const savings = Math.min(Math.round(data.savingsRate * 100), 100);
  const investment = Math.min(Math.round(data.investmentRate * 100), 100);
  const debt = Math.min(Math.round(data.debtPaydownRate * 100), 100);
  const spending = Math.min(Math.round(data.spendingDiscipline * 100), 100);

  // Weighted composite: savings 30%, investment 25%, debt 25%, spending 20%
  const total = Math.round(
    savings * 3 + investment * 2.5 + debt * 2.5 + spending * 2
  );

  const tier = getTierFromScore(total);

  return {
    total,
    savings,
    investment,
    debt,
    spending,
    weeklyChange: Math.round(data.actionsTaken * 8),
    percentile: Math.round(total / 10),
    tier,
    tierProgress: getTierProgress(total),
  };
}
