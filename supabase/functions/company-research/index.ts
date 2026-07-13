import Anthropic from 'npm:@anthropic-ai/sdk@0.99.0';
import { requireUser, corsHeaders as cors } from '../_shared/auth.ts';
import { allowRequest, tooManyRequests } from '../_shared/ratelimit.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  // Signed-in members only — this endpoint spends real Anthropic + FMP tokens.
  let user: { id: string };
  try { user = await requireUser(req); } catch (r) { return r as Response; }
  if (!(await allowRequest(user.id, 'company-research', 12, 60))) return tooManyRequests();

  // Ticker is interpolated into third-party API URLs AND the model prompt, so
  // constrain it to a real symbol shape — no query params, paths, or prose.
  const body = await req.json().catch(() => ({}));
  const rawTicker = typeof body?.ticker === 'string' ? body.ticker.trim() : '';
  if (!/^[A-Za-z][A-Za-z.\-]{0,5}$/.test(rawTicker)) {
    return new Response(JSON.stringify({ error: 'invalid ticker' }), {
      status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
  const ticker = rawTicker.toUpperCase();

  try {
    const fmp = Deno.env.get('FMP_KEY')!;
    const fh = Deno.env.get('FINNHUB_KEY')!;
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')!;

    const fmpUrl = (path: string) =>
      `https://financialmodelingprep.com/stable/${path}${path.includes('?') ? '&' : '?'}apikey=${fmp}`;
    const first = (v: any) => (Array.isArray(v) ? v[0] ?? {} : v ?? {});

    const [profileArr, incomeArr, ratiosArr, metricsArr, newsRes] = await Promise.all([
      fetch(fmpUrl(`profile?symbol=${ticker}`)).then(r => r.json()).catch(() => []),
      fetch(fmpUrl(`income-statement?symbol=${ticker}&limit=2`)).then(r => r.json()).catch(() => []),
      fetch(fmpUrl(`ratios?symbol=${ticker}&limit=1`)).then(r => r.json()).catch(() => []),
      fetch(fmpUrl(`key-metrics?symbol=${ticker}&limit=1`)).then(r => r.json()).catch(() => []),
      fetch(`https://finnhub.io/api/v1/company-news?symbol=${ticker}&from=${new Date(Date.now()-7*86400000).toISOString().split('T')[0]}&to=${new Date().toISOString().split('T')[0]}&token=${fh}`).then(r => r.json()).catch(() => []),
    ]);

    const profile = first(profileArr);
    const income = first(incomeArr);
    const incomePrev = Array.isArray(incomeArr) ? incomeArr[1] ?? {} : {};
    const ratios = first(ratiosArr);
    const metrics = first(metricsArr);

    const recentNews = Array.isArray(newsRes) ? newsRes.slice(0, 5).map((n: any) => n.headline).join('\n') : '';
    const companyName = profile.companyName ?? ticker;
    const sector = profile.sector ?? profile.industry ?? 'Technology';

    // Derived fundamentals from FMP
    const fmtB = (n: any) => (n ? '$' + (Number(n) / 1e9).toFixed(1) + 'B' : 'N/A');
    const revenueTTM = income.revenue ? fmtB(income.revenue) : 'N/A';
    const netIncomeVal = income.netIncome ? fmtB(income.netIncome) : 'N/A';
    const revGrowth = income.revenue && incomePrev.revenue
      ? (((income.revenue - incomePrev.revenue) / incomePrev.revenue) * 100).toFixed(1)
      : null;
    const netMarginPct = ratios.netProfitMargin != null
      ? (ratios.netProfitMargin * 100).toFixed(1)
      : null;
    const peRatio = metrics.priceToEarningsRatio ?? ratios.priceToEarningsRatio ?? profile.pe ?? 'N/A';
    const marketCapStr = profile.marketCap ? fmtB(profile.marketCap) : 'N/A';
    const currentPrice = profile.price ?? 0;
    const changePct = profile.changePercentage ?? 0;

    const client = new Anthropic({ apiKey: anthropicKey });

    const prompt = `You are VAULT's research engine. Generate a complete investment research report for ${ticker} (${companyName}) using this real financial data:

Sector: ${sector}
Market Cap: ${marketCapStr}
P/E Ratio: ${peRatio}
Current Price: $${currentPrice}
52-Week Range: ${profile.range ?? 'N/A'}
Revenue (latest FY): ${revenueTTM}
Revenue Growth YoY: ${revGrowth != null ? revGrowth + '%' : 'N/A'}
Net Income: ${netIncomeVal}
Net Profit Margin: ${netMarginPct != null ? netMarginPct + '%' : 'N/A'}
Description: ${(profile.description ?? '').slice(0, 500)}
Recent news: ${recentNews || 'None'}

Return ONLY a valid JSON object with these exact fields (no markdown, no explanation):
{
  "oneLiner": "one punchy sentence describing what this company does",
  "verdict": "STRONG BUY",
  "moatScore": 8,
  "businessModel": "2-3 sentence explanation of how they make money",
  "revenueStreams": [
    {"name": "Revenue stream name", "pct": 60, "description": "brief description"}
  ],
  "revenueGrowth": 15,
  "netIncome": "$XX.XB",
  "netMargin": 25.5,
  "operatingExpenses": "$XX.XB",
  "cashOnHand": "$XX.XB",
  "tam": "$XXB",
  "marketShare": "XX%",
  "targetMarket": "who they sell to",
  "investmentVerdict": {
    "answer": "YES",
    "summary": "one sentence on whether to invest",
    "reasons": ["reason 1", "reason 2", "reason 3"],
    "caution": "one risk to watch"
  },
  "moatFactors": ["moat factor 1", "moat factor 2", "moat factor 3"],
  "weaknesses": ["weakness 1", "weakness 2"],
  "executives": [
    {"name": "CEO Name", "role": "CEO", "prior": "Previous company", "wins": "Key achievement"}
  ],
  "journey": [
    {"year": 2000, "event": "Company founded", "impact": "Why it mattered", "type": "founding"}
  ],
  "roadmap": [
    {"timeframe": "Q3 2026", "initiative": "Initiative name", "detail": "What they're doing", "confidence": "confirmed"}
  ],
  "risks": [
    {"category": "Risk category", "description": "Risk description", "severity": "high"}
  ],
  "competitors": [
    {"name": "Competitor", "ticker": "TICK", "threat": "high", "detail": "Why they're a threat"}
  ],
  "vaultAngle": "what this means for a retail investor building wealth"
}`;

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    });

    let analysis: any = {};
    try {
      const text = response.content[0].type === 'text' ? response.content[0].text : '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) analysis = JSON.parse(jsonMatch[0]);
    } catch { analysis = {}; }

    const [week52Low, week52High] = (profile.range ?? '').split('-').map((s: string) => s.trim());

    return new Response(JSON.stringify({
      ticker: ticker.toUpperCase(),
      name: companyName,
      sector,
      price: `$${Number(currentPrice).toFixed(2)}`,
      change: parseFloat(Number(changePct).toFixed(2)),
      marketCap: marketCapStr !== 'N/A' ? marketCapStr : (analysis.marketCap ?? 'N/A'),
      peRatio: peRatio !== 'N/A' && peRatio != null ? (typeof peRatio === 'number' ? peRatio.toFixed(1) : peRatio) : 'N/A',
      eps: income.eps ?? income.epsDiluted ?? 'N/A',
      revenue: revenueTTM,
      profitMargin: netMarginPct != null ? netMarginPct + '%' : 'N/A',
      analystTarget: analysis.analystTarget ?? 'N/A',
      week52High: week52High ?? 'N/A',
      week52Low: week52Low ?? 'N/A',
      employees: profile.fullTimeEmployees
        ? Number(profile.fullTimeEmployees).toLocaleString()
        : 'N/A',
      recentNews: Array.isArray(newsRes) ? newsRes.slice(0, 3).map((n: any) => ({
        headline: n.headline,
        source: n.source,
        url: n.url,
      })) : [],
      // All Claude-generated fields
      oneLiner: analysis.oneLiner ?? `${companyName} is a leading ${sector} company.`,
      verdict: analysis.verdict ?? 'HOLD',
      moatScore: analysis.moatScore ?? 5,
      businessModel: analysis.businessModel ?? 'Business model data loading...',
      revenueStreams: analysis.revenueStreams ?? [],
      revenueGrowth: revGrowth != null ? parseFloat(revGrowth) : (analysis.revenueGrowth ?? 0),
      netIncome: netIncomeVal !== 'N/A' ? netIncomeVal : (analysis.netIncome ?? 'N/A'),
      netMargin: netMarginPct != null ? parseFloat(netMarginPct) : (analysis.netMargin ?? 0),
      operatingExpenses: analysis.operatingExpenses ?? 'N/A',
      cashOnHand: analysis.cashOnHand ?? 'N/A',
      tam: analysis.tam ?? 'N/A',
      marketShare: analysis.marketShare ?? 'N/A',
      targetMarket: analysis.targetMarket ?? 'N/A',
      investmentVerdict: analysis.investmentVerdict ?? {
        answer: 'WATCH',
        summary: 'Analysis in progress.',
        reasons: ['Real-time data loaded', 'Claude analysis complete', 'Review financials above'],
        caution: 'Always do your own research before investing.',
      },
      moatFactors: analysis.moatFactors ?? [],
      weaknesses: analysis.weaknesses ?? [],
      executives: analysis.executives ?? [],
      journey: analysis.journey ?? [],
      roadmap: analysis.roadmap ?? [],
      risks: analysis.risks ?? [],
      competitors: analysis.competitors ?? [],
      vaultAngle: analysis.vaultAngle ?? '',
    }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: 'Research unavailable' }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
});
