// Type-only: a runtime import of marketSignal would construct the Supabase
// client at module load, which breaks Node-side consumers of INSIGHTS (the
// health check). fetchLiveInsights loads it lazily instead.
import type { NewsItem } from './marketSignal';

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

// Fallback pulse cards shown when live market news is unavailable. These are
// evergreen principles, not news: no dates, no "current" market numbers, no
// claims about the member's own accounts. Anything time-sensitive comes only
// from the live market-news feed (fetchLiveInsights below).
const EVERGREEN = 'Evergreen';

export const INSIGHTS: Insight[] = [
  {
    id: 'i1',
    headline: 'Idle cash in checking quietly loses to inflation.',
    body: 'Standard checking accounts pay near-zero interest while high-yield savings accounts typically pay many times more with the same FDIC protection. Cash you won\'t spend this month is usually working harder in a HYSA.',
    impact: 'Same protection, far higher yield on idle cash',
    impactType: 'negative',
    tag: 'MACRO',
    timeAgo: EVERGREEN,
    saved: false,
  },
  {
    id: 'i2',
    headline: 'Time in the market beats timing the market.',
    body: 'The S&P 500 has averaged roughly 10% per year over the long run, but the gains cluster in a handful of days. Missing the best days by sitting out is one of the most expensive habits in investing. Consistent contributions beat clever entry points.',
    impact: 'Sitting out has a real, compounding cost',
    impactType: 'neutral',
    tag: 'MARKETS',
    timeAgo: EVERGREEN,
    saved: false,
  },
  {
    id: 'i3',
    headline: 'Salary negotiation compounds like an investment.',
    body: 'A raise negotiated once repeats every year and lifts every future raise, bonus, and 401k match calculated from it. Preparation matters more than nerve: document your wins, know the market rate for your role, and ask with a specific number.',
    impact: 'One conversation can move every future paycheck',
    impactType: 'positive',
    tag: 'CAREER',
    timeAgo: EVERGREEN,
    saved: false,
  },
  {
    id: 'i4',
    headline: 'Carrying a credit card balance is a wealth emergency.',
    body: 'Credit card APRs routinely sit above 20%. No mainstream investment reliably beats that, which makes paying off a carried balance one of the highest-return moves available. Pay the statement in full and the rate stops mattering.',
    impact: 'Paying off a balance beats most investments',
    impactType: 'positive',
    tag: 'CREDIT',
    timeAgo: EVERGREEN,
    saved: false,
  },
  {
    id: 'i5',
    headline: 'Inflation is the tax nobody invoices you for.',
    body: 'Even moderate inflation erodes uninvested cash year after year. The defense is simple: keep an emergency fund liquid, keep long-term money invested, and make sure large cash balances are at least earning a competitive savings rate.',
    impact: 'Uninvested cash needs a reason to stay cash',
    impactType: 'neutral',
    tag: 'ECONOMY',
    timeAgo: EVERGREEN,
    saved: false,
  },
  {
    id: 'i6',
    headline: 'Your emergency fund is what makes every other plan real.',
    body: 'The average job search takes several months, and advisors commonly recommend 5–6 months of expenses in reserve. Without that buffer, one bad month converts into high-interest debt and undoes years of progress.',
    impact: 'A funded buffer keeps setbacks from compounding',
    impactType: 'negative',
    tag: 'ECONOMY',
    timeAgo: EVERGREEN,
    saved: false,
  },
  {
    id: 'i7',
    headline: 'Treasuries: the risk-free benchmark worth knowing.',
    body: 'US Treasury yields set the baseline every other investment competes with. When yields are high, cash beyond your emergency fund can earn a genuinely competitive risk-free return through T-bills or a Treasury ladder. Check the current yield before letting cash idle.',
    impact: 'Know the risk-free rate before taking risk',
    impactType: 'positive',
    tag: 'MARKETS',
    timeAgo: EVERGREEN,
    saved: false,
  },
  {
    id: 'i8',
    headline: 'New cars are one of the most expensive habits in personal finance.',
    body: 'A typical new car loses around half its value in the first three years, and financing adds thousands in interest on top. Buying a lightly used car and driving it for years is one of the largest single savings levers most people control.',
    impact: 'A 3-year-old car skips the steepest depreciation',
    impactType: 'negative',
    tag: 'MACRO',
    timeAgo: EVERGREEN,
    saved: false,
  },
  {
    id: 'i9',
    headline: 'Your credit score is worth real money over a lifetime.',
    body: 'Moving from a fair score to an excellent one can save meaningfully on mortgage and loan rates — often tens of thousands of dollars of interest over a mortgage. The two biggest levers: payment history (35%) and utilization (30%). Both are in your control.',
    impact: 'Higher score = cheaper money, for decades',
    impactType: 'positive',
    tag: 'CREDIT',
    timeAgo: EVERGREEN,
    saved: false,
  },
  {
    id: 'i10',
    headline: 'Retirement math: 25x your annual spending.',
    body: 'Social Security replaces only part of pre-retirement income; the rest must come from savings. The common rule of thumb is 25x your annual expenses — at $60K/year of spending, that\'s $1.5M. The earlier the compounding starts, the smaller the required monthly number.',
    impact: 'Know your number: 25x annual expenses',
    impactType: 'neutral',
    tag: 'MACRO',
    timeAgo: EVERGREEN,
    saved: false,
  },
  {
    id: 'i11',
    headline: 'Total compensation is more than the salary line.',
    body: 'Remote flexibility, employer 401k match, equity, health premiums, and commute costs all change what a job actually pays. When comparing offers or negotiating, price the whole package — a higher salary with a worse match and commute can be a pay cut.',
    impact: 'Compare offers on total comp, not salary',
    impactType: 'neutral',
    tag: 'CAREER',
    timeAgo: EVERGREEN,
    saved: false,
  },
  {
    id: 'i12',
    headline: 'Market dips are Roth conversion season.',
    body: 'Converting traditional IRA funds to Roth during a downturn means paying tax on a temporarily lower account value — and the recovery then compounds tax-free forever. If a conversion is on your list, a dip is when it\'s cheapest.',
    impact: 'Downturns cut the tax bill on conversions',
    impactType: 'positive',
    tag: 'MARKETS',
    timeAgo: EVERGREEN,
    saved: false,
  },
];

// ── Live pulse cards from real market news ───────────────────────────────────

// Map news categories to Pulse tags
const NEWS_TO_TAG: Record<string, string> = {
  FED: 'MACRO', TECH: 'MARKETS', ENERGY: 'MARKETS',
  CRYPTO: 'MARKETS', EARNINGS: 'MARKETS', MACRO: 'MACRO', LEGAL: 'ECONOMY',
};

// Short "what this means for you" pill driven by sentiment + category
export function buildImpactPill(sentiment: string, category: string): string {
  if (sentiment === 'bullish') {
    if (category === 'FED')      return 'Lock in HYSA rates — the window may be short';
    if (category === 'EARNINGS') return 'Strong earnings season — your portfolio may benefit';
    return 'Positive market signal for wealth builders';
  }
  if (sentiment === 'bearish') {
    if (category === 'FED')  return 'HYSA yields may decline — consider longer-term vehicles';
    if (category === 'TECH') return 'Tech exposure may face short-term pressure';
    return 'Defensive positioning may protect your wealth';
  }
  return 'Monitor this for impact on your financial plan';
}

// Same output as marketSignal's timeAgoNews, duplicated here so this module
// stays importable without loading the Supabase client (see import note above).
function formatMinutesAgo(minutes: number): string {
  if (minutes < 60)   return `${minutes}m ago`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
  return `${Math.floor(minutes / 1440)}d ago`;
}

export function newsToInsight(news: NewsItem, idx: number): Insight {
  const tag        = NEWS_TO_TAG[news.category] ?? 'MACRO';
  const impactType = news.sentiment === 'bullish' ? 'positive'
                   : news.sentiment === 'bearish' ? 'negative' : 'neutral';
  return {
    id:         `live-${news.id ?? idx}`,
    headline:   news.headline,
    body:       news.impact,
    impact:     buildImpactPill(news.sentiment, news.category),
    impactType: impactType as Insight['impactType'],
    tag,
    timeAgo:    formatMinutesAgo(news.minutesAgo),
    saved:      false,
  };
}

// Pure mapping step, exposed for tests: only a real batch of news (3+) is
// worth replacing the evergreen set — one stray headline isn't a feed.
export function liveNewsToInsights(items: NewsItem[] | null | undefined): Insight[] | null {
  if (!items || items.length < 3) return null;
  return items.map(newsToInsight);
}

// Live pulse cards for the feed + Pulse tab. Returns null when the news feed
// is unavailable so callers fall back to the evergreen INSIGHTS above.
export async function fetchLiveInsights(): Promise<Insight[] | null> {
  try {
    const { fetchMarketNews } = await import('./marketSignal');
    return liveNewsToInsights(await fetchMarketNews());
  } catch {
    return null;
  }
}
