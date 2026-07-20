# VAULT — Manual Launch Checklist (external actions, in order)

Everything the repo cannot do for itself. Owner: Imran. The 30-day calendar (`08`) schedules these; this is the flat dependency-ordered list.

## Block A — Before anything ships
- [ ] **Commit & push** this launch pass (repo work was left uncommitted by policy).
- [ ] **Apply migrations** to prod: `20260717000000_legal_acceptances.sql` (pending since 7/17), `20260718000000_notification_system.sql` (pending since 7/18), `20260719000000_launch_analytics.sql` (new) — `supabase db push`, then verify: insert a test row into `website_events` with the anon key; open the app signed-out and confirm `app_opened` lands with `user_id NULL`.
- [ ] **Deploy notification edge functions** + one real device push test (per `project_notifications` plan).
- [ ] **Vercel env vars** for the website project (`vault-website`): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` → redeploy → confirm `page_view` rows.
- [ ] **RevenueCat/ASC price check** — resolve the historical $9.99 vs $12.99 ambiguity in the dashboards; the repo no longer states a price anywhere and must stay that way.

## Block B — App Store
- [ ] **Apple org enrollment** completed (build-20 rejection root cause).
- [ ] ASC metadata from `store/app-store-listing.md`: name, subtitle, promo text, description, keywords; **ToS + Privacy URLs in ASC** (second rejection fix); support URL; age rating; privacy labels per the listing's privacy summary.
- [ ] **Screenshots**: capture per `store/screenshot-plan.md` (demo account + Plaid Sandbox `user_good`; take on device — see `feedback_screenshots` memory: Imran captures, not automation).
- [ ] **App preview** (optional at launch): record per `store/app-preview-video.md`.
- [ ] Full **device test pass**: signup → onboarding → legal gate → Plaid sandbox → Daily Open → 3 moves → Vault Closed → Concierge (hit the 5-message limit) → paywall → purchase sandbox → restore → notifications → delete account.
- [ ] Submit; on approval: set `APP_STORE_URL` in `website/src/lib/brand.ts`, redeploy site, click through the full attributed chain once.

## Block C — Channels & assets (founder-produced)
- [ ] TikTok / IG / YT accounts (handle + bio from source-of-truth §social bio).
- [ ] Record VO + edit videos V21, V24, V01, V07, V22 first (the "strongest five"); remaining 25 per calendar.
- [ ] Creator sheet (30 names) + outreach from `09` §18–22.
- [ ] Waitlist/email tool if store approval lags (copy: `09` §2–3).
- [ ] TestFlight cohort of 10–20 (copy: `09` §9 adapted).

## Block D — Standing rules
- [ ] Support inbox answered <24h (templates ready).
- [ ] Every new asset passes `12_CLAIMS_CHECKLIST.md`.
- [ ] Weekly funnel read (funnels in `10`); experiment verdicts logged in `11`.
- [ ] Never: buy installs before connect-rate proof · state a price in copy · ship a testimonial that isn't real and permissioned.

## Known items needing legal-eyes before paid spend
1. The Plaid/read-only description across assets (accurate today; counsel should bless the standard paragraph in `09` §24).
2. Concierge "educational guidance" boundary language at scale (in-app disclaimer exists; ads referencing the Concierge should reuse §25/§27 verbatim).
3. Referral XP program terms (both-sides reward disclosure in ToS).
4. FTC disclosure wording in creator/UGC contracts (§21–22).
