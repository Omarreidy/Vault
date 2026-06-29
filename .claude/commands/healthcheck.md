---
description: Run the VAULT health check and auto-fix anything that's broken
---

You are running the VAULT self-healing health check. The user typed `/healthcheck`.
Be efficient and act — this command is allowed to fix and deploy, then report what changed.

## Step 1 — Run the check

Run `npm run health` and read the full output. It validates all feed/insight card
data and every live backend endpoint (market-data, market-news, company-research,
concierge, financial-scanner, plaid-link-token, calculate-score).

## Step 2 — If everything is healthy

If the script exits 0 (`0 broken`), report a short "✅ All clear" summary with the
counts and stop. Do not change anything.

## Step 3 — If something is broken

For EACH `✗` failure, diagnose the root cause and fix it. These are the known
failure→fix mappings (verify against current code before acting — files/keys may
have changed since this was written):

- **Card data failures** (e.g. "Feed card s42: empty actionLabel") → fix the
  offending entry in [src/services/mockData.ts](src/services/mockData.ts) or
  [src/services/insights.ts](src/services/insights.ts). These are local data fixes,
  no deploy needed.
- **market-data / market-news all-zero or empty** → almost always the `FINNHUB_KEY`
  Supabase secret is invalid or rate-limited. Test the key directly with
  `curl "https://finnhub.io/api/v1/quote?symbol=SPY&token=<KEY>"`. If invalid, tell
  the user you need a fresh Finnhub key — do not invent one.
- **company-research fundamentals N/A** → the `FMP_KEY` secret is invalid, or FMP
  changed endpoints. FMP uses `https://financialmodelingprep.com/stable/...`.
- **company-research "AI analysis fell back to defaults"** → the Claude JSON was
  truncated. Raise `max_tokens` in
  [supabase/functions/company-research/index.ts](supabase/functions/company-research/index.ts)
  and redeploy.
- **Any "Anthropic API key invalid (401)"** (concierge / scanner / research) → the
  `ANTHROPIC_API_KEY` secret is bad or out of credits. Tell the user you need a
  fresh key — do not invent one.
- **plaid-link-token error** → check the requested `products` are valid Plaid
  products (only `transactions` is used) and that `PLAID_ENV` matches the secret
  type (production secret needs `PLAID_ENV=production`).

### Deploying edge-function fixes

Edge functions live in `supabase/functions/<name>/`. Deploy a fixed one with:

```bash
export SUPABASE_ACCESS_TOKEN=<token>   # ask the user if not already set in env
npx supabase functions deploy <name> --project-ref gvdfypehwmemootjizmd
```

The project-ref is `gvdfypehwmemootjizmd`. NEVER hardcode or guess the access token
or any API key — if a secret is missing/invalid, ask the user for it. Set secrets
with `npx supabase secrets set NAME=value --project-ref gvdfypehwmemootjizmd`.

## Step 4 — Confirm and report

After applying fixes, run `npm run health` again to confirm everything is green.
Then give the user a concise summary: what was broken, what you changed (with file
links), what you deployed, and the final health status. If anything still fails
because it needs a secret only the user can provide, say so clearly.
