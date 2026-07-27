-- Company-research analysis cache (2026-07-26).
--
-- The Research tab took 23–31 seconds per lookup because the full AI report was
-- regenerated on every request, for every user, for every ticker. On a phone
-- that reads as broken.
--
-- Only the *AI analysis* is cached here — never the market data. Price, market
-- cap, P/E, and news are re-fetched from FMP/Finnhub on every request and
-- merged with the cached analysis, so a cache hit still returns current
-- numbers. That split is the whole point: the expensive part (qualitative
-- analysis) is stable for a day; the cheap part (quotes) must never be stale.
--
-- Cached rows are shared across all users: the first person to look up a
-- ticker pays the generation cost, everyone after gets it instantly.

CREATE TABLE IF NOT EXISTS company_research_cache (
  ticker      TEXT PRIMARY KEY,
  analysis    JSONB NOT NULL,
  model       TEXT,              -- which model produced it; lets a model change invalidate cleanly
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Staleness sweeps read by age.
CREATE INDEX IF NOT EXISTS company_research_cache_created_idx
  ON company_research_cache (created_at DESC);

ALTER TABLE company_research_cache ENABLE ROW LEVEL SECURITY;

-- No client policies at all: only the edge function (service role) reads or
-- writes this table. Clients reach it exclusively through company-research,
-- which is JWT-gated and rate-limited.
