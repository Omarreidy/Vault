# VAULT — Acquisition-Journey Audit (Phase 1)

**Date:** 2026-07-19 · **Basis:** direct inspection of `website/src`, `store/`, `src/screens`, `src/services`, `supabase/`, `tests/claims.test.ts`
**Binding docs:** `docs/marketing/POSITIONING.md`, `docs/marketing/MARKETING_SOURCE_OF_TRUTH.md`
**Scope:** the full public journey — ad → website → App Store → install → signup → onboarding → Plaid → first Daily Open → first move → return → Premium.

Classification key: **[LB]** launch blocker · **[CI]** conversion improvement · **[PLE]** post-launch experiment · **[UC]** unnecessary change (explicitly rejected).

---

## Stage-by-stage audit

### 1. Website — first five seconds (Hero)

| Question | Finding |
|---|---|
| Promise made | "Your money has a next move." + sub: reads connected accounts, scores momentum, hands you next money moves every morning. **On-position.** |
| Product supports it? | Yes — move detectors, Daily Open, score all ship. |
| Primary objection | "Is this another finance app that wants my bank login?" |
| Intended action | App Store download (button) or watch demo. |
| Action obvious? | Yes — two clear CTAs. But the App Store button is a dead `#download` anchor until `APP_STORE_URL` is set. |
| Continuity break | **The browser tab, search snippet, and every shared link still say "VAULT — Your Financial Operating System"** (`layout.tsx` metadata + `SITE.tagline`). A visitor arriving from a share sees the rejected position before the approved one. |
| Trust gained | Read-only via Plaid · encrypted · never sold — good, present. |
| Trust lost | None in hero itself. |
| Abandonment risk | Visitors who fear the bank-login ask bounce before scrolling. The source-of-truth's primary reassurance — **"your first score takes 60 seconds, no bank login needed"** — appears nowhere on the site. |
| Measurable? | **No. The website has zero analytics.** No page-view, no CTA-click, no UTM capture. |

**Findings:** metadata/OG title on retired position **[LB — fixed]** · missing 60-second no-bank-login line **[CI — fixed]** · zero website analytics **[LB for measurement — fixed]** · dead App Store button pending URL **[LB — external: Imran inserts URL at approval]**.

### 2. Website — Problem section

Promise: the action gap ("No one has ever looked at your money and said: here's your next move."). On-position, emotionally right for Behind-But-Earning. **Keep verbatim** — POSITIONING already designates "Budgeting apps show you charts. Then guilt. Then you delete them." the best line on the site. **[UC — no change]**

### 3. Website — MeetVault / How it works

- "Not another budgeting app. Your financial operating system." — allowed (interior section header per source of truth).
- The three pillars describe *properties* (sees, scores, hands), not the **Connect → Open → Act → Momentum** mechanism the launch brief requires. A visitor leaves without knowing what using VAULT *feels like day to day*. **[CI — fixed: pillars rebuilt as the four-step "how it works"]**

### 4. Website — WealthFeed / Daily Open / moves

- Move cards mirror real detectors (idle cash, subscription creep, credit utilization) — compliant.
- Dollar figures shown in mocks are not labeled illustrative anywhere in `WealthFeed`; `Demo` labels them but `WealthFeed` doesn't. **[CI — fixed: illustrative caption added]**
- Rituals card claims "Automatic · **Always watching**" — implies continuous monitoring; data is a refreshed snapshot. Contradicts the no-"live" rule in spirit. **[CI — fixed: refresh-honest wording]**

### 5. Website — Score / Tiers / WhyReturn / Concierge / Trust

- VelocityScore: "how you save, spend, invest, and handle debt" + "habits weigh more than headlines" — compliant (uses the corrected non-absolute form).
- Tiers: "not just the size of the pile," "Status you can't buy. Only earn." — compliant; status kept as texture, not the pitch. **[UC]**
- WhyReturn: "Badges mark real financial firsts — first $1k moved, first leak sealed" — directionally true of the achievements system; acceptable. **[UC]**
- Concierge: labeled "ILLUSTRATIVE EXAMPLE," carries "Informational insights, not licensed financial advice." **[UC]**
- Trust: six specific, true guarantees (AES-256, TLS 1.3, read-only, credentials never stored, never sold, delete anytime). Best-in-class; no vague "bank-level" claims. **[UC]**

### 6. Website — Final CTA

"Download VAULT. Connect your accounts in minutes." — jumps straight to the connect ask, skipping the no-bank-login on-ramp that POSITIONING says must lead every funnel. **[CI — fixed: 60-second score line added]**

### 7. App Store listing (`store/app-store-listing.md`)

- Name "VAULT: Daily Money Moves", subtitle "Your next money move, daily," description rebuilt 2026-07-19 — on-position, claims-clean.
- Missing for a complete package: What's New template, review-request/response copy, support copy, subscription explanation, privacy summary for the ASC privacy label conversation, screenshot plan on the new narrative (old `screenshots-needed.md` is score-led and references the retired position's ordering). **[CI — fixed: package completed in `store/`]**
- ASC metadata itself (org enrollment, ToS/Privacy links in ASC) — rejection items from build 20; external. **[LB — external: Imran]**

### 8. Install → Signup (AuthScreen)

- Promise at this stage: none made yet by the app; screen is functional. Terms/Privacy linked (fixes the ASC rejection requirement in-app).
- Objection: "why do I need an account before seeing anything?" — acceptable at launch; testable later **[PLE: delayed-signup experiment]**.
- Measurement: **no signup events existed.** `analytics_events` RLS also drops any pre-auth event silently, so install → signup could never be measured. **[LB for measurement — fixed: events added + anon-insert migration written (apply pending)]**

### 9. Onboarding (3 questions → score reveal → gaps)

- Delivers the "60 seconds, no bank login" promise mechanically — the strongest trust move in the funnel. Copy at reveal: "Connect your accounts to unlock your real score" — exactly the approved bridge.
- Measurement gaps: no `onboarding_completed`, no `score_revealed`. **[CI — fixed]**

### 10. Plaid connection

- Ask comes after value (score shown first) — correct order.
- Web flow verifies `plaid_items` before claiming success — honest.
- Measurement: `plaid_link_succeeded` existed only from the home-feed path; no `started`, no `exited`, so the consent cliff (the single most important funnel number) was invisible. **[LB for measurement — fixed: started/exited events in both PlaidLink screens]**

### 11. First Daily Open / first move / Vault Closed

- Fully instrumented already (`feed_composed`, `daily_brief_viewed`, `move_acted`, `move_skipped`, `vault_closed`, `streak_extended`). **[UC — no change]**
- Product risk (not copy): move variety exhausts in ~2 weeks (POSITIONING Step 1B). Marketing must not promise "three novel dollar-quantified moves every day" — all new assets in this system respect that.

### 12. Score screen (post-connect)

- **Claims violation found:** "**Live** score from your connected accounts" / "Connect bank for **live** data" — "live" is reserved for the market-data tab only. **[LB — fixed: reworded]**

### 13. Concierge intro

- 5 free messages/day, honest failure states. No `concierge_message_sent` event → funnel 6's entry was unmeasurable. **[CI — fixed]**

### 14. Premium (UpgradeScreen)

- Perks list is honest — except perk 3 said "**Advice** grounded in your accounts" (prohibited advice-framing; the source of truth's own wording is "Guidance"). **[LB — fixed]**
- No paywall funnel events (`upgrade_viewed`, `purchase_started/completed/failed/restored`). RevenueCat webhook covers server truth; client events needed for funnel shape. **[CI — fixed]**
- Price discrepancy ($9.99 vs $12.99 history): repo is clean of hardcoded prices; **Imran must verify the RevenueCat/ASC configured price before any paid campaign** — external.

### 15. Referral flow

- Real system (+75 XP both sides). No share/redeem events. **[CI — fixed]**

### 16. Notifications

- Permission + token events already tracked. Deploy/migration/device-test pending on Imran (external).

---

## Where trust is gained vs lost (summary)

**Gained:** 60-second no-login score → honest empty testimonial section → specific security guarantees → read-only framing at the Plaid ask → Concierge admitting missing data → honest paywall.
**Lost (before fixes):** OG/title flip-flop between two positions → "Always watching" → "Live score" → "Advice" on the paywall. All four fixed in this pass.

## Likely abandonment points (ranked, to watch in analytics)

1. Website → App Store (dead button until URL set; then measured via `appstore_cta_click`).
2. Signup → Plaid connect (the consent cliff — now measured via `plaid_link_started/succeeded/exited`).
3. Score reveal → connect (measured: `score_revealed` → `plaid_link_started`).
4. Day-1 → Day-7 return (derivable from any-event activity by user_id/day; no client work).

## Explicitly rejected changes [UC]

- Rewriting Problem/Trust/Tiers/Concierge sections — already on-position and claims-clean.
- Redesigning onboarding order, delaying signup, or gating Plaid differently at launch — experiment material, not launch work.
- Adding testimonials/review scores/scarcity of any kind — prohibited while none exist.
- New analytics vendor/SDK — the Supabase events table works; extended instead of replaced.
