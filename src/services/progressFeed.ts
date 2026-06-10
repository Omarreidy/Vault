export type ActivityType =
  | 'move_complete'
  | 'streak_milestone'
  | 'tier_progress'
  | 'net_worth_badge'
  | 'goal_hit'
  | 'challenge_complete'
  | 'joined';

export interface Reaction {
  label: string;
  emoji: string;
  count: number;
  reacted: boolean;
}

export interface CohortActivity {
  id: string;
  memberName: string;
  memberInitials: string;
  type: ActivityType;
  headline: string;
  sub?: string;
  xp?: number;
  minutesAgo: number;
  reactions: Reaction[];
}

const defaultReactions = (): Reaction[] => [
  { label: 'Locked In', emoji: '🔒', count: 0, reacted: false },
  { label: 'Building',  emoji: '📈', count: 0, reacted: false },
  { label: 'Witnessed', emoji: '👁',  count: 0, reacted: false },
];

// Sample activity showing what the cohort feed looks like as members join.
// Names and amounts are anonymized — no real user data is shown until the cohort forms.
export const COHORT_ACTIVITY: CohortActivity[] = [
  {
    id: 'a1',
    memberName: 'Gold member',
    memberInitials: '◆',
    type: 'net_worth_badge',
    headline: 'Net worth crossed $50K',
    sub: 'A milestone most people your age never reach.',
    minutesAgo: 14,
    reactions: defaultReactions(),
  },
  {
    id: 'a2',
    memberName: 'Gold member',
    memberInitials: '◆',
    type: 'streak_milestone',
    headline: 'Hit a 30-day streak 🔥',
    sub: 'Longest active streak in the cohort this week.',
    minutesAgo: 47,
    reactions: defaultReactions(),
  },
  {
    id: 'a3',
    memberName: 'Gold member',
    memberInitials: '◆',
    type: 'move_complete',
    headline: 'Completed "Open a HYSA"',
    sub: 'Now earning 5x the national average on idle cash.',
    xp: 47,
    minutesAgo: 120,
    reactions: defaultReactions(),
  },
  {
    id: 'a4',
    memberName: 'Gold member',
    memberInitials: '◆',
    type: 'tier_progress',
    headline: 'Getting close to Platinum tier',
    sub: 'Velocity score climbing week over week.',
    minutesAgo: 180,
    reactions: defaultReactions(),
  },
  {
    id: 'a5',
    memberName: 'Gold member',
    memberInitials: '◆',
    type: 'challenge_complete',
    headline: 'Completed this week\'s challenge',
    sub: '3 moves in 3 days.',
    xp: 15,
    minutesAgo: 240,
    reactions: defaultReactions(),
  },
  {
    id: 'a6',
    memberName: 'Gold member',
    memberInitials: '◆',
    type: 'goal_hit',
    headline: 'Emergency fund 50% funded',
    sub: 'Halfway to full financial protection.',
    minutesAgo: 360,
    reactions: defaultReactions(),
  },
  {
    id: 'a7',
    memberName: 'Gold member',
    memberInitials: '◆',
    type: 'move_complete',
    headline: 'Completed "Set up auto-invest"',
    sub: 'Money moving every month without thinking about it.',
    xp: 60,
    minutesAgo: 480,
    reactions: defaultReactions(),
  },
  {
    id: 'a8',
    memberName: 'Gold member',
    memberInitials: '◆',
    type: 'move_complete',
    headline: 'Completed "Max employer match"',
    sub: 'Capturing free money left on the table every year.',
    xp: 75,
    minutesAgo: 600,
    reactions: defaultReactions(),
  },
  {
    id: 'a9',
    memberName: 'Gold member',
    memberInitials: '◆',
    type: 'move_complete',
    headline: 'Completed "Open a Roth IRA"',
    sub: 'Tax-free growth starts today.',
    xp: 65,
    minutesAgo: 660,
    reactions: defaultReactions(),
  },
  {
    id: 'a10',
    memberName: 'Gold member',
    memberInitials: '◆',
    type: 'goal_hit',
    headline: 'Emergency fund fully funded',
    sub: '6 months of runway. One of the most important things you can build.',
    minutesAgo: 720,
    reactions: defaultReactions(),
  },
  {
    id: 'a11',
    memberName: 'Gold member',
    memberInitials: '◆',
    type: 'move_complete',
    headline: 'Completed "Build a 3-fund portfolio"',
    sub: 'Diversification done in a single move.',
    xp: 55,
    minutesAgo: 800,
    reactions: defaultReactions(),
  },
  {
    id: 'a12',
    memberName: 'Gold member',
    memberInitials: '◆',
    type: 'streak_milestone',
    headline: 'Hit a 7-day streak',
    sub: 'Consistency is the highest-return habit in finance.',
    minutesAgo: 900,
    reactions: defaultReactions(),
  },
  {
    id: 'a13',
    memberName: 'Gold member',
    memberInitials: '◆',
    type: 'move_complete',
    headline: 'Completed "Pay off high-interest card"',
    sub: 'The highest guaranteed return in personal finance.',
    xp: 80,
    minutesAgo: 960,
    reactions: defaultReactions(),
  },
  {
    id: 'a14',
    memberName: 'Gold member',
    memberInitials: '◆',
    type: 'tier_progress',
    headline: 'Climbed from Silver to Gold tier',
    sub: 'Score crossed the threshold. Welcome to the cohort.',
    minutesAgo: 1020,
    reactions: defaultReactions(),
  },
  {
    id: 'a15',
    memberName: 'Gold member',
    memberInitials: '◆',
    type: 'challenge_complete',
    headline: 'Completed the No-Spend Weekend challenge',
    sub: 'Awareness is the first move.',
    xp: 20,
    minutesAgo: 1080,
    reactions: defaultReactions(),
  },
  {
    id: 'a16',
    memberName: 'Gold member',
    memberInitials: '◆',
    type: 'net_worth_badge',
    headline: 'Net worth crossed $25K',
    sub: 'The first milestone is always the hardest to hit.',
    minutesAgo: 1140,
    reactions: defaultReactions(),
  },
  {
    id: 'a17',
    memberName: 'Gold member',
    memberInitials: '◆',
    type: 'move_complete',
    headline: 'Completed "Increase 401k contribution by 1%"',
    sub: 'One percent more. Thousands more at retirement.',
    xp: 40,
    minutesAgo: 1200,
    reactions: defaultReactions(),
  },
  {
    id: 'a18',
    memberName: 'Gold member',
    memberInitials: '◆',
    type: 'goal_hit',
    headline: 'Vacation fund goal hit',
    sub: 'Paid in full. Zero debt for the trip.',
    minutesAgo: 1260,
    reactions: defaultReactions(),
  },
  {
    id: 'a19',
    memberName: 'Gold member',
    memberInitials: '◆',
    type: 'streak_milestone',
    headline: 'Hit a 60-day streak 🔥',
    sub: 'Two months of consecutive action. Top 5% of the cohort.',
    minutesAgo: 1380,
    reactions: defaultReactions(),
  },
  {
    id: 'a20',
    memberName: 'Gold member',
    memberInitials: '◆',
    type: 'joined',
    headline: 'Joined VAULT',
    sub: 'Welcome to the Gold cohort. First move unlocked.',
    minutesAgo: 1440,
    reactions: defaultReactions(),
  },
];

export function timeAgoShort(minutes: number): string {
  if (minutes < 60)   return `${minutes}m`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h`;
  return `${Math.floor(minutes / 1440)}d`;
}

export const ACTIVITY_ICONS: Record<ActivityType, string> = {
  move_complete:      '◈',
  streak_milestone:   '🔥',
  tier_progress:      '◇',
  net_worth_badge:    '◉',
  goal_hit:           '🛡',
  challenge_complete: '◆',
  joined:             '✦',
};
