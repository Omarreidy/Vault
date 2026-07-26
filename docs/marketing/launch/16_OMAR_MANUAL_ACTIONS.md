# Omar — Manual Actions Only (ordered)

Everything below **cannot be done from the dev environment**. Everything that could be done is already done (migrations applied, functions deployed, analytics verified, demo account staged, copy fixed — see `14_ANALYTICS_VALIDATION.md` and the final session report). Work top to bottom.

## ✅ COMPLETED 2026-07-26 (verified live — do not redo)

| # | Item | Verification |
|---|---|---|
| 1 | **Commit & push** | Pushed as `baf724b`; Vercel auto-deployed; working tree clean |
| 2 | **Real support email** | `support@` / `privacy@` / `legal@ getsvault.com` forward to **omarreidy6@gmail.com** via ImprovMX (free). DNS at Squarespace: 2× MX (`mx1`/`mx2.improvmx.com`) + SPF `v=spf1 include:spf.improvmx.com ~all`. All verified live; test email received. Live site now shows the real addresses on /privacy, /terms, /support. Vercel A record (`76.76.21.21`) untouched throughout. |
| 3 | **Vercel env vars + redeploy** | Both `NEXT_PUBLIC_SUPABASE_*` set (Production, non-Sensitive) and baked into the live bundle. End-to-end proof: a tracked visit to getsvault.com fired `page_view` + `appstore_cta_click`, both `201 Created`, with full attribution (source=tiktok, campaign, content=v21, creator=founder, variant=a) and a shared session id. **Website analytics is recording.** |
| 4 | **2FA on Apple account** | On — 1 trusted phone, 2 trusted devices (`nmjaffee@gmail.com`) |
| 5 | **Push credentials pre-check** | Push Key `G5C3T49D48` ✅ valid on Apple's servers, assigned to `@omarreidy23/vault`. Dist. cert + provisioning profiles active to 2027-06-18. ASC API key present (ADMIN). |

**Cleanup owed (next session, needs re-auth of Supabase CLI):** delete 2 test rows in `website_events` where `campaign='go_live_check'`.

**⚠️ Known issue to fix AFTER migration:** `eas.json` → `submit.production.ios.appleId` says `omarreidy2@gmail.com` but the real developer account is **`nmjaffee@gmail.com`**. Would fail on `eas submit`. Fix once, after the team identity settles under the LLC.

---

## 1 · Confirm payout bank account, then start the Apple migration

- **1a — Bank account (do first):** App Store Connect → **Business / Agreements, Tax, and Banking** → **Payments and Financial Reports**. Confirm the bank account on file is the one you want. Apple sends all pre-migration earnings to whatever account is active **when the migration starts**. Likely a formality (earnings ≈ $0), but it's hard to redirect afterward.
- **1b — Reply to Angela** (case `102941516409`) from your Apple-ID email. Enrollment already submitted for **Vault Wealth LLC**, D-U-N-S `145065003`, org site `getsvault.com`; she is waiting on your go-ahead:
  > Angela — please go ahead and start the migration for Vault Wealth LLC (D-U-N-S 145065003, https://getsvault.com) to an organization membership. 2FA is on, I understand Certificates/Identifiers/Profiles will be unavailable during the process, and my payout bank account is already the one I want active. Case #102941516409.
- **Done when:** membership shows Organization and App Store Connect reflects **Vault Wealth LLC** as seller. Takes days — it runs in the background while you do steps 5–9.
- **Expect after migration:** everything currently reads `Omar Reidy (Individual)`. Apple typically requires **regenerating the distribution certificate and provisioning profiles** under the new entity. This is normal, not a failure. The push key usually survives; regenerate it if it doesn't.
- **Also note:** Sales & Trends history from the Individual membership will not carry over.
- **Common mistake:** starting the migration with a TestFlight upload or provisioning change in flight — the Certificates/Identifiers/Profiles portal locks for the duration.

## 2 · Build budget — spend the last build carefully

Only **one EAS build** remains. Do **not** build until: migration complete → ASC metadata entered → screenshots captured. A build made under the Individual team may need redoing under the LLC, and the C&I&P lock can fail builds outright during migration. Nothing in steps 5–8 needs a build — screenshots and video come from the demo account on-device.

## 3 · App Store Connect: metadata + the two rejection fixes

- **Where:** App Store Connect → VAULT → App Information / version page.
- **Enter from `store/app-store-listing.md` verbatim:** Name `VAULT: Daily Money Moves` · Subtitle `Your next money move, daily` · description · keywords · promotional text.
- **Rejection fixes:** add **Terms of Use (EULA) URL** `https://getsvault.com/terms` and **Privacy Policy URL** `https://getsvault.com/privacy` in App Information **and** ensure the subscription-purchase screen metadata references them (the listing's §In-App Purchases blurb has the exact text).
- **Support URL:** `https://getsvault.com/support`.
- **Done when:** all fields saved without validation warnings; review notes include demo login `appreview@getvault.app` + its password.
- **Common mistake:** pasting a price into promotional text — never; claims tests ban it and ASC is the price source.

## 4 · RevenueCat ↔ App Store price verification

- **Where:** RevenueCat dashboard → Products/Offerings; App Store Connect → Subscriptions.
- **Do:** confirm the Premium monthly product ID, price tier, and offering match on both sides, and that the price the app paywall renders comes from the live offering (open the paywall on TestFlight and compare against ASC).
- **Done when:** paywall price on device == ASC configured price; a sandbox purchase succeeds and the `revenuecat-webhook` marks the account premium.
- **Common mistake:** fixing price in one system only — the flagged discrepancy was between doc claims and configured price; the app must show ASC truth.

## 5 · Capture the 8 App Store screenshots (device)

- **Where:** physical iPhone Pro Max class (6.9", 1320×2868), demo account `appreview@getvault.app`.
- **Do:** everything is staged — follow the **per-frame navigation table** in `store/screenshot-plan.md` → "Capture readiness — verified & prepared 2026-07-19". Day-before: complete 1–2 moves so frame 2's delta and streak render.
- **Done when:** 8 raw PNGs at full resolution matching the PRIMARY narrative order; figures match the demo fixture ($12,450 idle · 42% utilization); "Illustrative" tags to be added in the frame template for frames 1/3/5; frame 8 cropped above the price.
- **Common mistake:** capturing frame 4 (Vault Closed) before doing the day's first two moves — the celebration only fires on the 3rd.

## 6 · Record the preview video + the 5 launch videos' screen recordings

- **Where:** same device/session as step 7.
- **Do:** `store/app-preview-video.md` for the ASC preview; then the ~90-minute one-session plan in `docs/marketing/launch/production/README.md` (recordings for V21, V24, V01, V22, V07).
- **Done when:** every "Required screen recordings" checkbox in the five `production/V*/PRODUCTION.md` files is satisfied.
- **Common mistake:** editing device time/battery inconsistently across takes; set Do Not Disturb, full battery, same time-of-day look.

## 7 · Voiceover + edit the five videos

- **Where:** your editor of choice; packages in `docs/marketing/launch/production/`.
- **Do:** record VO from each package's "Final voiceover text" (calm read; V07 deserves human voice), assemble per each "Editing timeline", export per each naming convention, and run each package's claims checklist before export.
- **Done when:** 5 masters + platform cuts exist and every claims checklist is ticked.
- **Common mistake:** adding hype in the edit — the calm is the positioning.

## 8 · Social accounts + posting

- **Where:** TikTok, Instagram, YouTube (Shorts), X, LinkedIn — handle: `getsvault` (or closest available; record finals in `MARKETING_SOURCE_OF_TRUTH.md`).
- **Do:** create accounts, bio = one-line promise + `getsvault.com` link **with the matching platform UTM from `launch-links.csv`**; post per `08_LAUNCH_CALENDAR_30_DAYS.md`; pin V21 then V24.
- **Done when:** accounts live, bio links tracked, first posts scheduled.
- **Common mistake:** raw `getsvault.com` in bios — every bio link needs its platform's UTM params or attribution is blind.

## 9 · Creator research + outreach

- **Where:** `docs/marketing/launch/ops/CREATOR_OPS.md` + `creators.csv` (import to Google Sheets).
- **Do:** prospect 20–30 real creators (research is external — nothing pre-populated by design), assign `creator_id`s, send approved messages §18–§20 from `09_LAUNCH_COPY.md`.
- **Done when:** 20+ rows with status `contacted`, follow-ups scheduled.
- **Common mistake:** improvising offer terms in DMs — the approved messages carry the only two guardrails + FTC line; keep them.

## 10 · TestFlight invitations

- **Where:** App Store Connect → TestFlight → External Testing.
- **Do:** create an external group, invite the first testers (waitlist emails), attach the current build; test notes = "first score in about 60 seconds; connect with Plaid Sandbox `user_good` if you don't want to link a real bank."
- **Done when:** invites accepted and at least a handful of sessions appear in analytics (`app_opened` in `analytics_events`).
- **Common mistake:** external groups need Beta App Review on first build — submit that early, it's not instant.

## 11 · Legal review pass (compliance backlog)

- **Where:** counsel or self-review checklist.
- **Do:** the flagged backlog: subscription-terms wording on the paywall (auto-renew disclosure), privacy-label accuracy vs `store/app-store-listing.md` §Privacy summary, GLBA/state-privacy applicability of Plaid data handling, FTC affiliate-disclosure process for creators (§CREATOR_OPS), and the consent-gate copy (`legal_acceptances` flow is live in prod).
- **Done when:** each item has a written yes/no/fix note; fixes land as repo changes.
- **Common mistake:** treating the empty testimonial section as filler to complete — it stays empty until real, permissioned quotes exist.

## 12 · Supabase dashboard spot-checks (no CLI access exists for these)

- **Where:** supabase.com/dashboard → project `gvdfypehwmemootjizmd`.
- **Do:** Edge Functions → `push-dispatch` → Logs: confirm the 15-minute cron invocations return 200 and show no errors; Table Editor → `notification_log`: rows progress `queued → sent` once a device with a valid push token is eligible (your phone, after the TestFlight build).
- **Done when:** one full `sent`/`delivered` row exists for your own device.
- **Common mistake:** reading the 2 existing `queued` `tier_up` rows as stuck — they wait for the send window/eligibility by design.
