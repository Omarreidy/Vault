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
    progress: 1,
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
    progress: 5,
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
    progress: 4,
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
    progress: 47,
    target: 100,
    completed: false,
    icon: '◆',
    category: 'action',
  },
];
