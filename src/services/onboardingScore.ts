/**
 * Onboarding score — the deterministic estimate produced from the 3 quiz
 * answers before any bank data exists. Self-contained (no theme/plaidMath
 * imports) so it mirrors byte-for-byte into the edge runtime:
 *   - src/services/onboardingScore.ts             (app, for the reveal display)
 *   - supabase/functions/_shared/onboarding.ts    (submit-onboarding, authoritative)
 * tests/parity.test.ts fails if the copies drift. Edit both together.
 *
 * The SERVER copy is the source of truth for what lands in `profiles`
 * (see qa/FINANCIAL_SPEC.md §12, D1). The client copy only drives the
 * reveal animation; because the formula is identical, the two never disagree.
 */

export type OnbTier = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'BLACK';

export interface OnboardingAnswersInput {
  age: string;
  income: string;
  goal: string;
}

export interface Gap {
  icon: string;
  text: string;
}

export interface OnboardingScore {
  score: number;
  tier: OnbTier;
  tierProgress: number;
  percentile: number;
  gaps: Gap[];
}

const TIER_RANGES: Record<OnbTier, [number, number]> = {
  BRONZE: [0, 199],
  SILVER: [200, 449],
  GOLD: [450, 699],
  PLATINUM: [700, 899],
  BLACK: [900, 1000],
};

export function tierFromScore(score: number): OnbTier {
  if (score >= 900) return 'BLACK';
  if (score >= 700) return 'PLATINUM';
  if (score >= 450) return 'GOLD';
  if (score >= 200) return 'SILVER';
  return 'BRONZE';
}

export function tierProgress(score: number): number {
  const [min, max] = TIER_RANGES[tierFromScore(score)];
  return Math.min(Math.max((score - min) / (max - min), 0), 1);
}

const AGE_SCORES: Record<string, number> = {
  '18–24': 190,
  '25–34': 290,
  '35–44': 400,
  '45+': 360,
};

const INCOME_MULTIPLIERS: Record<string, number> = {
  'Under $40K': 0.82,
  '$40K – $70K': 0.94,
  '$70K – $120K': 1.08,
  '$120K+': 1.18,
};

const GOAL_BOOSTS: Record<string, number> = {
  'Build wealth': 30,
  'Get out of debt': 10,
  'Save more': 20,
  'Grow investments': 40,
};

// Gap text varies by income so specific numbers are never embarrassingly wrong.
export function buildGaps(goal: string, income: string): Gap[] {
  const isLowIncome = income === 'Under $40K';
  const isHighIncome = income === '$120K+';

  switch (goal) {
    case 'Build wealth':
      return [
        {
          icon: '📈',
          text: isLowIncome
            ? 'You may be missing employer match — even small contributions compound fast'
            : 'If your employer offers a 401(k) match you aren\'t maxing, that\'s free compensation going unclaimed',
        },
        {
          icon: '💤',
          text: isLowIncome
            ? 'Cash sitting idle in checking is losing value to inflation every day'
            : `Cash sitting idle in checking is likely earning near zero — a HYSA earns many times more`,
        },
        { icon: '🔍', text: 'Subscription charges you\'ve forgotten are quietly draining your account' },
      ];

    case 'Get out of debt':
      return [
        { icon: '⛓', text: 'High-interest debt is costing you more annually than most investments earn' },
        { icon: '💳', text: 'A 0% balance-transfer offer could pause your interest entirely — worth a five-minute check' },
        { icon: '📉', text: 'Minimum payments are designed to stretch payoff for years — a targeted plan cuts that dramatically' },
      ];

    case 'Save more':
      return [
        {
          icon: '💤',
          text: isLowIncome
            ? 'Cash in checking earns near zero — a high-yield account costs nothing to open'
            : 'Cash sitting in checking is losing purchasing power while high-yield accounts pay many times more',
        },
        { icon: '🔍', text: 'Forgotten subscriptions are likely costing more than you think per year' },
        { icon: '🛡', text: 'A real emergency cushion is what keeps one surprise bill from becoming debt' },
      ];

    case 'Grow investments':
      return [
        {
          icon: '📈',
          text: isLowIncome
            ? 'Even small employer match contributions are a 100% instant return — easy to miss'
            : 'If your employer offers a 401(k) match you aren\'t maxing, that\'s free compensation going unclaimed',
        },
        { icon: '💡', text: 'Your current allocation may be more conservative than your age and timeline warrant' },
        {
          icon: '⚡',
          text: isHighIncome
            ? 'Increasing contributions by $400/month now could mean $360K+ extra at 60'
            : 'Investing $100–200/month more now could mean $150K+ extra at retirement',
        },
      ];

    default:
      return buildGaps('Build wealth', income);
  }
}

/**
 * Deterministic onboarding estimate. Clamped to [150, 620] — Bronze at the low
 * end, capped below Platinum so real bank data drives tier growth later.
 */
export function computeOnboardingScore(answers: OnboardingAnswersInput): OnboardingScore {
  const base = AGE_SCORES[answers.age] ?? 290;
  const multiplier = INCOME_MULTIPLIERS[answers.income] ?? 1.0;
  const boost = GOAL_BOOSTS[answers.goal] ?? 20;
  const raw = Math.round(base * multiplier + boost);
  const score = Math.min(Math.max(raw, 150), 620);

  return {
    score,
    tier: tierFromScore(score),
    tierProgress: tierProgress(score),
    percentile: Math.round((score / 10) * 0.95), // kept for DB compat, not shown in UI
    gaps: buildGaps(answers.goal, answers.income),
  };
}
