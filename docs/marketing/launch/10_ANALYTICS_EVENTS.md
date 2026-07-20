# VAULT — Analytics Event Dictionary & Funnels (Phase 7)

**Storage:** two Supabase tables, both insert-only from clients, readable only with the service role.
- `analytics_events` — app events (`src/services/analytics.ts`, existing).
- `website_events` — marketing-site events (`website/src/lib/track.ts`, new).
**Migration:** `supabase/migrations/20260719000000_launch_analytics.sql` (creates `website_events`; adds the anon-insert policy so **pre-signup app events** stop dropping). *Not applied yet — Imran applies it (Day 1 of the calendar).*

**Privacy rules (hard):** no balances, transaction contents, merchant names, message text, or any dollar figure ever appears in `props`. Coarse tier/counters only. Website has no financial data by construction. Session IDs are random per launch/visit; no advertising identifiers; no third-party analytics SDK.

---

## Website events (`website_events`)

| Event | Fired | Props |
|---|---|---|
| `page_view` | every route render | — |
| `appstore_cta_click` | any App Store button/nav CTA | `location` (hero/nav/final_cta), `live` (real store URL vs placeholder) |
| `demo_cta_click` | "Watch VAULT in action" | `location` |
| `support_email_click` | reserved (support page) | — |

Every row also carries attribution captured once per session: `source/medium/campaign/content` (UTM), `creator` (`?creator=`), `variant` (`?v=`), `referrer`, `page`.
**Link convention:** organic social `?utm_source={platform}&utm_medium=organic&utm_content=v{NN}` · creators add `&creator={id}` · paid adds `&utm_campaign={test}`.

## App events (`analytics_events`)

**New this pass** (○ = anonymous until the migration is applied, then recorded pre-auth):

| Event | Fired | Props |
|---|---|---|
| `app_opened` ○ | app mount | — |
| `signup_started` ○ | signup submit tapped | — |
| `signup_completed` / `signin_completed` | auth success | — |
| `score_revealed` | onboarding reveal step | `tier`, `source` |
| `onboarding_completed` | onboarding finished | `tier` |
| `plaid_link_started` | Plaid flow opened | `platform_flow` |
| `plaid_link_exited` | user exit / error | `reason` |
| `concierge_message_sent` | message actually sent | `daily_count`, `premium` |
| `upgrade_viewed` | paywall shown | — |
| `purchase_started/completed/failed/restored` | RC purchase flow | `cancelled` on failed |
| `referral_shared` | share sheet opened | — |
| `referral_redeemed` | RPC success | — |

**Pre-existing:** `feed_composed`, `move_acted`, `move_skipped`, `connect_card_viewed/cta_tapped/dismissed`, `plaid_link_succeeded`, `daily_brief_viewed`, `daily_brief_cta_tapped`, `streak_extended`, `vault_closed`, `push_permission_result`, `push_token_registered`, `notif_opened/dismissed`, `notif_center_opened`.

**Server truth:** premium entitlement changes come from the RevenueCat webhook (`supabase/functions/revenuecat-webhook`) — client purchase events describe funnel shape; the webhook is billing truth. Trial-start, if a trial is configured in RevenueCat, is a webhook fact — do not invent a client event for it.

**Identity model:** website sessions are anonymous (`w-…` session ids); app pre-auth events carry `user_id NULL` with an app-session id (`s-…`); everything after auth carries `user_id`. **Anonymous→authenticated join:** within one app session, pre-auth and post-auth rows share `session_id` — join `signup_started` (null user) to `signup_completed` (user id) via `session_id`. Website→app joins are *not* individually linkable (no shared id across the store boundary — deliberate); use time-bucketed campaign-level comparison: `appstore_cta_click` by campaign/day vs `app_opened`/`signup_completed` by day.

**Derived metrics (no client work):** D1/D7/D30 return = any event by `user_id` in the day window after first event. First-X events = `min(created_at)` per user per event. Move-repetition = `feed_composed.items` trend + `move_acted.personalized` share.

---

## Funnel definitions

For every funnel: **anon→auth behavior** as above; **privacy limitation** — website↔app is campaign-level only; all rates computed server-side (service role), never exposed to clients.

### F1 · Website → App Store
`page_view` → `appstore_cta_click` — segmented by `source/campaign/content/creator/variant`.
**Success:** CTA rate (target: directional ≥8% once traffic is warm). **Diagnostics:** `demo_cta_click` rate, per-variant split, referrer mix. **Limitation:** Apple gives no per-click install callback; pair with ASC "App Store Connect → Sources" weekly.

### F2 · Install → Signup
`app_opened` (first per session/user) → `signup_started` → `signup_completed`.
**Success:** open→signup-complete ≥60% directional. **Diagnostics:** started→completed gap (auth friction, email confirms). **Limitation:** pre-migration, the anonymous legs are invisible — apply the migration before reading this funnel.

### F3 · Signup → Plaid connection
`signup_completed` → `onboarding_completed` → `connect_card_viewed`/`plaid_link_started` → `plaid_link_succeeded` (with `plaid_link_exited` as the leak).
**Success:** signup→connect within 72h — **the business's most important rate**; no target invented, measure and improve weekly. **Diagnostics:** `score_revealed`→`plaid_link_started` (does the reveal sell the connect?), exit `reason` mix, `platform_flow` split.

### F4 · Plaid connection → First value
`plaid_link_succeeded` → `feed_composed` (personalized items>0) → `daily_brief_viewed` → first `move_acted` → first `vault_closed`.
**Success:** connect→first `vault_closed` within 48h. **Diagnostics:** first `concierge_message_sent`, `move_skipped` ratio, time-to-first-move.

### F5 · First value → Day-7 return
Cohort: users with first `vault_closed`; return = any event D7 window.
**Success:** D7 of vault-closers (compare vs non-closers — validates the loop; see calendar Day 24). **Diagnostics:** `streak_extended` distribution, `notif_opened`→same-day `vault_closed`, push permission rate.

### F6 · Free → Premium
`concierge_message_sent` (daily_count hitting limit) → `upgrade_viewed` → `purchase_started` → `purchase_completed` (webhook-confirmed).
**Success:** activated→premium within 30d. **Diagnostics:** which surface precedes `upgrade_viewed`; `purchase_failed.cancelled` share (sticker shock vs errors); restore volume.

### F7 · Referral → Activated user
`referral_shared` → (invitee) `signup_completed` + `referral_redeemed` → invitee reaches F4's `vault_closed`.
**Success:** share→redeem ≥10% directional; redeemers' activation vs organic. **Diagnostics:** shares per active user, XP-award verification via RPC logs.

### F8 · Creator campaign → Activated user
`website_events` rows with `creator=X` → F1 CTA → (campaign-level) installs/signups/connects in the following 72h vs baseline.
**Success:** cost per **connected** user per creator (not CPI). **Diagnostics:** creator-level CTA rate, variant used, decay curve after post. **Limitation:** attribution is inferential (time-window uplift), stated as such in any payout conversation — payouts on tracked link volume, not claimed installs.

---

## Not rebuilt (already works)
The events table schema, `track()`'s never-throw contract and tests, ritual/feed/notification instrumentation, RevenueCat webhook, delete-account data path. This pass only added missing funnel edges and the website layer.
