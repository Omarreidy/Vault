# VAULT — Marketing Source of Truth

**Every future marketing prompt, ad, page, or store asset must comply with this file.**
Full rationale: `docs/marketing/POSITIONING.md`. In any conflict, this file + `src/constants/legal.ts` win.
Implementation: the launch system built on this file lives in `docs/marketing/launch/` (see its README); per-asset compliance runs through `docs/marketing/launch/12_CLAIMS_CHECKLIST.md`.
Last verified against the product: 2026-07-19 (claims-consistency remediation pass; regression-guarded by `tests/claims.test.ts`).

## Who VAULT is for

Young professionals (24–32, ~$50–110k) who earn decent money, hold several disconnected accounts, dislike budgeting, and feel behind without knowing what to do next. Secondary: recent graduates; self-improvement "optimizers."

## What VAULT is

**The finance app that tells you your next money move.** It reads your connected accounts (read-only via Plaid), finds what's costing you or missing — idle cash, high credit utilization, missing savings/Roth accounts, subscription creep — and deals you three specific, dollar-quantified moves a day. Completing them closes your daily vault, extends your streak, and feeds Wealth Velocity: a 0–1000, server-computed score of financial *behavior*, not balance. An AI Concierge answers questions grounded in your actual account data. Category: **daily money moves** (action-first finance).

## What VAULT is not

- Not a budgeting app, tracker, or dashboard. Not a bank. Not an advisor.
- It never moves money, executes anything, cancels or negotiates on the user's behalf.
- It is not real-time (data is a refreshed snapshot) and it never fabricates numbers.
- Wealth Velocity is not a credit score and never affects one.

## Main promise

*You will always know your next money move.* Three a day, from your real accounts, most doable in minutes.

## The proof

- Move cards quote the user's own balances and dollar impacts, sorted by impact.
- The score is computed server-side from behavior and cannot be inflated — by anyone, including the user.
- Concierge answers use the user's real balances; when data is missing it says so.
- A hard no-fake-data rule, enforced in code and audit.

## Emotional benefit

Relief and completion: the "I should be doing something with my money" hum goes silent. Identity shift: from "bad with money" (a state) to "someone who makes moves" (a behavior). Status (tiers, streaks, wins) is retention texture — never the acquisition pitch.

## Primary CTA

**"Get your score in 60 seconds"** — always offer the no-bank-login path first; the Plaid ask comes after value is shown, with "read-only, look never touch" at the moment of the ask.

## Approved language (own these)

money moves · your next move · the Daily Open · Vault Closed · Wealth Velocity · momentum · how you handle money, not just how much you have · moves, not charts · the action gap · read-only · your real accounts / your actual numbers · a finance app with a finish line · grounded in your accounts

> ⚠️ Retired: the absolute "behavior, not balance" / "earned by behavior, never by balance." The score formula includes balance thresholds (investment milestones, savings levels), so only the "not just how much you have" form is supportable.

**Conditional:** "financial operating system" (interior brand copy only, never the headline); "personalized" (only with mechanism attached); "wealth" (direction, never promised outcome); "AI Concierge" (product name; pair with "educational guidance"); dollar examples in ads (must depict real detector behavior; label illustrative).

## Prohibited claims

- "Financial advisor/adviser/advice," "wealth advisor," "AI advisor," "plan(ner)," "fiduciary" — VAULT is educational only. (In-app "Private Advisory" branding was retired 2026-07-19.)
- "Real-time," "live" data or scores (exception: the Market/Signal tab's quotes, which genuinely come from a live API with timestamps). "Guaranteed" anything. Promised savings amounts, credit-score point gains, or outcomes.
- Nonexistent features: partner rates/access, member card, priority concierge, dedicated advisor, white-glove onboarding, weekly/monthly wealth reports, tier-based concierge limits, advanced Signal tab, premium financial products, bill negotiation/cancellation on the user's behalf, creating funds or routing money (VAULT is read-only).
- "Top X% of members/Americans/your age group" and any percentile framing (the stored percentile is a formula of the user's own score, not population data). "All your money in one place" / "sees everything" (some account types are excluded). Specific unclaimed-match or savings dollar amounts presented as personal findings.
- Unsourced statistics of any kind (the "73%" raise stat, "average American spends $X," population multipliers). Year-pinned IRS/tax limits unless verified for the current year — prefer "the annual IRS limit."
- Hardcoded subscription prices anywhere in copy — RevenueCat/App Store Connect is the only price source.
- Banned generics: "take control of your finances," "your financial future starts here," "budget better," "smarter financial decisions," "AI-powered finance."
- Unsourced statistics. Fabricated testimonials or reviews. Fear/shame creative.
- Comparative competitor claims without verified sourcing; never claim to be "first" or "only."

## Actual Premium benefits (the only ones that may be sold)

1. Unlimited AI Concierge (the 5-message/day free limit disappears)
2. Deep-dive sessions (long conversations: debt payoff, investing decisions, negotiation prep)
3. Guidance grounded in connected accounts
4. All future Premium features as they ship

Price: **never state a number in copy.** All hardcoded prices were removed from the repo 2026-07-19 (paywall, Settings, ToS, store docs now defer to "the price displayed in the App"). RevenueCat/App Store Connect is the sole price source; Imran must verify the configured price there. Billing runs through Apple/RevenueCat; entitlement is server-verified.

## Standing checklist for any new asset

1. Every capability claim maps to `POSITIONING.md` Step 1A (works) — never 1C (partial) or 1D (nonexistent).
2. Every number is real, sourced, or labeled illustrative.
3. The educational-only boundary appears wherever guidance is promised.
4. Plaid ask is framed read-only, after value.
5. No shame, no hype, no generics — specificity is the brand.
