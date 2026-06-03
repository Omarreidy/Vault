export type ScanVerdict = 'ASSET' | 'LIABILITY' | 'BUDGET CHECK';

export interface ScanResult {
  id: string;
  verdict: ScanVerdict;
  itemName: string;
  emoji: string;
  tagline: string;
  monthlyCost?: string;
  annualImpact: string;
  wealthScoreImpact: string;
  insight: string;
  tip: string;
  xp: number;
}

export const VERDICT_COLORS: Record<ScanVerdict, string> = {
  'ASSET':        '#7EB8A4',
  'LIABILITY':    '#C97A6E',
  'BUDGET CHECK': '#C9A96E',
};

export const VERDICT_ICONS: Record<ScanVerdict, string> = {
  'ASSET':        '◆',
  'LIABILITY':    '◉',
  'BUDGET CHECK': '◇',
};

// Mock scan results — cycles through on each scan in demo mode
export const MOCK_SCAN_RESULTS: ScanResult[] = [
  {
    id: 'sr1',
    verdict: 'LIABILITY',
    itemName: 'Dining Out',
    emoji: '🍽️',
    tagline: 'Enjoyable today. Expensive over time.',
    monthlyCost: '$65–120 per visit',
    annualImpact: '−$2,400/yr avg for your spending tier',
    wealthScoreImpact: '−3 pts if over budget',
    insight: 'Dining is the #1 discretionary spend that separates average savers from wealth builders. At your current pace you\'re at 140% of your peer group average.',
    tip: 'Set a $380/mo dining target. Redirect the gap to your HYSA — that\'s $6,120/yr working for you instead.',
    xp: 15,
  },
  {
    id: 'sr2',
    verdict: 'LIABILITY',
    itemName: 'New iPhone / Smartphone',
    emoji: '📱',
    tagline: 'Loses 20% of value the moment you open it.',
    monthlyCost: '$50–80/mo on payment plan',
    annualImpact: '−$800 in depreciation in year one',
    wealthScoreImpact: '−5 pts if financed',
    insight: 'Smartphones depreciate 40–60% in two years. Financing one at 0% APR still locks up cash flow that could be compounding. Flagship phones are a status purchase disguised as a necessity.',
    tip: 'Buy refurbished (1 generation back) and invest the $400 difference. Over 5 years that\'s $590 compounded.',
    xp: 15,
  },
  {
    id: 'sr3',
    verdict: 'BUDGET CHECK',
    itemName: 'Coffee / Café Visit',
    emoji: '☕',
    tagline: 'Not the problem people think — but it adds up.',
    monthlyCost: '$80–120/mo if daily habit',
    annualImpact: '$1,200/yr for a daily $5 habit',
    wealthScoreImpact: 'Neutral if within budget',
    insight: 'The "latte factor" is overblown as a wealth killer — but $1,200/yr is still real money. The question isn\'t whether to cut it, it\'s whether it\'s intentional.',
    tip: 'Keep it if it brings value. But log it — most people spending $120/mo think they\'re spending $40.',
    xp: 10,
  },
  {
    id: 'sr4',
    verdict: 'LIABILITY',
    itemName: 'Car / Vehicle',
    emoji: '🚗',
    tagline: 'The most expensive depreciating asset most people own.',
    monthlyCost: '$800–1,200/mo all-in (payment + insurance + gas + maintenance)',
    annualImpact: '−$10,000–$15,000/yr true cost',
    wealthScoreImpact: '−12 pts if over 15% of take-home',
    insight: 'Cars are the single biggest wealth destroyer in most household budgets. The average American spends $10,728/yr on their vehicle. That same money invested over 20 years = $430,000.',
    tip: 'If you must buy, buy used (2–3 years old) and pay cash. Lease only if you need a write-off. Never finance a depreciating asset at more than 3% of your annual income.',
    xp: 15,
  },
  {
    id: 'sr5',
    verdict: 'ASSET',
    itemName: 'Investment / Brokerage Account',
    emoji: '📈',
    tagline: 'Money making money. This is the game.',
    annualImpact: '+7–10% avg annual return (S&P 500 historical)',
    wealthScoreImpact: '+8 pts for active investing habit',
    insight: 'Every dollar invested today doubles roughly every 7 years at 10% return. A $10,000 investment at 30 is worth $174,000 at 65. This is exactly where your money should be working.',
    tip: 'Make sure your expense ratios are under 0.10%. High-fee funds silently drain 30–40% of your long-term gains.',
    xp: 20,
  },
  {
    id: 'sr6',
    verdict: 'ASSET',
    itemName: 'Book / Educational Material',
    emoji: '📚',
    tagline: 'Highest ROI purchase you can make.',
    monthlyCost: '$15–30',
    annualImpact: 'Uncapped — one idea can change your income trajectory',
    wealthScoreImpact: '+2 pts for learning habit',
    insight: 'Warren Buffett reads 500 pages a day. The wealthy spend 5x more on education than entertainment. A single book has historically been worth thousands in applied knowledge.',
    tip: 'Prioritize books on negotiation, investing, and compounding. The return on a $20 book that teaches you to negotiate a $5K raise is 25,000%.',
    xp: 20,
  },
  {
    id: 'sr7',
    verdict: 'LIABILITY',
    itemName: 'Designer Clothing / Luxury Item',
    emoji: '👟',
    tagline: 'Buys status. Sells for cents on the dollar.',
    monthlyCost: 'One-time: $200–2,000+',
    annualImpact: '−60–80% value within 1 year',
    wealthScoreImpact: '−4 pts if impulse purchase',
    insight: 'Luxury goods depreciate faster than most people realize. A $500 designer item resells for $150 within a year. You\'re paying a premium to borrow status you don\'t own.',
    tip: 'If you want luxury, buy pre-owned (60% off) or wait for it as a reward milestone. Let your net worth be your status signal, not your shoes.',
    xp: 15,
  },
  {
    id: 'sr8',
    verdict: 'BUDGET CHECK',
    itemName: 'Gym / Fitness Membership',
    emoji: '🏋️',
    tagline: 'Asset if you use it. Liability if you don\'t.',
    monthlyCost: '$30–200/mo',
    annualImpact: 'Up to $2,400/yr for unused premium gyms',
    wealthScoreImpact: '+3 pts if active · −3 pts if ghost member',
    insight: 'The average gym member visits 1.7x/week. If you\'re going less than 3x/week, your cost-per-visit math doesn\'t work. Health is an asset — overpaying for it isn\'t.',
    tip: 'Calculate your true cost per visit. Under $5/visit = good value. Over $15/visit = you\'re a gym donor. Consider a $25/mo Planet Fitness + free outdoor alternatives.',
    xp: 10,
  },
  {
    id: 'sr9',
    verdict: 'ASSET',
    itemName: 'Real Estate / Property',
    emoji: '🏡',
    tagline: 'Long-term asset — but not a simple one.',
    annualImpact: '+3–5% avg appreciation + equity build',
    wealthScoreImpact: '+10 pts for home ownership milestone',
    insight: 'Real estate is the most accessible wealth-building vehicle for most people. But the true value is in forced savings (equity), not just appreciation. Transaction costs mean you need 5+ years to break even.',
    tip: 'Treat your home as a long-term hold, not a flip. Your primary residence isn\'t an investment — it\'s a place to live that also builds equity. True investment real estate is rental income.',
    xp: 20,
  },
  {
    id: 'sr10',
    verdict: 'LIABILITY',
    itemName: 'Subscription Service',
    emoji: '📺',
    tagline: 'Small leaks sink big ships.',
    monthlyCost: '$10–20/mo per service',
    annualImpact: '10 subscriptions = $1,800/yr quietly leaving',
    wealthScoreImpact: '−2 pts per unused subscription',
    insight: 'The average American pays for 4.5 subscriptions they forgot about. Each one feels like "just $15" — but $15 × 12 × 10 years = $1,800 that could have compounded to $2,900.',
    tip: 'Do an annual subscription audit. Cancel anything you haven\'t used in 30 days. The friction of re-subscribing is worth $180/yr per service.',
    xp: 15,
  },
];

let scanIndex = 0;

export function getMockScanResult(): ScanResult {
  const result = MOCK_SCAN_RESULTS[scanIndex % MOCK_SCAN_RESULTS.length];
  scanIndex++;
  return result;
}
