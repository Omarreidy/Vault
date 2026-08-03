-- Track in-flight report generation (2026-08-02).
--
-- Generating a report takes 25–30s. The endpoint used to hold the HTTP
-- connection open for that whole time, which works from a server but not from
-- a phone: iOS aborts long requests at the network layer, below any timeout
-- JavaScript can set. The result was that a member's FIRST lookup of a ticker
-- reliably failed and the second — served from cache in ~1s — succeeded.
--
-- So generation now runs in the background and the client polls. This column
-- marks a ticker whose generation is already running, so N members searching
-- the same ticker at once trigger one generation rather than N.
--
--   NULL / 'ready'  → `analysis` is a real, complete report
--   'generating'    → a background task is producing it; poll again shortly

ALTER TABLE company_research_cache
  ADD COLUMN IF NOT EXISTS status TEXT;

-- Lets the poll path find in-flight work without scanning.
CREATE INDEX IF NOT EXISTS company_research_cache_status_idx
  ON company_research_cache (status)
  WHERE status = 'generating';
