export interface Challenge {
  id: string;
  title: string;
  description: string;
  reward: number;
  type: 'daily' | 'weekly';
  progress: number;
  target: number;
  completed: boolean;
  icon: string;
  category: 'action' | 'streak' | 'learning' | 'social';
}

export const DAILY_CHALLENGES: Challenge[] = [
  {
    id: 'd1',
    title: 'Check your score',
    description: 'Visit your Wealth Velocity score',
    reward: 5,
    type: 'daily',
    progress: 0,
    target: 1,
    completed: false,
    icon: '◉',
    category: 'action',
  },
  {
    id: 'd2',
    title: 'Take 2 wealth moves',
    description: 'Act on 2 moves from your daily feed',
    reward: 15,
    type: 'daily',
    progress: 0,
    target: 2,
    completed: false,
    icon: '◈',
    category: 'action',
  },
  {
    id: 'd3',
    title: 'Ask your concierge',
    description: 'Get a personalised financial insight',
    reward: 10,
    type: 'daily',
    progress: 0,
    target: 1,
    completed: false,
    icon: '◇',
    category: 'learning',
  },
];

export const WEEKLY_CHALLENGES: Challenge[] = [
  {
    id: 'w1',
    title: '7-day streak',
    description: 'Open VAULT every day this week',
    reward: 50,
    type: 'weekly',
    progress: 0,
    target: 7,
    completed: false,
    icon: '🔥',
    category: 'streak',
  },
  {
    id: 'w2',
    title: 'Take 10 moves',
    description: 'Act on 10 wealth moves this week',
    reward: 80,
    type: 'weekly',
    progress: 0,
    target: 10,
    completed: false,
    icon: '⚡',
    category: 'action',
  },
  {
    id: 'w3',
    title: 'Tier climber',
    description: 'Gain 100+ velocity points this week',
    reward: 100,
    type: 'weekly',
    progress: 0,
    target: 100,
    completed: false,
    icon: '◆',
    category: 'action',
  },
];

export interface ChallengeContext {
  streak: number;
  movesToday: number;
  movesWeek: number;
  scoreVisitedToday: boolean;
  conciergeUsedToday: boolean;
  weeklyVelocityGain: number;
}

function withProgress(c: Challenge, progress: number): Challenge {
  const p = Math.max(0, Math.min(progress, c.target));
  return { ...c, progress: p, completed: p >= c.target };
}

// Computes real progress for every challenge from tracked behavior.
export function evaluateChallenges(ctx: ChallengeContext): { daily: Challenge[]; weekly: Challenge[] } {
  const daily = DAILY_CHALLENGES.map(c => {
    switch (c.id) {
      case 'd1': return withProgress(c, ctx.scoreVisitedToday ? 1 : 0);
      case 'd2': return withProgress(c, ctx.movesToday);
      case 'd3': return withProgress(c, ctx.conciergeUsedToday ? 1 : 0);
      default:   return c;
    }
  });

  const weekly = WEEKLY_CHALLENGES.map(c => {
    switch (c.id) {
      case 'w1': return withProgress(c, ctx.streak);
      case 'w2': return withProgress(c, ctx.movesWeek);
      case 'w3': return withProgress(c, ctx.weeklyVelocityGain);
      default:   return c;
    }
  });

  return { daily, weekly };
}
