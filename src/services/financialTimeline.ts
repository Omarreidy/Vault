export type TimelineCategory = 'savings' | 'investing' | 'debt' | 'income' | 'milestone';
export type TimelineEntryType = 'move' | 'milestone' | 'joined' | 'streak' | 'badge' | 'net_worth';

export interface TimelineEntry {
  id: string;
  type: TimelineEntryType;
  category: TimelineCategory;
  title: string;
  sub?: string;
  impact?: string;       // shown on expand: downstream effect
  xp?: number;
  netWorthDelta?: number;
  onStreak?: boolean;    // was user on a streak when this happened
  isPinned?: boolean;
  icon: string;
  daysAgo: number;       // used for "X days ago" display
}

export interface TimelineMonth {
  id: string;
  label: string;         // "MAY 2026"
  movesCount: number;
  xpEarned: number;
  netWorthGain: number;
  grade: 'S' | 'A' | 'B' | 'C';
  isBest?: boolean;
  entries: TimelineEntry[];
}

export const TIMELINE: TimelineMonth[] = [
  {
    id: 'm1',
    label: 'MAY 2026',
    movesCount: 4,
    xpEarned: 197,
    netWorthGain: 2800,
    grade: 'S',
    isBest: true,
    entries: [
      {
        id: 'e1',
        type: 'move',
        category: 'investing',
        title: 'Maxed employer 401(k) match',
        sub: 'Claiming the full $1,200/yr in free money.',
        impact: 'At 7% growth, this decision is worth ~$9,400 by age 45.',
        xp: 75,
        netWorthDelta: 400,
        onStreak: true,
        icon: '◆',
        daysAgo: 2,
      },
      {
        id: 'e2',
        type: 'move',
        category: 'savings',
        title: 'Set up auto-invest ($200/mo)',
        sub: '$200/month now building wealth without thinking.',
        impact: 'In 10 years at current rate: ~$34,000 just from this one move.',
        xp: 60,
        netWorthDelta: 200,
        onStreak: true,
        icon: '◈',
        daysAgo: 8,
      },
      {
        id: 'e3',
        type: 'badge',
        category: 'milestone',
        title: 'Earned "Consistent Builder" badge',
        sub: '21-day streak — top 8% of all VAULT users.',
        impact: 'Users with 21+ day streaks are 3x more likely to hit FI before 50.',
        xp: 50,
        onStreak: true,
        icon: '✦',
        daysAgo: 12,
      },
      {
        id: 'e4',
        type: 'move',
        category: 'debt',
        title: 'Paid extra $300 toward student loan',
        sub: 'Cutting into the principal, not just interest.',
        impact: 'Shaves ~4 months off your payoff date.',
        xp: 12,
        netWorthDelta: 300,
        icon: '◉',
        daysAgo: 19,
      },
    ],
  },
  {
    id: 'm2',
    label: 'APR 2026',
    movesCount: 3,
    xpEarned: 142,
    netWorthGain: 1950,
    grade: 'A',
    entries: [
      {
        id: 'e5',
        type: 'move',
        category: 'savings',
        title: 'Opened High-Yield Savings Account',
        sub: 'Now earning 5x the national average on idle cash.',
        impact: 'On your $8K emergency fund: ~$400/yr in interest vs $80 before.',
        xp: 47,
        netWorthDelta: 80,
        isPinned: true,
        icon: '◈',
        daysAgo: 35,
      },
      {
        id: 'e6',
        type: 'net_worth',
        category: 'milestone',
        title: 'Net worth crossed $40,000',
        sub: 'A milestone most people your age never reach.',
        impact: "You're in the top 31% for your age group.",
        onStreak: true,
        isPinned: true,
        icon: '◉',
        daysAgo: 41,
      },
      {
        id: 'e7',
        type: 'move',
        category: 'investing',
        title: 'Opened Roth IRA',
        sub: 'Tax-free growth for life. One of the best moves you can make.',
        impact: '$500 today in a Roth = ~$5,400 tax-free by retirement.',
        xp: 95,
        netWorthDelta: 500,
        icon: '◆',
        daysAgo: 48,
      },
    ],
  },
  {
    id: 'm3',
    label: 'MAR 2026',
    movesCount: 2,
    xpEarned: 87,
    netWorthGain: 1100,
    grade: 'B',
    entries: [
      {
        id: 'e8',
        type: 'move',
        category: 'savings',
        title: 'Built emergency fund to $5,000',
        sub: '2.5 months of expenses. Protection unlocked.',
        impact: 'You avoided the #1 reason people go into debt: unexpected expenses.',
        xp: 65,
        netWorthDelta: 1000,
        icon: '◈',
        daysAgo: 75,
      },
      {
        id: 'e9',
        type: 'badge',
        category: 'milestone',
        title: 'Completed onboarding · Gold tier unlocked',
        sub: 'Your wealth identity: Builder. Your cohort is waiting.',
        xp: 22,
        icon: '✦',
        daysAgo: 82,
      },
    ],
  },
  {
    id: 'm4',
    label: 'FEB 2026',
    movesCount: 2,
    xpEarned: 55,
    netWorthGain: 600,
    grade: 'B',
    entries: [
      {
        id: 'e10',
        type: 'move',
        category: 'income',
        title: 'Negotiated a raise (+$4,200/yr)',
        sub: 'The highest ROI financial move you can make.',
        impact: 'Over 5 years, that\'s $21,000+ in extra savings compounding.',
        xp: 45,
        netWorthDelta: 350,
        isPinned: true,
        icon: '◇',
        daysAgo: 110,
      },
      {
        id: 'e11',
        type: 'move',
        category: 'debt',
        title: 'Canceled 3 unused subscriptions',
        sub: '$47/mo freed up. Small but it adds up.',
        impact: '$47/mo invested over 10 years = ~$7,800.',
        xp: 10,
        netWorthDelta: 47,
        icon: '◉',
        daysAgo: 118,
      },
    ],
  },
  {
    id: 'm5',
    label: 'JAN 2026',
    movesCount: 1,
    xpEarned: 20,
    netWorthGain: 0,
    grade: 'C',
    entries: [
      {
        id: 'e12',
        type: 'joined',
        category: 'milestone',
        title: 'Joined VAULT',
        sub: 'Your financial biography starts here.',
        impact: 'Users who join VAULT save an average of $4,200 more in their first year.',
        icon: '✦',
        daysAgo: 140,
      },
    ],
  },
];

export const TIMELINE_TOTALS = {
  totalMoves: TIMELINE.reduce((s, m) => s + m.movesCount, 0),
  totalXp: TIMELINE.reduce((s, m) => s + m.xpEarned, 0),
  totalNetWorthGain: TIMELINE.reduce((s, m) => s + m.netWorthGain, 0),
  monthsActive: TIMELINE.length,
};

export const CATEGORY_COLORS: Record<TimelineCategory, string> = {
  savings:   '#C9A96E',
  investing: '#7EB8A4',
  debt:      '#C97A6E',
  income:    '#A4B87E',
  milestone: '#C9A96E',
};

export function daysAgoLabel(days: number): string {
  if (days < 1)   return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7)   return `${days}d ago`;
  if (days < 30)  return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}
