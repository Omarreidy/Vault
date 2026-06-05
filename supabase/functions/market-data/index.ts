const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const av = Deno.env.get('ALPHA_VANTAGE_KEY')!;
    const fh = Deno.env.get('FINNHUB_KEY')!;

    // Fetch indices + VIX from Alpha Vantage quotes
    const symbols = ['SPY', 'QQQ', 'DIA', 'VXX'];
    const quotePromises = symbols.map(s =>
      fetch(`https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${s}&apikey=${av}`)
        .then(r => r.json())
    );

    // Fetch top movers from Finnhub
    const moversPromise = fetch(
      `https://finnhub.io/api/v1/stock/market-status?exchange=US&token=${fh}`
    ).then(r => r.json());

    // Fetch stock quotes for hot tickers from Finnhub
    const hotTickers = ['NVDA', 'AAPL', 'META', 'TSLA', 'AMZN', 'MSFT', 'GOOGL'];
    const stockPromises = hotTickers.map(t =>
      fetch(`https://finnhub.io/api/v1/quote?symbol=${t}&token=${fh}`)
        .then(r => r.json())
        .then(d => ({ ticker: t, ...d }))
    );

    const [quotes, marketStatus, ...stocks] = await Promise.all([
      Promise.all(quotePromises),
      moversPromise,
      ...stockPromises,
    ]);

    // Parse index quotes
    const parseQuote = (data: any) => {
      const q = data['Global Quote'] ?? {};
      return {
        price: parseFloat(q['05. price'] ?? '0'),
        change: parseFloat(q['09. change'] ?? '0'),
        changePct: parseFloat((q['10. change percent'] ?? '0%').replace('%', '')),
        volume: parseInt(q['06. volume'] ?? '0'),
      };
    };

    const [spy, qqq, dia, vxx] = quotes.map(parseQuote);

    // Build movers from Finnhub quotes
    const movers = stocks
      .filter((s: any) => s.c && s.dp !== undefined)
      .map((s: any) => ({
        ticker: s.ticker,
        price: `$${s.c?.toFixed(2)}`,
        change: parseFloat((s.dp ?? 0).toFixed(2)),
        direction: (s.dp ?? 0) >= 0 ? 'up' : 'down',
        open: s.o,
        high: s.h,
        low: s.l,
        prevClose: s.pc,
      }))
      .sort((a: any, b: any) => Math.abs(b.change) - Math.abs(a.change));

    const isOpen = marketStatus?.isOpen ?? false;

    return new Response(JSON.stringify({
      snapshot: {
        sp500Change: spy.changePct,
        nasdaqChange: qqq.changePct,
        dowChange: dia.changePct,
        vix: vxx.price > 0 ? vxx.price : 18.5,
        vixLabel: vxx.price > 30 ? 'Extreme Fear' : vxx.price > 20 ? 'Elevated' : vxx.price > 12 ? 'Normal' : 'Greed',
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
