export type MoverDirection = 'up' | 'down';
export type Sentiment = 'bullish' | 'bearish' | 'neutral';
export type NewsCategory = 'FED' | 'TECH' | 'ENERGY' | 'CRYPTO' | 'EARNINGS' | 'MACRO' | 'LEGAL';

export interface Mover {
  id: string;
  ticker: string;
  name: string;
  price: string;
  change: number;        // percent
  direction: MoverDirection;
  reason: string;        // short tag: "Earnings Beat", "FDA Approval"
  detail: string;        // expanded explanation on tap
  sector: string;
  weeklyChange: number;  // % over past 5 days
}

export interface VolumeSpikeStock {
  id: string;
  ticker: string;
  name: string;
  multiplier: number;   // e.g. 4.2 = 4.2x average volume
  price: string;
  dayChange: number;
  reason: string;
}

export interface NewsItem {
  id: string;
  headline: string;
  source: string;
  minutesAgo: number;
  sentiment: Sentiment;
  category: NewsCategory;
  impact: string;        // one-line "what this means"
}

export interface VaultAngle {
  id: string;
  headline: string;
  body: string;
  tag: string;
  actionable: boolean;
  moveSuggestion?: string;
}

export interface MarketSnapshot {
  sp500Change: number;
  nasdaqChange: number;
  dowChange: number;
  vix: number;
  vixLabel: string;    // "Elevated", "Low", "Extreme Fear", "Greed"
  marketStatus: 'OPEN' | 'CLOSED' | 'PRE-MARKET';
  lastUpdated: string;
}

export const MARKET_SNAPSHOT: MarketSnapshot = {
  sp500Change: -0.84,
  nasdaqChange: -1.42,
  dowChange: -0.31,
  vix: 22.4,
  vixLabel: 'Elevated',
  marketStatus: 'CLOSED',
  lastUpdated: '4:00 PM ET',
};

export const HOT_MOVERS: Mover[] = [
  {
    id: 'mv1',
    ticker: 'APP',
    name: 'AppLovin',
    price: '$312.40',
    change: 22.1,
    direction: 'up',
    reason: 'AI Platform Launch',
    detail: 'AppLovin unveiled a new AI-driven ad targeting system showing 40% better conversion rates in beta. Analysts upgraded 6 firms from Hold to Buy within 24 hours.',
    sector: 'Tech',
    weeklyChange: 28.4,
  },
  {
    id: 'mv2',
    ticker: 'NVDA',
    name: 'Nvidia',
    price: '$1,087.20',
    change: 8.2,
    direction: 'up',
    reason: 'Earnings Beat',
    detail: 'Nvidia beat earnings estimates by 23% and raised full-year guidance 18% above consensus. Data center revenue hit $22B — its fourth consecutive record quarter.',
    sector: 'Tech',
    weeklyChange: 11.3,
  },
  {
    id: 'mv3',
    ticker: 'META',
    name: 'Meta',
    price: '$598.70',
    change: 5.7,
    direction: 'up',
    reason: 'AI Ad Revenue',
    detail: 'Meta reported AI-driven ad targeting lifted revenue by 34% YoY. Llama 4 integration in Facebook and Instagram boosted engagement metrics to all-time highs.',
    sector: 'Tech',
    weeklyChange: 7.2,
  },
  {
    id: 'mv4',
    ticker: 'TSLA',
    name: 'Tesla',
    price: '$172.80',
    change: -11.4,
    direction: 'down',
    reason: 'Production Miss',
    detail: 'Q1 deliveries came in 18% below estimates. Analyst concern has shifted to CEO attention split across five companies. Three firms cut price targets by 25%+ this week.',
    sector: 'EV/Auto',
    weeklyChange: -14.1,
  },
  {
    id: 'mv5',
    ticker: 'SMCI',
    name: 'Super Micro',
    price: '$38.60',
    change: -9.3,
    direction: 'down',
    reason: 'SEC Investigation',
    detail: 'SEC reopened an accounting investigation into Super Micro\'s revenue recognition practices. The company delayed its annual report filing for the second consecutive year.',
    sector: 'Tech',
    weeklyChange: -17.8,
  },
  {
    id: 'mv6',
    ticker: 'AMZN',
    name: 'Amazon',
    price: '$186.40',
    change: -3.8,
    direction: 'down',
    reason: 'AWS Slowdown',
    detail: 'AWS cloud revenue growth slowed to 14% YoY vs 17% expected. Microsoft Azure gained share this quarter. Guidance for Q2 came in below the Street.',
    sector: 'Tech/Cloud',
    weeklyChange: -5.2,
  },
];

export const VOLUME_SPIKES: VolumeSpikeStock[] = [
  {
    id: 'vs1',
    ticker: 'GME',
    name: 'GameStop',
    multiplier: 8.2,
    price: '$24.80',
    dayChange: 31.4,
    reason: 'Social media activity spike — r/WallStreetBets trending',
  },
  {
    id: 'vs2',
    ticker: 'PLTR',
    name: 'Palantir',
    multiplier: 4.1,
    price: '$42.20',
    dayChange: 6.8,
    reason: '$1.2B DoD contract renewal confirmed',
  },
  {
    id: 'vs3',
    ticker: 'RIVN',
    name: 'Rivian',
    multiplier: 3.7,
    price: '$14.90',
    dayChange: -8.2,
    reason: 'Amazon cancels 10,000-van order rumor unconfirmed',
  },
  {
    id: 'vs4',
    ticker: 'AMC',
    name: 'AMC Entertainment',
    multiplier: 6.7,
    price: '$5.40',
    dayChange: 18.9,
    reason: 'Options activity spike — large call buying detected',
  },
];

export const BREAKING_NEWS: NewsItem[] = [
  {
    id: 'n1',
    headline: 'Fed holds rates at 4.75% — third consecutive pause',
    source: 'Reuters',
    minutesAgo: 47,
    sentiment: 'neutral',
    category: 'FED',
    impact: 'HYSA rates stay elevated. Your high-yield savings is still winning.',
  },
  {
    id: 'n2',
    headline: 'Nvidia\'s Blackwell chips see demand surge from sovereign wealth funds',
    source: 'Bloomberg',
    minutesAgo: 112,
    sentiment: 'bullish',
    category: 'TECH',
    impact: 'AI infrastructure spend accelerating — tech heavy portfolios may outperform.',
  },
  {
    id: 'n3',
    headline: 'Bitcoin crosses $96,000 as institutional ETF inflows hit record $2.1B weekly',
    source: 'CoinDesk',
    minutesAgo: 180,
    sentiment: 'bullish',
    category: 'CRYPTO',
    impact: 'BTC volatility still 4x equity volatility — position sizing matters.',
  },
  {
    id: 'n4',
    headline: 'Treasury yields invert again — 2-year above 10-year for 8th month',
    source: 'WSJ',
    minutesAgo: 240,
    sentiment: 'bearish',
    category: 'MACRO',
    impact: 'Persistent inversion historically precedes recessions by 12–18 months.',
  },
  {
    id: 'n5',
    headline: 'DOJ antitrust trial vs Apple begins — app store fees at stake',
    source: 'FT',
    minutesAgo: 320,
    sentiment: 'bearish',
    category: 'LEGAL',
    impact: 'AAPL faces $15–20B annual revenue risk if app store rules change.',
  },
  {
    id: 'n6',
    headline: 'Oil drops below $68 as OPEC+ agrees to production increase',
    source: 'AP',
    minutesAgo: 480,
    sentiment: 'neutral',
    category: 'ENERGY',
    impact: 'Lower gas prices = more consumer spending. Watch retail & travel stocks.',
  },
];

export const VAULT_ANGLES: VaultAngle[] = [
  {
    id: 'va1',
    headline: 'Tech volatility = rebalancing signal',
    body: 'With NVDA +8% and TSLA -11% in the same week, tech allocations can drift fast. If tech is over 30% of your portfolio, this could be a natural moment to trim — not panic, just rebalance.',
    tag: 'PORTFOLIO',
    actionable: true,
    moveSuggestion: 'Review 401(k) allocation',
  },
  {
    id: 'va2',
    headline: 'Fed pause = HYSA golden window',
    body: 'The Fed held again. High-yield savings accounts are still at 4.5–5.1% — the highest in 16 years. Every month this continues, idle cash in a checking account costs you real money.',
    tag: 'SAVINGS',
    actionable: true,
    moveSuggestion: 'Move idle cash to HYSA',
  },
];

export const SENTIMENT_COLORS: Record<Sentiment, string> = {
  bullish: '#7EB8A4',
  bearish: '#C97A6E',
  neutral: '#C9A96E',
};

export const NEWS_CATEGORY_COLORS: Record<NewsCategory, string> = {
  FED:      '#C9A96E',
  TECH:     '#7EA8B8',
  ENERGY:   '#B8A47E',
  CRYPTO:   '#9A7EB8',
  EARNINGS: '#7EB8A4',
  MACRO:    '#C9A96E',
  LEGAL:    '#C97A6E',
};

export function timeAgoNews(minutes: number): string {
  if (minutes < 60)   return `${minutes}m ago`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
  return `${Math.floor(minutes / 1440)}d ago`;
}
