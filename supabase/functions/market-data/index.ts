const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const fh = Deno.env.get('FINNHUB_KEY')!;

    // Everything from Finnhub (60 req/min free tier — reliable).
    // Indices via ETF proxies, VIX via VXX ETF, movers via hot tickers.
    const indexSymbols = ['SPY', 'QQQ', 'DIA', 'VXX'];
    const hotTickers = ['NVDA', 'AAPL', 'META', 'TSLA', 'AMZN', 'MSFT', 'GOOGL'];

    const quote = (t: string) =>
      fetch(`https://finnhub.io/api/v1/quote?symbol=${t}&token=${fh}`)
        .then(r => r.json())
        .then(d => ({ ticker: t, ...d }))
        .catch(() => ({ ticker: t }));

    const [indexQuotes, marketStatus, stocks] = await Promise.all([
      Promise.all(indexSymbols.map(quote)),
      fetch(`https://finnhub.io/api/v1/stock/market-status?exchange=US&token=${fh}`)
        .then(r => r.json()).catch(() => ({})),
      Promise.all(hotTickers.map(quote)),
    ]);

    // Finnhub /quote returns: c=current, dp=percent change, o/h/l/pc
    const [spy, qqq, dia, vxx] = indexQuotes as any[];

    const movers = (stocks as any[])
      .filter(s => s.c && s.dp !== undefined)
      .map(s => ({
        ticker: s.ticker,
        price: `$${s.c?.toFixed(2)}`,
        change: parseFloat((s.dp ?? 0).toFixed(2)),
        direction: (s.dp ?? 0) >= 0 ? 'up' : 'down',
        open: s.o,
        high: s.h,
        low: s.l,
        prevClose: s.pc,
      }))
      .sort((a, b) => Math.abs(b.change) - Math.abs(a.change));

    const vixPrice = vxx?.c > 0 ? vxx.c : 18.5;
    const isOpen = (marketStatus as any)?.isOpen ?? false;

    return new Response(JSON.stringify({
      snapshot: {
        sp500Change: spy?.dp ?? 0,
        nasdaqChange: qqq?.dp ?? 0,
        dowChange: dia?.dp ?? 0,
        vix: vixPrice,
        vixLabel: vixPrice > 30 ? 'Extreme Fear' : vixPrice > 20 ? 'Elevated' : vixPrice > 12 ? 'Normal' : 'Greed',
        marketStatus: isOpen ? 'OPEN' : 'CLOSED',
        lastUpdated: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'America/New_York' }) + ' ET',
      },
      movers,
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
