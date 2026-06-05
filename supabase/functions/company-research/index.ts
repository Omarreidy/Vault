import Anthropic from 'npm:@anthropic-ai/sdk@0.99.0';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const { ticker } = await req.json();
    if (!ticker) throw new Error('ticker required');

    const av = Deno.env.get('ALPHA_VANTAGE_KEY')!;
    const fh = Deno.env.get('FINNHUB_KEY')!;
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')!;

    const [overviewRes, quoteRes, incomeRes, newsRes, profileRes] = await Promise.all([
      fetch(`https://www.alphavantage.co/query?function=OVERVIEW&symbol=${ticker}&apikey=${av}`).then(r => r.json()),
      fetch(`https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${fh}`).then(r => r.json()),
      fetch(`https://www.alphavantage.co/query?function=INCOME_STATEMENT&symbol=${ticker}&apikey=${av}`).then(r => r.json()),
      fetch(`https://finnhub.io/api/v1/company-news?symbol=${ticker}&from=${new Date(Date.now()-7*86400000).toISOString().split('T')[0]}&to=${new Date().toISOString().split('T')[0]}&token=${fh}`).then(r => r.json()),
      fetch(`https://finnhub.io/api/v1/stock/profile2?symbol=${ticker}&token=${fh}`).then(r => r.json()),
    ]);

    const annual = incomeRes?.annualReports?.[0] ?? {};
    const recentNews = Array.isArray(newsRes) ? newsRes.slice(0, 5).map((n: any) => n.headline).join('\n') : '';
    const companyName = overviewRes.Name ?? profileRes.name ?? ticker;
    const sector = overviewRes.Sector ?? profileRes.finnhubIndustry ?? 'Technology';

    const client = new Anthropic({ apiKey: anthropicKey });

    const prompt = `You are VAULT's research engine. Generate a complete investment research report for ${ticker} (${companyName}) using this real financial data:

Sector: ${sector}
Market Cap: ${overviewRes.MarketCapitalization ? '$' + (parseInt(overviewRes.MarketCapitalization) / 1e9).toFixed(1) + 'B' : 'N/A'}
P/E Ratio: ${overviewRes.PERatio ?? 'N/A'}
EPS: ${overviewRes.EPS ?? 'N/A'}
52-Week High/Low: ${overviewRes['52WeekHigh'] ?? 'N/A'} / ${overviewRes['52WeekLow'] ?? 'N/A'}
Revenue (TTM): ${overviewRes.RevenueTTM ? '$' + (parseInt(overviewRes.RevenueTTM) / 1e9).toFixed(1) + 'B' : 'N/A'}
Net Income: ${annual.netIncome ? '$' + (parseInt(annual.netIncome) / 1e9).toFixed(1) + 'B' : 'N/A'}
Profit Margin: ${overviewRes.ProfitMargin ?? 'N/A'}
Analyst Target: ${overviewRes.AnalystTargetPrice ? '$' + parseFloat(overviewRes.AnalystTargetPrice).toFixed(2) : 'N/A'}
Description: ${(overviewRes.Description ?? profileRes.description ?? '').slice(0, 500)}
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
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    });

    let analysis: any = {};
    try {
      const text = response.content[0].type === 'text' ? response.content[0].text : '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) analysis = JSON.parse(jsonMatch[0]);
    } catch { analysis = {}; }

    const currentPrice = quoteRes.c ?? 0;
    const prevClose = quoteRes.pc ?? 0;
    const changePct = prevClose > 0 ? ((currentPrice - prevClose) / prevClose) * 100 : 0;

    return new Response(JSON.stringify({
      ticker: ticker.toUpperCase(),
      name: companyName,
      sector,
      price: `$${currentPrice.toFixed(2)}`,
      change: parseFloat(changePct.toFixed(2)),
      marketCap: overviewRes.MarketCapitalization
        ? '$' + (parseInt(overviewRes.MarketCapitalization) / 1e9).toFixed(1) + 'B'
        : analysis.marketCap ?? 'N/A',
      peRatio: overviewRes.PERatio ?? 'N/A',
      eps: overviewRes.EPS ?? 'N/A',
      revenue: overviewRes.RevenueTTM
        ? '$' + (parseInt(overviewRes.RevenueTTM) / 1e9).toFixed(1) + 'B'
        : 'N/A',
      profitMargin: overviewRes.ProfitMargin
        ? (parseFloat(overviewRes.ProfitMargin) * 100).toFixed(1) + '%'
        : 'N/A',
      analystTarget: overviewRes.AnalystTargetPrice
        ? '$' + parseFloat(overviewRes.AnalystTargetPrice).toFixed(2)
        : 'N/A',
      week52High: overviewRes['52WeekHigh'] ?? 'N/A',
      week52Low: overviewRes['52WeekLow'] ?? 'N/A',
      employees: overviewRes.FullTimeEmployees
        ? parseInt(overviewRes.FullTimeEmployees).toLocaleString()
        : profileRes.employeeTotal?.toLocaleString() ?? 'N/A',
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
      revenueGrowth: analysis.revenueGrowth ?? 0,
      netIncome: analysis.netIncome ?? 'N/A',
      netMargin: analysis.netMargin ?? 0,
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
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
});
