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

export const COHORT_ACTIVITY: CohortActivity[] = [
  {
    id: 'a1',
    memberName: 'Casey W.',
    memberInitials: 'CW',
    type: 'net_worth_badge',
    headline: 'Net worth crossed $50K',
    sub: 'A milestone 71% of people your age never reach.',
    minutesAgo: 14,
    reactions: [
      { label: 'Locked In', emoji: '🔒', count: 3, reacted: false },
      { label: 'Building',  emoji: '📈', count: 2, reacted: false },
      { label: 'Witnessed', emoji: '👁',  count: 4, reacted: true  },
    ],
  },
  {
    id: 'a2',
    memberName: 'Jordan K.',
    memberInitials: 'JK',
    type: 'streak_milestone',
    headline: 'Hit a 30-day streak 🔥',
    sub: 'Longest active streak in your cohort.',
    minutesAgo: 47,
    reactions: [
      { label: 'Locked In', emoji: '🔒', count: 5, reacted: false },
      { label: 'Building',  emoji: '📈', count: 1, reacted: false },
      { label: 'Witnessed', emoji: '👁',  count: 2, reacted: false },
    ],
  },
  {
    id: 'a3',
    memberName: 'You',
    memberInitials: 'AX',
    type: 'move_complete',
    headline: 'Completed "Open a HYSA"',
    sub: 'Earning 5x the national average on idle cash.',
    xp: 47,
    minutesAgo: 120,
    reactions: [
      { label: 'Locked In', emoji: '🔒', count: 2, reacted: false },
      { label: 'Building',  emoji: '📈', count: 3, reacted: false },
      { label: 'Witnessed', emoji: '👁',  count: 1, reacted: false },
    ],
  },
  {
    id: 'a4',
    memberName: 'Alex M.',
    memberInitials: 'AM',
    type: 'tier_progress',
    headline: '15 pts from Platinum tier',
    sub: 'At current pace, hitting it in 6 days.',
    minutesAgo: 180,
    reactions: defaultReactions(),
  },
  {
    id: 'a5',
    memberName: 'Casey W.',
    memberInitials: 'CW',
    type: 'challenge_complete',
    headline: 'Completed this week\'s challenge',
    sub: '3 moves in 3 days. +15 pts added.',
    xp: 15,
    minutesAgo: 240,
    reactions: [
      { label: 'Locked In', emoji: '🔒', count: 1, reacted: false },
      { label: 'Building',  emoji: '📈', count: 4, reacted: true  },
      { label: 'Witnessed', emoji: '👁',  count: 0, reacted: false },
    ],
  },
  {
    id: 'a6',
    memberName: 'Riley P.',
    memberInitials: 'RP',
    type: 'goal_hit',
    headline: 'Emergency fund 50% funded',
    sub: '$5,200 left to full protection.',
    minutesAgo: 360,
    reactions: defaultReactions(),
  },
  {
    id: 'a7',
    memberName: 'Morgan L.',
    memberInitials: 'ML',
    type: 'move_complete',
    headline: 'Completed "Set up auto-invest"',
    sub: '$200/month now working without thinking about it.',
    xp: 60,
    minutesAgo: 480,
    reactions: [
      { label: 'Locked In', emoji: '🔒', count: 2, reacted: false },
      { label: 'Building',  emoji: '📈', count: 2, reacted: false },
      { label: 'Witnessed', emoji: '👁',  count: 1, reacted: false },
    ],
  },
  {
    id: 'a8',
    memberName: 'Jordan K.',
    memberInitials: 'JK',
    type: 'move_complete',
    headline: 'Completed "Max employer match"',
    sub: 'Claiming $1,200/yr in free money.',
    xp: 75,
    minutesAgo: 600,
    reactions: [
      { label: 'Locked In', emoji: '🔒', count: 4, reacted: false },
      { label: 'Building',  emoji: '📈', count: 3, reacted: false },
      { label: 'Witnessed', emoji: '👁',  count: 2, reacted: false },
    ],
  },
];

export function timeAgoShort(minutes: number): string {
  if (minutes < 60)  return `${minutes}m`;
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
