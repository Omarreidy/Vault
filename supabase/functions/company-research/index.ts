import Anthropic from 'npm:@anthropic-ai/sdk@0.99.0';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { requireUser, corsHeaders as cors } from '../_shared/auth.ts';
import { allowRequest, tooManyRequests } from '../_shared/ratelimit.ts';

// The AI analysis is the slow part of this endpoint (~25–30s to generate) and
// is stable for a day; the market data around it is cheap and must stay fresh.
// So we cache only the analysis, keyed by ticker, and re-fetch quotes every
// time. See migrations/20260726000000_company_research_cache.sql.
const ANALYSIS_TTL_MS = 24 * 60 * 60 * 1000;
const RESEARCH_MODEL = 'claude-haiku-4-5-20251001';

// The report schema is large — executives, journey, roadmap, risks, competitors.
// At 4096 the model was hitting the ceiling mid-object on longer companies, and
// truncated JSON does not parse, which is what produced "placeholder" reports.
// Headroom here is the cheapest reliability win available.
const MAX_TOKENS = 8192;

// Retries cost ~25s each. That is an acceptable trade for a first-ever lookup
// that actually works: the alternative was a member retyping a valid ticker.
const GENERATION_ATTEMPTS = 2;

function cacheClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
}

/** How long a 'generating' marker is trusted before we assume the task died. */
const GENERATING_STALE_MS = 3 * 60 * 1000;

type CacheState =
  | { kind: 'ready'; analysis: Record<string, unknown> }
  | { kind: 'generating' }
  | { kind: 'absent' };

/** What the cache currently knows about this ticker. Never throws. */
async function readCacheState(ticker: string): Promise<CacheState> {
  try {
    const { data } = await cacheClient()
      .from('company_research_cache')
      .select('analysis, model, status, created_at')
      .eq('ticker', ticker)
      .maybeSingle();
    if (!data) return { kind: 'absent' };

    const ageMs = Date.now() - new Date(data.created_at).getTime();

    // Someone else is already generating this ticker. Don't start a second
    // identical job — unless the marker is old enough that the task plainly
    // died (a worker can be evicted mid-flight), in which case retry it.
    if (data.status === 'generating') {
      return ageMs > GENERATING_STALE_MS ? { kind: 'absent' } : { kind: 'generating' };
    }

    // A model change invalidates: a cached report from a different model is not
    // what this deployment promises to return.
    if (data.model !== RESEARCH_MODEL) return { kind: 'absent' };
    if (ageMs > ANALYSIS_TTL_MS) return { kind: 'absent' };
    const analysis = data.analysis as Record<string, unknown> | null;
    return analysis && Object.keys(analysis).length > 0
      ? { kind: 'ready', analysis }
      : { kind: 'absent' };
  } catch {
    return { kind: 'absent' }; // cache must never break the endpoint
  }
}

/** Claim this ticker so concurrent searches don't each start a generation. */
async function markGenerating(ticker: string): Promise<void> {
  try {
    await cacheClient()
      .from('company_research_cache')
      .upsert({ ticker, analysis: {}, model: null, status: 'generating', created_at: new Date().toISOString() });
  } catch { /* worst case we generate twice; never fail the request over it */ }
}

/** Best-effort write-through; failures are swallowed so a cache problem can't fail a request. */
async function writeCachedAnalysis(ticker: string, analysis: Record<string, unknown>): Promise<void> {
  try {
    await cacheClient()
      .from('company_research_cache')
      .upsert({ ticker, analysis, model: RESEARCH_MODEL, status: 'ready', created_at: new Date().toISOString() });
  } catch { /* ignore */ }
}

/** Release the claim so the next search retries rather than polling a job that failed. */
async function clearGenerating(ticker: string): Promise<void> {
  try {
    await cacheClient().from('company_research_cache').delete().eq('ticker', ticker).eq('status', 'generating');
  } catch { /* ignore */ }
}

/**
 * Produce and cache the analysis. Runs detached from the HTTP response via
 * EdgeRuntime.waitUntil, so nothing is waiting on the connection while it works.
 */
async function generateAndCache(client: Anthropic, ticker: string, prompt: string): Promise<void> {
  for (let attempt = 1; attempt <= GENERATION_ATTEMPTS; attempt++) {
    try {
      const response = await client.messages.create({
        model: RESEARCH_MODEL,
        max_tokens: MAX_TOKENS,
        messages: [{ role: 'user', content: prompt }],
        // Nudge the model straight into the object on a retry: the wrapper prose
        // that broke the first parse can't be emitted before it.
        ...(attempt > 1 ? { system: 'Reply with the JSON object only. No preamble, no markdown fences.' } : {}),
      });
      const text = response.content[0].type === 'text' ? response.content[0].text : '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
      if (parsed && Object.keys(parsed).length > 0) {
        await writeCachedAnalysis(ticker, parsed);
        return;
      }
      console.warn(`company-research ${ticker}: attempt ${attempt} produced no parseable object`);
    } catch (err) {
      console.warn(`company-research ${ticker}: attempt ${attempt} failed`, String(err));
    }
  }
  // Every attempt failed. Drop the claim so the member's next search starts a
  // fresh job instead of polling a marker that will never resolve.
  console.error(`company-research ${ticker}: generation failed after ${GENERATION_ATTEMPTS} attempts`);
  await clearGenerating(ticker);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  // Signed-in members only — this endpoint spends real Anthropic + FMP tokens.
  let user: { id: string };
  try { user = await requireUser(req); } catch (r) { return r as Response; }

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

  // A poll — the client already has this ticker's market data and is only
  // waiting on the analysis. Answer from the cache alone: no market-data fetch
  // (5 third-party calls) and no rate-limit charge. Polls run every few seconds,
  // so charging them would exhaust a budget sized for real searches within one
  // lookup, and re-fetching quotes each time would burn the FMP quota for
  // numbers the client is already showing.
  if (body?.awaiting === true) {
    const polled = await readCacheState(ticker);
    if (polled.kind !== 'ready') {
      return new Response(JSON.stringify({ ticker, analysisPending: true }), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }
    // Ready: fall through so the report is returned with fresh market data.
  }

  // Rate-limit real searches only. This is a cost guard for generation, not an
  // authorization control — auth is requireUser above.
  if (body?.awaiting !== true && !(await allowRequest(user.id, 'company-research', 12, 60))) {
    return tooManyRequests();
  }

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

    // Market data above was fetched fresh regardless, so a cached analysis is
    // still merged with current numbers.
    let analysis: any;
    const state = await readCacheState(ticker);

    // Generation takes 25–30s, and a phone cannot hold a connection open that
    // long: iOS aborts long requests at the network layer, beneath any timeout
    // JavaScript can set. That is why a member's first lookup of a ticker failed
    // and the second — served from cache in ~1s — succeeded.
    //
    // So we never make the caller wait for generation. Market data is fetched
    // and returned right away; the analysis is produced in the background and
    // the client polls for it. Every request finishes in a couple of seconds,
    // which leaves nothing for iOS to cut off.
    // Only clients that know how to poll are given a pending response. Builds
    // shipped before this change would render `analysisPending` as a report with
    // every analysis field blank, so they keep the old blocking behaviour — worse
    // latency, but a complete report rather than an empty-looking one.
    const clientPolls = body?.poll === true;

    if (state.kind !== 'ready' && clientPolls) {
      if (state.kind === 'absent') {
        await markGenerating(ticker);
        // Detach from the response: waitUntil keeps the worker alive for the
        // task without the client waiting on it.
        const work = generateAndCache(client, ticker, prompt);
        // @ts-ignore — EdgeRuntime is provided by the Supabase runtime.
        if (typeof EdgeRuntime !== 'undefined') EdgeRuntime.waitUntil(work);
        else void work;
      }

      // Market data is real and current; only the analysis is still coming.
      return new Response(JSON.stringify({
        ticker,
        name: companyName,
        sector,
        price: `$${Number(currentPrice).toFixed(2)}`,
        change: parseFloat(Number(changePct).toFixed(2)),
        marketCap: marketCapStr,
        peRatio: peRatio !== 'N/A' && peRatio != null ? (typeof peRatio === 'number' ? peRatio.toFixed(1) : peRatio) : 'N/A',
        revenue: revenueTTM,
        analysisPending: true,
      }), { headers: { ...cors, 'Content-Type': 'application/json' } });
    }

    if (state.kind === 'ready') {
      analysis = state.analysis;
    } else {
      // Legacy client: generate inline as before and answer with the finished
      // report. Slower, and still subject to the mobile network timeout that
      // polling exists to avoid — but correct for a build that cannot poll.
      analysis = {};
      await generateAndCache(client, ticker, prompt);
      const after = await readCacheState(ticker);
      if (after.kind === 'ready') analysis = after.analysis;
      if (Object.keys(analysis).length === 0) {
        return new Response(JSON.stringify({ error: 'Research is temporarily unavailable for this ticker.' }), {
          status: 503, headers: { ...cors, 'Content-Type': 'application/json' },
        });
      }
    }

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
        reasons: ['Market data loaded', 'Analysis complete', 'Review financials above'],
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
