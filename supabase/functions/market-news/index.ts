import { requireUser, corsHeaders as cors } from '../_shared/auth.ts';
import { allowRequest, tooManyRequests } from '../_shared/ratelimit.ts';

const CATEGORY_MAP: Record<string, string> = {
  'federal reserve': 'FED', 'fed ': 'FED', 'interest rate': 'FED', 'fomc': 'FED',
  'nvidia': 'TECH', 'apple': 'TECH', 'microsoft': 'TECH', 'google': 'TECH', 'meta': 'TECH', 'ai ': 'TECH',
  'bitcoin': 'CRYPTO', 'ethereum': 'CRYPTO', 'crypto': 'CRYPTO', 'coinbase': 'CRYPTO',
  'oil': 'ENERGY', 'opec': 'ENERGY', 'natural gas': 'ENERGY', 'exxon': 'ENERGY',
  'earnings': 'EARNINGS', 'revenue': 'EARNINGS', 'guidance': 'EARNINGS',
  'gdp': 'MACRO', 'inflation': 'MACRO', 'cpi': 'MACRO', 'unemployment': 'MACRO', 'recession': 'MACRO',
  'sec': 'LEGAL', 'doj': 'LEGAL', 'lawsuit': 'LEGAL', 'antitrust': 'LEGAL',
};

function categorize(headline: string): string {
  const lower = headline.toLowerCase();
  for (const [keyword, cat] of Object.entries(CATEGORY_MAP)) {
    if (lower.includes(keyword)) return cat;
  }
  return 'MACRO';
}

function sentiment(headline: string): string {
  const lower = headline.toLowerCase();
  const bullish = ['surge', 'soar', 'beat', 'record', 'gain', 'rise', 'rally', 'jump', 'boost'];
  const bearish = ['drop', 'fall', 'miss', 'lose', 'decline', 'plunge', 'cut', 'warn', 'risk', 'crash'];
  if (bullish.some(w => lower.includes(w))) return 'bullish';
  if (bearish.some(w => lower.includes(w))) return 'bearish';
  return 'neutral';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  // Signed-in members only, and throttled — Alpha Vantage's free tier is only
  // ~25 requests/day total, so an unauthenticated endpoint is trivially drained.
  let user: { id: string };
  try { user = await requireUser(req); } catch (r) { return r as Response; }
  if (!(await allowRequest(user.id, 'market-news', 20, 60))) return tooManyRequests();

  try {
    const fhKey = Deno.env.get('FINNHUB_KEY')!;
    const avKey = Deno.env.get('ALPHA_VANTAGE_KEY')!;

    // Fetch general market news from Finnhub
    const now = Math.floor(Date.now() / 1000);
    const yesterday = now - 86400;
    const [fhRes, avRes] = await Promise.all([
      fetch(`https://finnhub.io/api/v1/news?category=general&minId=0&token=${fhKey}`).then(r => r.json()),
      fetch(`https://www.alphavantage.co/query?function=NEWS_SENTIMENT&topics=finance,economy,financial_markets&limit=20&apikey=${avKey}`).then(r => r.json()),
    ]);

    const finnhubNews = Array.isArray(fhRes) ? fhRes.slice(0, 10) : [];
    const avNews = avRes?.feed ?? [];

    // Merge and format
    const articles = [
      ...finnhubNews.map((n: any, i: number) => ({
        id: `fh-${i}`,
        headline: n.headline ?? '',
        source: n.source ?? 'Finnhub',
        minutesAgo: Math.round((now - (n.datetime ?? now)) / 60),
        sentiment: sentiment(n.headline ?? ''),
        category: categorize(n.headline ?? ''),
        impact: n.summary ? n.summary.slice(0, 120) + '…' : 'Market impact pending analysis.',
        url: n.url,
      })),
      ...avNews.slice(0, 10).map((n: any, i: number) => ({
        id: `av-${i}`,
        headline: n.title ?? '',
        source: n.source ?? 'Alpha Vantage',
        minutesAgo: Math.round((Date.now() - new Date(n.time_published?.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/, '$1-$2-$3T$4:$5:$6')).getTime()) / 60000),
        sentiment: n.overall_sentiment_label?.toLowerCase().includes('bull') ? 'bullish'
          : n.overall_sentiment_label?.toLowerCase().includes('bear') ? 'bearish' : 'neutral',
        category: categorize(n.title ?? ''),
        impact: n.summary ? n.summary.slice(0, 120) + '…' : 'Analysis in progress.',
        url: n.url,
      })),
    ]
      .filter(a => a.headline.length > 10)
      .sort((a, b) => a.minutesAgo - b.minutesAgo)
      .slice(0, 15);

    return new Response(JSON.stringify({ articles }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: 'Request failed' }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
});
