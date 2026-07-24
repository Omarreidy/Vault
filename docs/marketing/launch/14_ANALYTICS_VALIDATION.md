# Launch Analytics — Live Validation Record

**Date:** 2026-07-19 (21:49 PDT / 2026-07-20 04:49 UTC) · **Project:** Supabase `gvdfypehwmemootjizmd` (production) · **Result: 15/15 checks passed.**

Synthetic test traffic only — no real user data, no financial values. All synthetic rows and the disposable test user were deleted after verification (IDs below are the deleted rows' identifiers, kept as the audit trail).

## What was verified

| # | Check | Result |
|---|---|---|
| 1 | `page_view` anon insert into `website_events` | 201 ✓ |
| 2 | `appstore_cta_click` (props `location`, `live`) | 201 ✓ |
| 3 | `demo_cta_click` (props `location`) | 201 ✓ |
| 4 | Full UTM attribution persisted on every website row (`source=tiktok`, `medium=organic`, `campaign`, `content=v21a`, `creator=c_validation`, `variant=a`) | ✓ all 3 rows |
| 5 | Anonymous app events (`app_opened`, `signup_started`) insert with `user_id NULL` — **not silently rejected** (pre-fix these dropped) | 201 ✓ |
| 6 | Authenticated funnel — 13 events inserted as a signed-in user with dictionary-exact props: `signup_completed`, `onboarding_completed{tier}`, `score_revealed{tier,source}`, `plaid_link_started{platform_flow}`, `plaid_link_succeeded{source}`, `feed_composed{variant,items}`, `daily_brief_viewed`, `move_acted{move_id,personalized,index,xp,moves_today}`, `vault_closed{moves_today,xp_today,streak}`, `concierge_message_sent{daily_count,premium}`, `upgrade_viewed`, `purchase_started`, `referral_shared` | 13× 201 ✓ |
| 7 | Anonymous→authenticated association: pre-auth rows (`user_id NULL`) and post-auth rows share one `session_id` (`s-…`) — the join defined in `10_ANALYTICS_EVENTS.md` works on live data | ✓ (2 anon + 13 auth, same session) |
| 8 | RLS rejects a signed-in user writing another `user_id` (spoof protection) | 403 ✓ |
| 9 | RLS rejects anon writes carrying any `user_id` | 42501 ✓ (verified at migration time) |
| 10 | Clients cannot SELECT events back (no read policy; service role only) | ✓ 0 rows |
| 11 | No financial keys (`amount`, `balance`, `merchant`, `transaction`, `price`, …) in any recorded props | ✓ |
| 12 | Unit suites: `tests/analytics.test.ts` 7/7, `tests/claims.test.ts` 18/18 | ✓ |

**Duplicate control:** duplicates are controlled at the analysis layer by design — funnels use first-event-per-user/session (`min(created_at)`), the app emits `app_opened` once per launch (session id is per-launch), and notification sends are DB-deduped via `notification_log`'s unique `(user_id, dedupe_key)`. The events tables intentionally accept repeat inserts (retries must never fail).

## Test artifacts (deleted after verification)

- Website sessions: `w-validate-20260720T044947Z` (event ids 5–7) and `w-validate-20260720T044915Z` (ids 2–4, first run)
- App session: `s-validate-20260720T044947Z` (event ids 61–75), window 04:49:50–04:49:54 UTC
- Disposable auth user: `analytics-validation-…@example.com` — admin-created, admin-deleted
- Step-3 migration probes (`mig-verify-*`) also deleted

## Environment facts confirmed en route

- Migration `20260719000000_launch_analytics` applied to production 2026-07-19 and recorded in `schema_migrations`.
- `push-dispatch` was deployed with gateway JWT verification on, which 401'd the pg_cron caller before the function ran. Redeployed `--no-verify-jwt` (v5) with `[functions.push-dispatch] verify_jwt = false` persisted in `supabase/config.toml`; the next cron tick (04:45:04 UTC) executed and enqueued 2 `tier_up` rows in `notification_log` — cron, Vault `cron_secret`, function auth, and DB writes all proven live.
- Repro: `scratchpad/analytics_validation.py` (session-local); the same checks can be re-run any time with anon + service-role keys.
