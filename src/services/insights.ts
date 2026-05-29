export interface Insight {
  id: string;
  headline: string;
  body: string;
  impact: string;
  impactType: 'positive' | 'negative' | 'neutral';
  tag: string;
  timeAgo: string;
  saved: boolean;
}

export const INSIGHTS: Insight[] = [
  {
    id: 'i1',
    headline: 'Fed held rates steady. Your HYSA is still winning.',
    body: 'The Federal Reserve held interest rates at 5.25%–5.50% today. For VAULT members with high-yield savings accounts, this means you\'re still earning 4.8–5.1% on idle cash — 50x what a standard checking account pays.',
    impact: 'Your $2,340 in checking is losing $112/year vs HYSA',
    impactType: 'negative',
    tag: 'MACRO',
    timeAgo: '2h ago',
    saved: false,
  },
  {
    id: 'i2',
    headline: 'S&P 500 up 1.4% this week. Are you invested?',
    body: 'Markets rallied on strong jobs data. If you\'re not in the market, you\'re watching returns happen for other people. The historical average return is 10.7%/year — your HYSA earns 5%. The gap is the cost of staying on the sidelines.',
    impact: 'Your investment velocity score is 61/100 — room to grow',
    impactType: 'neutral',
    tag: 'MARKETS',
    timeAgo: '5h ago',
    saved: true,
  },
  {
    id: 'i3',
    headline: 'The salary negotiation window is open. Most miss it.',
    body: 'Data from 40,000 salary negotiations shows the highest success rate (73%) comes at the 9–12 month mark in a role. You\'re in that window right now. The average successful negotiation added $11,400 to annual comp.',
    impact: 'You\'re in the optimal negotiation window right now',
    impactType: 'positive',
    tag: 'CAREER',
    timeAgo: '1d ago',
    saved: false,
  },
  {
    id: 'i4',
    headline: 'Credit card APRs hit 22.8% average. Carry no balance.',
    body: 'The average credit card APR in the US hit a record 22.8%. Carrying even a $1,000 balance costs $228/year in interest alone. At VAULT Gold tier, you qualify for partner cards at 17.9% — a 27% lower rate.',
    impact: 'Gold tier perk: access to 17.9% APR partner cards',
    impactType: 'positive',
    tag: 'CREDIT',
    timeAgo: '2d ago',
    saved: false,
  },
  {
    id: 'i5',
    headline: 'Inflation cooling. Your purchasing power is recovering.',
    body: 'CPI came in at 2.4% — the lowest in 3 years. In real terms, your salary has more purchasing power today than it did 18 months ago. This is also a signal that the Fed may cut rates, which could slightly lower HYSA yields in Q3.',
    impact: 'Lock in today\'s HYSA rates before potential cuts',
    impactType: 'neutral',
    tag: 'ECONOMY',
    timeAgo: '3d ago',
    saved: false,
  },
];
