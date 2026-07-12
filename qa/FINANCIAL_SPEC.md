# VAULT Financial Calculation Specification & Data-Integrity Audit

**Date:** 2026-07-11 · **Auditor:** financial-QA pass (Claude Code)
**Scope:** every formula that touches money, scores, rewards, entitlements, dates, or AI financial context.

This document records the behavior **as implemented** (the de-facto spec), flags every rule that is
ambiguous / inconsistent / duplicated / client-trusted, and lists the defects that were fixed in this pass.
Automated regression tests live in `tests/` (`npm test`).

---

## 1. Data model & sources of truth

| Data | Where it lives | Written by | Trust level |
|---|---|---|---|
| Bank accounts + transactions | `plaid_items.accounts / .transactions` (jsonb snapshot) | `plaid-exchange`, `plaid-refresh` edge functions (service role) | **Server** — client can read own rows; RLS blocks cross-user |
| Velocity score / tier / percentile | `profiles.score/tier/percentile` | `calculate-score` edge fn **and** client onboarding | ⚠️ **Client-writable** (see §12, D1) |
| Premium entitlement | `profiles.is_premium` | `premium.ts` client sync from RevenueCat | ⚠️ **Client-writable** (D1) |
| Referral XP | `profiles.referral_xp` | `redeem_referral_code` RPC (security definer) — but also client-writable via RLS | ⚠️ (D1) |
| Streak / daily stats / goals / achievements / XP | AsyncStorage (device only) | client | Client-only by design (cosmetic gamification; not billed, not cross-user) — except streak milestones are broadcast to the cohort feed |
| Transaction snapshot window | last **30 days** at time of exchange/refresh | server | Server |

Plaid sign convention (used everywhere): **positive amount = money out (spend), negative = money in (income/refund/transfer)**.

---

## 2. Account categorization (shared rule)

Canonical rule (server `calculate-score`, client `PlaidContext`, `concierge.ts`, `financialTimeline.ts`):

- `checking`  = subtype `checking`
- `savings`   = subtype ∈ {`savings`, `money market`, `cd`}
- `investment`= subtype ∈ {`brokerage`, `401k`, `ira`, `roth`, `403b`, `529`}
- `credit`    = type `credit`
- `loans`     = type `loan` (server score only)
- Balance sums use `balances.current` (`balances.limit` for credit limit); `null → 0`.

**Flagged — duplicated & inconsistent:** the same rule was re-implemented 5×.
`feed.ts` uses a *narrower* investment list ({brokerage, 401k, ira, roth} — no 403b/529), so a user whose
only investment is a 529 gets a "start investing" nudge while the score says they invest. (Documented; left
as-is — feed copy is a targeting heuristic, not a stored number.) The canonical rule now lives in
`src/services/plaidMath.ts` and `supabase/functions/_shared/finance.ts` (byte-identical files, parity-tested).

Accounts whose subtype/type match nothing (e.g. `hsa`, `paypal`, mortgages) are **excluded from every
number in the app**, including net worth. Documented intended behavior; remaining risk noted in §14.

## 3. Net worth

**Canonical formula:** `netWorth = checking + savings + investments − creditDebt`
(`achievements.netWorthOf`, `NetWorthTracker`, `financialTimeline`).

Loans are **not** subtracted (a mortgage or student loan never reduces displayed net worth) — documented
intended behavior (loan balances only dent the debt *score* dimension), flagged as a product-level risk.

**DEFECT D2 (fixed):** the concierge edge function computed `netWorth = savings + investments − creditDebt`
(omitting checking), so the AI advisor quoted a different net worth than every screen. Now includes checking.

## 4. Income & spend estimation (30-day snapshot)

- **Income tx** = `amount < 0` AND legacy `category[]` contains a substring of `Payroll` / `Deposit` / `Income`.
- **estimatedMonthlyIncome** = |Σ income tx| over the stored window; **0** on client when none.
- **Server fallback:** when no income tx, `calculate-score` assumes **$5,000/mo**. ⚠️ Silent-plausible value —
  it changes the spending score with no signal to the user. Kept (intended: score must exist without income
  data) but the response now carries `income_basis: 'transactions' | 'fallback'` so clients/QA can tell.
- **monthlySpend** = Σ positive amounts in window (label says "monthly"; actually "last stored ≤30-day window").

**Flagged ambiguities (documented, not changed):**
- **Refunds/reversals** (negative, non-income category) do **not** reduce spend — a purchase refunded in-window
  still counts as spend. Detecting refunds via legacy categories is unreliable (`Transfer > Credit` catches
  own-account transfers). Recommendation: adopt Plaid `personal_finance_category` and net
  `TRANSFER_IN.ACCOUNT_TRANSFER`-excluded credits. Pinned by test as current behavior.
- `financialTimeline` income detection also accepts `Transfer` — inconsistent with score/context income rule.
- Modern Plaid responses may return `category: null` (legacy taxonomy deprecated) → income detection finds
  nothing → server silently uses the $5k fallback. Remaining risk.

**DEFECT D4 (fixed):** transactions were summed raw. A pending transaction and its posted version
(`pending_transaction_id`), or duplicate `transaction_id`s (double-stored item), were **double-counted** in
spend/income/subscriptions. Now every consumer dedupes via shared `dedupeTransactions()`:
1. drop tx whose `transaction_id` is referenced by another tx's `pending_transaction_id` (superseded pending);
2. drop repeated `transaction_id`s (missing ids are never collapsed).

**DEFECT D6 (fixed):** re-connecting the same bank creates a **new** `plaid_item` whose accounts duplicate the
old item's (different `account_id`s) — every balance doubled. `dedupeAccounts()` now drops exact `account_id`
repeats and, across items, accounts with identical `(name, mask, type, subtype)` when a mask is present.
Residual risk: two genuinely distinct accounts sharing all four fields would collapse (unlikely; documented).

**DEFECT D5 (fixed):** `plaid-exchange` upsert wiped stored `transactions` with `[]` when Plaid returned
`PRODUCT_NOT_READY` during a reconnect — the next score run then saw zero spend → spending score silently
jumped to 100. Now (like `plaid-refresh`) transactions are only overwritten when non-empty, and both the
Plaid token-exchange and accounts responses are checked (`ok` + payload shape) so failures return a clean
500 instead of writing a partial row — an item stored with zero accounts would otherwise silently score as
450/GOLD (that no-data baseline is pinned by test).

**DEFECT D7 (fixed, no behavior change):** `calculate-score` divided income by
`Math.max(1, allTx.length > 0 ? 1 : 0)` — always 1; dead expression removed.

## 5. Velocity score (0–1000) — server `calculate-score`

Dimensions, each clamped to 0–100 after `Math.round`:

- `savingsScore = clamp( totalSavings / max(3×monthlyIncome, 1) × 80 + (totalSavings > 1000 ? 20 : 0) )`
- `investmentScore = clamp( (inv>0)·40 + (inv>10k)·20 + (inv>50k)·25 + (inv>100k)·15 )`  (max 100)
- `debtScore = clamp( 100 − creditUtil×60 − loanPenalty )`, `creditUtil = debt/limit` (0 when limit 0),
  `loanPenalty = 20 if loans>50k, 10 if >20k, else 0`
- `spendingScore` step function of `spendRatio = spend30d / monthlyIncome` (0.8 assumed when income 0):
  `<0.5→100, <0.7→80, <0.85→60, <1.0→40, else 20`
- **Total** = `round(savings×3 + investment×2.5 + debt×2.5 + spending×2)` → max 1000
- `percentile = min(99, round(total/1000 × 95 + 5))`
- Tier thresholds: `BLACK ≥900, PLATINUM ≥700, GOLD ≥450, SILVER ≥200, else BRONZE`

Written to `profiles` on every call; computation is **deterministic** (same snapshot → same score; tested).
Credit accounts with a null `limit` yield utilization 0 → debtScore 100 despite debt — documented risk.
Negative (overpaid) credit balances produce negative utilization → clamped at 100. Tested.

**Flagged — duplicated:** tier thresholds exist in `velocity.ts` (client) and the edge function; the weighted
formula also exists client-side as `calculateVelocityScore` (used for previews). Parity is now enforced by test.

**DEFECT D9 (fixed):** client `calculateVelocityScore` had no lower clamp — negative input rates produced
negative dimension scores/total (server clamps at 0). Now clamped 0–100 to match the server.

`fetchProfileScore` (fallback when no Plaid data) **synthesizes** the dimension breakdown from the onboarding
score (`savings = score×0.72`, etc.) and `percentile = score/10`. ⚠️ Plausible-but-synthetic display values;
documented intended fallback. `fetchLiveScore` returns `null` on any error/`data.error` — it never fabricates.

## 6. Tier progress & points-to-next-tier (client `velocity.ts`)

- `getTierProgress = clamp((score − tier.min) / (tier.max − tier.min), 0, 1)` with ranges from `TIERS`
  (0–199 / 200–449 / 450–699 / 700–899 / 900–1000).
- `getPointsToNextTier = nextTier.min − score` (0 at BLACK). Note: can be negative if score exceeds the
  caller's stale tier — callers always derive tier from the same score, so unreachable in practice; tested at boundaries.

## 7. Onboarding score (client-computed estimate)

`raw = round(AGE_SCORE[age] × INCOME_MULT[income] + GOAL_BOOST[goal])`, clamped to **[150, 620]**
(caps below Platinum so real bank data drives growth). Unknown answers default 290 / 1.0 / 20.
`percentile = round(score/10 × 0.95)` — third percentile formula in the app (flagged, doc-only).
Result is written to `profiles` **from the client** (see D1). Trajectory inputs come from bracket midpoints
(income: 32k/55k/92k/140k; age: 22/29/39/50; expenses assumed 70% of income).

## 8. FI trajectory (`trajectory.ts`)

- `actionBoost = actionsCompleted × 0.005`, `effSavingsRate = min(baseRate + boost, 0.80)`
- `baseRate = max(0, (income − expenses)/income)`
- `fiNumber = annualExpenses / 0.04` (4% SWR); `monthlyPassiveAtFI = fiNumber×0.04/12 = annualExpenses/12`
- Curve: `nw' = nw×(1+r) + annualSavings`, year steps, up to 55 years; FI when `nw ≥ fiNumber`; fallback FI = age+55.
- `actionSavings = baselineYearsToFI − boostedYearsToFI` (≥0, 0.1y precision).

**DEFECT D10 (fixed):** `annualIncome = 0` → `0/0 = NaN` cascaded through every output (NaN FI age, NaN curve).
Now income ≤ 0 → savings rate 0 (projection = pure compounding of current net worth). Negative net worth,
zero expenses (fiNumber 0 → already FI), and huge values are covered by tests.

## 9. Goals (`goals.ts`, device-local)

- Auto-seeded **once** after bank connect (idempotent AsyncStorage flag; merge never overwrites user goals; tested).
- Generator (pure, deterministic — tested):
  - inputs sanitized via `num()` (non-finite / negative → 0); `surplus = max(income − spend, 0)`
  - Emergency fund: target `cleanTarget(5×spend)` (or $5,000 if no spend), current = `min(savings, target)`, contribution `round(0.4×surplus)`
  - Debt payoff when `debt ≥ 100` (target = round(debt), current 0, 0.3×surplus), else 1-month checking buffer (0.2×surplus)
  - Investment ladder: first of [1k, 5k, 10k, 25k, 50k, 100k, 250k, 500k, 1M] above current investments, else `cleanTarget(1.5×invest)`; contribution 0.25×surplus
  - `cleanTarget` rounds **up** to 250/500/1000 steps by size.
- `getMonthsToGoal = ceil(remaining / monthlyContribution)`; `999` when contribution ≤ 0.
- `getGoalProgress = clamp(current/target, 0, 1)`.

**DEFECT D8 (fixed):** a completed/overfunded goal returned **negative months** (`ceil(−rem/c)`), and a
`target ≤ 0` goal returned `NaN`/`Infinity` progress (NaN propagates into progress-bar layout). Months now
floor at 0; progress of a non-positive target is 0; negative `current` clamps to 0.

## 10. Streaks, points, XP, challenges, achievements (device-local)

- **Streak:** one increment per calendar day; `+1` if last open was yesterday, reset to 1 otherwise;
  `getStreak` returns 0 when last open is older than yesterday. Milestones {3,7,14,30,60,100} post to cohort feed.
- **Daily/weekly stats** (`progressStats`): counters reset when the day stamp / Monday-of-week stamp moves;
  weekly velocity gain = `max(0, current − weekStartScore)` where the snapshot is taken on first Score visit of the week.
- **Challenges:** progress clamped to target; complete at `progress ≥ target` (d1/d2/d3 daily, w1 streak≥7, w2 moves≥10, w3 gain≥100).
- **Achievements:** pure evaluation from context (tested at every threshold boundary); first-unlock timestamps persisted.
  Money-based badges require `plaidConnected`; "savings" = **liquid cash** (checking+savings) by documented intent.

**DEFECT D3 (fixed):** all day math used `toISOString()` = **UTC** calendar. Anyone west of UTC opening in the
evening had opens land on the wrong day — e.g. New York, open Mon 6 pm (UTC Tue) then Tue 7:30 pm (UTC Wed 00:30):
`lastOpen` ≠ yesterday(UTC) at the second open ⇒ **streak wrongly reset** despite consecutive local days; daily
challenges reset at 7/8 pm local; `mondayStr` mixed **local** `getDay()` with **UTC** formatting, shifting the week
boundary for evening users. All stamps now use the device's **local** calendar date (`localDateString`). Migration
is seamless: stored values are already date strings. Regression-tested across month-end, year-end, leap day,
DST, and UTC±14 boundaries.

**DEFECT D3b (fixed):** corrupt stored streak (`"abc"`) → `parseInt` NaN → streak displayed/persisted as NaN
forever. Non-finite stored values now coerce to 0.

**Flagged (doc-only, D13):** "Debt Slayer" (a9) needs `debtPaid` — nothing ever tracks cumulative debt
reduction, so the badge is **unearnable**. Needs a snapshot-history feature; out of scope for this pass.

**Flagged:** streak/XP/goals live only on-device: reinstall or second device resets them (profiles.streak_days
column exists but is never written). Server is *not* the source of truth here by design — acceptable for
cosmetic rewards, but streak milestones posted to the cohort feed are client-asserted.

## 11. Referrals, leaderboard, cohort (server RPCs)

- Referral: +75 XP each side, single redemption enforced by `referred_by` null-check inside a security-definer
  RPC — idempotent under retry (second call returns `already_redeemed`), self-redeem and unknown codes rejected.
  ⚠️ Small race: two *concurrent* first redemptions could both pass the null-check (no unique/serializable guard);
  worst case duplicate +75 XP — cosmetic. Documented.
- Leaderboard rank = `1 + count(score > mine)` over onboarded profiles; `top_percent = max(1, round(rank/total×100))`.
  Score-0 users get `rank: null`. ⚠️ Rank input is `profiles.score` — client-writable (D1).
- Feed/reactions RLS: insert/delete own rows only; reads via definer RPCs with anonymized names.

## 12. Subscription entitlements

- RevenueCat is the intended source of truth; `premium.ts` mirrors the active `premium` entitlement into
  `profiles.is_premium` at launch/purchase/restore. If RevenueCat is unreachable (billing event delayed,
  offline) it returns `null` and **writes nothing** — a paid user is never silently downgraded (tested).
  A *delayed* billing event that RevenueCat reports as expired **will** clear the flag until the event lands —
  no grace period. Documented risk.
- Free concierge limit = 5 messages/day, counted in **AsyncStorage** and checked **only in the UI**.

**DEFECT D1 (CRITICAL — documented, not fixed in this pass):** `profiles` RLS allows unrestricted
self-update, so any authenticated user can `PATCH` their own row and set `is_premium = true`,
`score = 1000`, `tier = 'BLACK'`, `percentile`, or `referral_xp` with nothing but the public anon key —
bypassing the paywall and topping the leaderboard. The concierge / scanner edge functions authenticate the
JWT but check **no entitlement and no rate limit**, so the 5-message free limit is also bypassable by calling
the function directly.
**Why not fixed here:** the app's own legitimate flows currently write these columns from the client
(onboarding writes score/tier; `premium.ts` writes is_premium), and the same JWT performs both the legitimate
and the malicious write — no RLS policy can distinguish them. The fix is architectural and needs deploy
access + a RevenueCat server key:
1. RevenueCat **webhook → edge function** (service role) as the only writer of `is_premium`; column-guard
   trigger rejecting client updates to `is_premium/score/tier/percentile/referral_xp`;
2. move the onboarding score write into an edge function (formula is already deterministic);
3. concierge/scanner check `is_premium` + a server-side daily counter before spending Anthropic tokens.

## 13. AI features (concierge, scanner)

- Concierge context is assembled **client-side** (`concierge.ts`) from profile + deduped Plaid accounts and
  passed in the request body. ⚠️ The AI's numbers are therefore client-asserted; a tampered client can make
  the advisor reason from fake balances (self-harm only, but flag for trust). Server prompt now uses the same
  canonical net-worth rule (D2) and is extracted to `prompt.ts` (pure, tested): no context → generic advisor;
  `plaidConnected: false` → profile-only advice, encourages linking; missing snapshot fields default to 0
  rather than erroring (conflicting/incomplete data tested).
- Concierge streams plain text; on HTTP error the client **throws** and shows "Unable to connect" — it never
  fabricates advice (tested via client behavior contract; `fetchLiveScore` likewise returns null on error).
- **DEFECT D12 (fixed):** scanner passed Claude's JSON to the client **unvalidated** — a malformed verdict
  string breaks `VERDICT_COLORS[verdict]` lookups, and `xp` was whatever the model said (could exceed the
  10–25 design range or be negative). Extracted `parseScanResult()` (tested): verdict coerced to the enum
  (default `BUDGET CHECK`), xp clamped to 0–25 integers, required strings coerced, honest fallback ("Couldn't
  analyze", xp 0) when no JSON is found. Client already had an honest error card (`getScanErrorResult`).

## 14. Currency & precision

All amounts are USD floats from Plaid; the app rounds to whole dollars at the **end** of each aggregation
(`Math.round` after `reduce`) and never does arithmetic on formatted strings (one legacy exception:
`financialTimeline` re-parses its own formatted title to build totals — works incl. negatives, pinned by test).
No multi-currency support: `iso_currency_code` is ignored; a non-USD account would be summed as USD
(documented risk). Float error at dollar scale is < $0.005 per 10⁹ transactions — acceptable given
whole-dollar display; verified by rounding tests (0.1+0.2 chains, .5 boundaries, 1e12 balances).

**DEFECT D11 (fixed):** `NetWorthTracker.fmt` mis-bucketed negatives — `-$5,000` rendered "$-5,000" and
`-$1.5M` rendered "$-1,500,000" (skipped the K/M buckets). Sign-aware formatting added; negative net worth
was already colored red and *can* legitimately occur (credit debt > assets).

## 15. Concurrency & idempotency

- `plaid-refresh`: per-item isolation (one failing bank never aborts others); empty tx never overwrite history;
  concurrent runs converge (last write wins with fresh Plaid data each time).
- `calculate-score`: pure function of the stored snapshot → naturally idempotent; concurrent calls write the
  same value. Client PlaidContext collapses rapid hardRefresh calls (ref guard) and rate-limits foreground
  refreshes to 5 min.
- Streak update: same-day second call is a no-op (tested, including interleaved "two session" simulation —
  AsyncStorage last-write-wins keeps the count correct because both sessions write the same value).
- Goal auto-seed: idempotent flag (tested double-call → no duplicates).
- Referral redemption: idempotent under sequential retry (tested logic contract); tiny concurrent-race window (§11).

## 16. Verification record (2026-07-11)

- `npm test` — 90/90 pass (Node test runner via tsx; native modules stubbed in `tests/helpers/`).
- Mutation check: reverting the streak fix makes 3 date tests fail — the regression tests bite.
- `npm run typecheck` — clean (app tsconfig + tests tsconfig).
- `npx expo export --platform web` — production bundle exported cleanly.
- `npm run health` — 12 healthy, 0 warnings, 0 broken (live backend).
- ⚠️ Edge-function fixes (`calculate-score`, `concierge`, `financial-scanner`, `plaid-exchange`) are in the
  repo but **not deployed** — run `supabase functions deploy calculate-score concierge financial-scanner plaid-exchange`.

## 17. Remaining risks (accepted / needs product decision)

1. **D1** — client-writable entitlement/score columns + ungated AI endpoints (critical; needs backend work, §12).
2. Refund/reversal netting and modern-Plaid `category: null` income detection (§4).
3. $5k income fallback shapes the spending score silently (now at least reported via `income_basis`).
4. Loans/mortgages excluded from net worth; uncategorized subtypes (HSA, PayPal) invisible everywhere (§2–3).
5. Credit accounts without a reported limit score utilization as perfect (§5).
6. No grace period on delayed RevenueCat billing events (§12).
7. Streak/XP/goals device-local; not restored on reinstall (§10); Debt Slayer badge unearnable (D13).
8. Cross-item account dedupe uses (name, mask, type, subtype) heuristic (§4/D6).
9. Concierge AI context is client-asserted (§13).
