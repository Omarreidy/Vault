import { ActivityType } from './cohort';

/**
 * Anonymized preview of the cohort activity feed, shown ONLY while the
 * user's cohort has no real activity yet. Every card is labeled as a
 * preview in the UI and reactions are disabled — no fake engagement.
 * Real activity comes from fetchCohortFeed() in services/cohort.ts.
 */

export interface PreviewActivity {
  id: string;
  type: ActivityType;
  headline: string;
  sub?: string;
  xp?: number;
}

export const COHORT_PREVIEW: PreviewActivity[] = [
  {
    id: 'p1',
    type: 'net_worth_badge',
    headline: 'Net worth crossed $50K',
    sub: 'A milestone most people your age never reach.',
  },
  {
    id: 'p2',
    type: 'streak_milestone',
    headline: 'Hit a 30-day streak 🔥',
    sub: 'Longest active streak in the cohort this week.',
  },
  {
    id: 'p3',
    type: 'move_complete',
    headline: 'Completed "Open a HYSA"',
    sub: 'Now earning 5x the national average on idle cash.',
    xp: 47,
  },
  {
    id: 'p4',
    type: 'tier_progress',
    headline: 'Getting close to Platinum tier',
    sub: 'Velocity score climbing week over week.',
  },
  {
    id: 'p5',
    type: 'challenge_complete',
    headline: "Completed this week's challenge",
    sub: '3 moves in 3 days.',
    xp: 15,
  },
  {
    id: 'p6',
    type: 'goal_hit',
    headline: 'Emergency fund 50% funded',
    sub: 'Halfway to full financial protection.',
  },
  {
    id: 'p7',
    type: 'move_complete',
    headline: 'Completed "Set up auto-invest"',
    sub: 'Money moving every month without thinking about it.',
    xp: 60,
  },
  {
    id: 'p8',
    type: 'move_complete',
    headline: 'Completed "Max employer match"',
    sub: 'Capturing free money left on the table every year.',
    xp: 75,
  },
  {
    id: 'p9',
    type: 'goal_hit',
    headline: 'Emergency fund fully funded',
    sub: '6 months of runway. One of the most important things you can build.',
  },
  {
    id: 'p10',
    type: 'joined',
    headline: 'Joined VAULT',
    sub: 'Welcome to the cohort. First move unlocked.',
  },
];
