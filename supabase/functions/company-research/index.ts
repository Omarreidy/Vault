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

    // Fetch real company data in parallel
    const [overviewRes, quoteRes, incomeRes, newsRes, profileRes] = await Promise.all([
      fetch(`https://www.alphavantage.co/query?function=OVERVIEW&symbol=${ticker}&apikey=${av}`).then(r => r.json()),
      fetch(`https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${fh}`).then(r => r.json()),
      fetch(`https://www.alphavantage.co/query?function=INCOME_STATEMENT&symbol=${ticker}&apikey=${av}`).then(r => r.json()),
      fetch(`https://finnhub.io/api/v1/company-news?symbol=${ticker}&from=${new Date(Date.now()-7*86400000).toISOString().split('T')[0]}&to=${new Date().toISOString().split('T')[0]}&token=${fh}`).then(r => r.json()),
      fetch(`https://finnhub.io/api/v1/stock/profile2?symbol=${ticker}&token=${fh}`).then(r => r.json()),
    ]);

    const annual = incomeRes?.annualReports?.[0] ?? {};
    const recentNews = Array.isArray(newsRes) ? newsRes.slice(0, 5).map((n: any) => n.headline).join('\n') : '';

    // Use Claude to generate the research narrative from real data
    const client = new Anthropic({ apiKey: anthropicKey });
    const prompt = `You are VAULT's research engine. Generate a concise investment research report for ${ticker} using this real data:

Company: ${overviewRes.Name ?? ticker}
Sector: ${overviewRes.Sector ?? profileRes.finnhubIndustry ?? 'Unknown'}
Market Cap: ${overviewRes.MarketCapitalization ? '$' + (parseInt(overviewRes.MarketCapitalization) / 1e9).toFixed(1) + 'B' : 'N/A'}
P/E Ratio: ${overviewRes.PERatio ?? 'N/A'}
52-Week High: ${overviewRes['52WeekHigh'] ?? 'N/A'}
52-Week Low: ${overviewRes['52WeekLow'] ?? 'N/A'}
Revenue (TTM): ${overviewRes.RevenueTTM ? '$' + (parseInt(overviewRes.RevenueTTM) / 1e9).toFixed(1) + 'B' : 'N/A'}
Net Income: ${annual.netIncome ? '$' + (parseInt(annual.netIncome) / 1e9).toFixed(1) + 'B' : 'N/A'}
Profit Margin: ${overviewRes.ProfitMargin ?? 'N/A'}
EPS: ${overviewRes.EPS ?? 'N/A'}
Analyst Target: ${overviewRes.AnalystTargetPrice ?? 'N/A'}
Description: ${overviewRes.Description?.slice(0, 400) ?? profileRes.description?.slice(0, 400) ?? 'N/A'}

Recent news:
${recentNews || 'No recent news available'}

Return a JSON object with these exact fields:
{
  "oneLiner": "one sentence company description",
  "verdict": "STRONG BUY" | "BUY" | "HOLD" | "SELL" | "STRONG SELL",
  "moatScore": number 1-10,
  "businessModel": "2-3 sentence business model explanation",
  "investmentVerdict": {
    "answer": "YES" | "NO" | "WATCH",
    "summary": "one sentence verdict",
    "reasons": ["reason 1", "reason 2", "reason 3"],
    "caution": "one risk to watch (optional)"
  },
  "moatFactors": ["factor 1", "factor 2", "factor 3"],
  "weaknesses": ["weakness 1", "weakness 2"],
  "vaultAngle": "what this means specifically for a retail investor building wealth"
}`;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
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
      name: overviewRes.Name ?? profileRes.name ?? ticker,
      sector: overviewRes.Sector ?? profileRes.finnhubIndustry ?? 'Unknown',
      price: `$${currentPrice.toFixed(2)}`,
      change: parseFloat(changePct.toFixed(2)),
      marketCap: overviewRes.MarketCapitalization
        ? '$' + (parseInt(overviewRes.MarketCapitalization) / 1e9).toFixed(1) + 'B'
        : 'N/A',
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
      ...analysis,
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
