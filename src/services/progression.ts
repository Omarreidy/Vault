import { TierName } from '../types';

export interface ProgressionMove {
  id: string;
  title: string;
  description: string;
  category: 'savings' | 'investment' | 'debt' | 'spending' | 'mindset' | 'career' | 'wealth';
  xpReward: number;
  completed: boolean;
  completedAt?: Date;
}

export interface TierRequirement {
  fromTier: TierName;
  toTier: TierName;
  tagline: string;             // what unlocking this tier means
  unlockReward: string;        // what you get at the new tier
  moves: ProgressionMove[];
}

// The 5 gateway moves for each tier unlock
// Psychology: specific, achievable, sequenced — creates the goal gradient pull
export const TIER_REQUIREMENTS: Record<string, TierRequirement> = {
  'BRONZE_TO_SILVER': {
    fromTier: 'BRONZE',
    toTier: 'SILVER',
    tagline: 'Prove you\'re serious about money',
    unlockReward: 'Silver marks your first stretch of consistent momentum',
    moves: [
      {
        id: 'prog_s1',
        title: 'Open a High-Yield Savings Account',
        description: 'Move idle checking cash to earn far more interest',
        category: 'savings',
        xpReward: 150,
        completed: false,
      },
      {
        id: 'prog_s2',
        title: 'Set up automatic savings transfer',
        description: 'Automate at least $100/month to savings — remove the decision',
        category: 'savings',
        xpReward: 120,
        completed: false,
      },
      {
        id: 'prog_s3',
        title: 'Pay off one credit card in full',
        description: 'Eliminate at least one revolving balance completely',
        category: 'debt',
        xpReward: 200,
        completed: false,
      },
      {
        id: 'prog_s4',
        title: 'Complete your Beliefs Audit',
        description: 'Identify your money archetype and your limiting beliefs',
        category: 'mindset',
        xpReward: 100,
        completed: false,
      },
      {
        id: 'prog_s5',
        title: 'Build 3 months of emergency fund',
        description: 'Reach 3x your monthly expenses in accessible savings',
        category: 'savings',
        xpReward: 250,
        completed: false,
      },
    ],
  },

  'SILVER_TO_GOLD': {
    fromTier: 'SILVER',
    toTier: 'GOLD',
    tagline: 'Start building real wealth',
    unlockReward: 'Gold marks momentum across saving, investing, and debt at once',
    moves: [
      {
        id: 'prog_g1',
        title: 'Open a Roth IRA',
        description: 'Tax-free growth forever — the most powerful account available to you',
        category: 'investment',
        xpReward: 300,
        completed: false,
      },
      {
        id: 'prog_g2',
        title: 'Invest in your first index fund',
        description: 'Put money into a broad market ETF — VTI, VOO, or equivalent',
        category: 'investment',
        xpReward: 250,
        completed: false,
      },
      {
        id: 'prog_g3',
        title: 'Negotiate your salary or land a raise',
        description: 'Your income is your biggest wealth lever — prepare the case and ask.',
        category: 'career',
        xpReward: 400,
        completed: false,
      },
      {
        id: 'prog_g4',
        title: 'Reach a 20% savings rate',
        description: 'Save at least 20% of your take-home income for one full month',
        category: 'savings',
        xpReward: 300,
        completed: false,
      },
      {
        id: 'prog_g5',
        title: 'Build 6 months of emergency fund',
        description: 'Full financial safety net — removes the biggest wealth-building blocker',
        category: 'savings',
        xpReward: 350,
        completed: false,
      },
    ],
  },

  'GOLD_TO_PLATINUM': {
    fromTier: 'GOLD',
    toTier: 'PLATINUM',
    tagline: 'Compound your way to the top tiers',
    unlockReward: 'Platinum marks the habits that make wealth feel inevitable',
    moves: [
      {
        id: 'prog_p1',
        title: 'Max your 401(k) contributions',
        description: 'Hit the annual IRS limit — or get as close as possible',
        category: 'investment',
        xpReward: 500,
        completed: false,
      },
      {
        id: 'prog_p2',
        title: 'Max your Roth IRA',
        description: 'Contribute the full annual IRS limit — every dollar grows tax-free forever',
        category: 'investment',
        xpReward: 400,
        completed: false,
      },
      {
        id: 'prog_p3',
        title: 'Open a taxable brokerage account',
        description: 'Invest beyond tax-advantaged accounts — no contribution limits',
        category: 'investment',
        xpReward: 350,
        completed: false,
      },
      {
        id: 'prog_p4',
        title: 'Create a second income stream',
        description: 'Freelance, consulting, rental income, or any recurring source beyond salary',
        category: 'career',
        xpReward: 600,
        completed: false,
      },
      {
        id: 'prog_p5',
        title: 'Reach $100K net worth',
        description: 'The first $100K is the hardest — after this, compounding takes over',
        category: 'wealth',
        xpReward: 750,
        completed: false,
      },
    ],
  },

  'PLATINUM_TO_BLACK': {
    fromTier: 'PLATINUM',
    toTier: 'BLACK',
    tagline: 'Financial independence is within reach',
    unlockReward: 'Black is reserved for VAULT members on track for financial independence',
    moves: [
      {
        id: 'prog_b1',
        title: 'Reach $500K net worth',
        description: 'Half a million — you\'re past the inflection point on the compound curve',
        category: 'wealth',
        xpReward: 1000,
        completed: false,
      },
      {
        id: 'prog_b2',
        title: 'Generate $2,000/month in passive income',
        description: 'Dividends, rent, royalties — money working without you',
        category: 'wealth',
        xpReward: 900,
        completed: false,
      },
      {
        id: 'prog_b3',
        title: 'Complete estate planning',
        description: 'Will, power of attorney, beneficiary designations — protect what you\'ve built',
        category: 'wealth',
        xpReward: 500,
        completed: false,
      },
      {
        id: 'prog_b4',
        title: 'Hit your FI trajectory milestone',
        description: 'Your Trajectory screen shows you\'re on track for your FI date',
        category: 'wealth',
        xpReward: 800,
        completed: false,
      },
      {
        id: 'prog_b5',
        title: 'Mentor a VAULT member to Silver',
        description: 'Wealth compounds when shared — bring someone up with you',
        category: 'mindset',
        xpReward: 600,
        completed: false,
      },
    ],
  },
};

export function getRequirementKey(tier: TierName): string {
  const map: Partial<Record<TierName, string>> = {
    BRONZE:   'BRONZE_TO_SILVER',
    SILVER:   'SILVER_TO_GOLD',
    GOLD:     'GOLD_TO_PLATINUM',
    PLATINUM: 'PLATINUM_TO_BLACK',
  };
  return map[tier] ?? 'BRONZE_TO_SILVER';
}

export function getProgression(tier: TierName): TierRequirement {
  return TIER_REQUIREMENTS[getRequirementKey(tier)];
}

export function getProgressionStats(tier: TierName): {
  completed: number;
  total: number;
  pct: number;
  xpEarned: number;
  xpTotal: number;
  nextMove: ProgressionMove | undefined;
} {
  const req = getProgression(tier);
  const completed = req.moves.filter(m => m.completed).length;
  const total = req.moves.length;
  const xpEarned = req.moves.filter(m => m.completed).reduce((s, m) => s + m.xpReward, 0);
  const xpTotal  = req.moves.reduce((s, m) => s + m.xpReward, 0);
  const nextMove = req.moves.find(m => !m.completed);
  return { completed, total, pct: completed / total, xpEarned, xpTotal, nextMove };
}
