export type NotifType =
  | 'score_up'
  | 'score_down'
  | 'tier_progress'
  | 'streak'
  | 'new_moves'
  | 'challenge_complete'
  | 'goal_milestone'
  | 'insight'
  | 'win';

export interface VaultNotification {
  id: string;
  type: NotifType;
  title: string;
  body: string;
  timestamp: Date;
  read: boolean;
  icon: string;
  actionLabel?: string;
  value?: string;
}

export const MOCK_NOTIFICATIONS: VaultNotification[] = [
  {
    id: 'n1',
    type: 'score_up',
    title: 'Your score jumped +47 pts',
    body: 'Best week this month. You\'re now in the top 29% of Gold members.',
    timestamp: new Date(Date.now() - 1000 * 60 * 12),
    read: false,
    icon: '◉',
    value: '+47',
  },
  {
    id: 'n2',
    type: 'new_moves',
    title: '5 new wealth moves waiting',
    body: 'Fresh moves based on your accounts. One of them is worth $1,200+.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
    read: false,
    icon: '◈',
    actionLabel: 'See moves',
  },
  {
    id: 'n3',
    type: 'streak',
    title: 'Day 23. Don\'t break it.',
    body: 'You\'re 7 days from your longest streak ever. Open VAULT to keep it alive.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5),
    read: false,
    icon: '🔥',
    value: '23d',
  },
  {
    id: 'n4',
    type: 'tier_progress',
    title: 'Platinum is 53 points away',
    body: 'At your current pace you\'ll hit Platinum tier in 8 days. Keep going.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 14),
    read: false,
    icon: '◇',
    actionLabel: 'View score',
  },
  {
    id: 'n5',
    type: 'challenge_complete',
    title: 'Challenge complete — +15 pts',
    body: 'You took 2 wealth moves today. Points added to your score.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 20),
    read: true,
    icon: '◆',
    value: '+15',
  },
  {
    id: 'n6',
    type: 'insight',
    title: 'Fed held rates. Your HYSA still wins.',
    body: 'Interest rates unchanged. Members with high-yield savings are still earning 5x standard accounts.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 26),
    read: true,
    icon: '◎',
    actionLabel: 'Read more',
  },
  {
    id: 'n7',
    type: 'goal_milestone',
    title: 'Emergency fund: 65% there',
    body: 'You crossed the halfway point on your emergency fund goal. $5,200 left.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48),
    read: true,
    icon: '🛡',
    value: '65%',
  },
  {
    id: 'n8',
    type: 'win',
    title: 'New wealth win unlocked',
    body: 'You\'ve maintained a 21-day streak. This is a shareable moment.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 72),
    read: true,
    icon: '◑',
    actionLabel: 'Share it',
  },
];

export function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60)  return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
