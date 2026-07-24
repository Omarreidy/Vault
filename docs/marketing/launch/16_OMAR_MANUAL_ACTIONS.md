# Omar — Manual Actions Only (ordered)

Everything below **cannot be done from the dev environment**. Everything that could be done is already done (migrations applied, functions deployed, analytics verified, demo account staged, copy fixed — see `14_ANALYTICS_VALIDATION.md` and the final session report). Work top to bottom; 1–3 are the launch-critical path.

---

## 1 · Commit & push today's work (unblocks the website deploy)

- **Where:** terminal, repo root.
- **Do:** review the diff, then commit and push to `main`:
  ```
  git add -A && git status        # review: website copy fixes, claims-test rules, launch docs, supabase config
  git commit -m "Launch execution: homepage claims fixes, analytics validation, launch links, production packages"
  git push origin main
  ```
- **Done when:** `git status` clean, GitHub shows the commit, Vercel starts a build automatically.
- **Common mistake:** pushing before adding the Vercel env vars (step 2) — do step 2 FIRST so the very next build bakes them in.

## 2 · Vercel: add the two env vars, then redeploy

- **Where:** vercel.com → project **vault-website** → Settings → Environment Variables (Production).
- **Add exactly:**
  - `NEXT_PUBLIC_SUPABASE_URL` = `https://gvdfypehwmemootjizmd.supabase.co`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `sb_publishable_tHoiSHF-49L1_p0OLRPeKw_5mfSi0fs` *(the publishable anon key — safe in the browser; NEVER the service_role/secret key)*
- **Then:** push (step 1) or Deployments → Redeploy latest.
- **Done when:** visit `https://getsvault.com/?utm_source=validation&utm_medium=test&utm_campaign=env_check` in a private window, then check Supabase → Table Editor → `website_events` for a `page_view` row with `campaign=env_check`. Also confirm the homepage now reads "surface specific money moves… when available" and "about 60 seconds".
- **Common mistake:** adding the vars to Preview only — set the **Production** environment; `NEXT_PUBLIC_*` vars only take effect on the next build.

## 3 · Apple Developer: organization enrollment (blocks resubmission — rejection cited it)

- **Status as of 2026-07-24: further along than this doc assumed.** Enrollment request already submitted for **Vault Wealth LLC**, D-U-N-S `145065003`, org site `getsvault.com`, case `102941516409`. Apple Developer Support (Angela) replied confirming they're ready to start the migration and is waiting on your go-ahead.
- **Before you reply "go":**
  1. Confirm 2FA is on for the Apple Account tied to Team ID `MX438B4597`.
  2. **Run the pending push-credentials check first** (`eas credentials -p ios`, still open from [[project_notifications]]) — the **Certificates, Identifiers & Profiles portal is unavailable for the duration of the migration**, so do any signing/provisioning work *before* you start it, not during.
  3. Confirm the bank account for in-app-purchase earnings is set to the one you want future payouts on — Apple pays pre-migration earnings to whatever account is active *when the migration starts*.
  4. Note: Sales & Trends history under the Individual membership will not carry over after migration.
- **Reply template (send from your Apple-ID email, not via this session — no email tool exists here):**
  > Angela — please go ahead and start the migration for Vault Wealth LLC (D-U-N-S 145065003, https://getsvault.com) to an organization membership. 2FA is on, I understand Certificates/Identifiers/Profiles will be unavailable during the process, and my payout bank account is already the one I want active. Case #102941516409.
- **Done when:** membership shows Organization and App Store Connect reflects **Vault Wealth LLC** as seller.
- **Common mistake:** starting the migration mid-build — if a TestFlight upload or provisioning-profile change is in flight, finish it first; the C&I&P portal lock will block it otherwise.

## 4 · App Store Connect: metadata + the two rejection fixes

- **Where:** App Store Connect → VAULT → App Information / version page.
- **Enter from `store/app-store-listing.md` verbatim:** Name `VAULT: Daily Money Moves` · Subtitle `Your next money move, daily` · description · keywords · promotional text.
- **Rejection fixes:** add **Terms of Use (EULA) URL** `https://getsvault.com/terms` and **Privacy Policy URL** `https://getsvault.com/privacy` in App Information **and** ensure the subscription-purchase screen metadata references them (the listing's §In-App Purchases blurb has the exact text).
- **Support URL:** `https://getsvault.com/support`.
- **Done when:** all fields saved without validation warnings; review notes include demo login `appreview@getvault.app` + its password.
- **Common mistake:** pasting a price into promotional text — never; claims tests ban it and ASC is the price source.

## 5 · RevenueCat ↔ App Store price verification

- **Where:** RevenueCat dashboard → Products/Offerings; App Store Connect → Subscriptions.
- **Do:** confirm the Premium monthly product ID, price tier, and offering match on both sides, and that the price the app paywall renders comes from the live offering (open the paywall on TestFlight and compare against ASC).
- **Done when:** paywall price on device == ASC configured price; a sandbox purchase succeeds and the `revenuecat-webhook` marks the account premium.
- **Common mistake:** fixing price in one system only — the flagged discrepancy was between doc claims and configured price; the app must show ASC truth.

## 6 · Set up real inboxes on getsvault.com (support@, privacy@, legal@)

- **2026-07-24 update:** these were pointing at `@getvault.app`, a domain that was never registered/hosted — every "email us" address in the app, website, and store copy was unreachable. Fixed in code: all three now read `@getsvault.com` (the domain you actually own and control) — `support@getsvault.com`, `privacy@getsvault.com`, `legal@getsvault.com`. This is committed in the working tree; nothing left to change in the repo. What's left is entirely external — creating the actual mailboxes:
- **Where:** wherever `getsvault.com`'s DNS is managed (your domain registrar or DNS host — check Vercel's domain settings for the registrar if you don't remember) + an email-hosting provider.
- **Do:**
  1. Pick an email provider: **Google Workspace** (~$6-7/mo/user, full inbox, most reliable for App Review-facing support) or a cheaper **forwarding-only** option (ImprovMX, Cloudflare Email Routing — both free, forward to your personal Gmail) if you don't need three separate real inboxes yet.
  2. Add the MX (and SPF/DKIM, if using Workspace) records the provider gives you to `getsvault.com`'s DNS.
  3. If forwarding: point `support@`, `privacy@`, `legal@` all to your own inbox — one address is enough to receive all three at launch; you don't need three separate mailboxes on day one.
  4. If Workspace: create at minimum a `support@getsvault.com` mailbox (the one App Review and users will actually use); `privacy@`/`legal@` can be aliases to it.
- **Done when:** send a test email from an outside account to `support@getsvault.com`; confirm it arrives and you can reply from that address (or your forwarding target).
- **Common mistake:** setting up email hosting but never adding the MX records at the DNS host — the provider account existing isn't enough; DNS has to point at it or mail bounces.

## 7 · Capture the 8 App Store screenshots (device)

- **Where:** physical iPhone Pro Max class (6.9", 1320×2868), demo account `appreview@getvault.app`.
- **Do:** everything is staged — follow the **per-frame navigation table** in `store/screenshot-plan.md` → "Capture readiness — verified & prepared 2026-07-19". Day-before: complete 1–2 moves so frame 2's delta and streak render.
- **Done when:** 8 raw PNGs at full resolution matching the PRIMARY narrative order; figures match the demo fixture ($12,450 idle · 42% utilization); "Illustrative" tags to be added in the frame template for frames 1/3/5; frame 8 cropped above the price.
- **Common mistake:** capturing frame 4 (Vault Closed) before doing the day's first two moves — the celebration only fires on the 3rd.

## 8 · Record the preview video + the 5 launch videos' screen recordings

- **Where:** same device/session as step 7.
- **Do:** `store/app-preview-video.md` for the ASC preview; then the ~90-minute one-session plan in `docs/marketing/launch/production/README.md` (recordings for V21, V24, V01, V22, V07).
- **Done when:** every "Required screen recordings" checkbox in the five `production/V*/PRODUCTION.md` files is satisfied.
- **Common mistake:** editing device time/battery inconsistently across takes; set Do Not Disturb, full battery, same time-of-day look.

## 9 · Voiceover + edit the five videos

- **Where:** your editor of choice; packages in `docs/marketing/launch/production/`.
- **Do:** record VO from each package's "Final voiceover text" (calm read; V07 deserves human voice), assemble per each "Editing timeline", export per each naming convention, and run each package's claims checklist before export.
- **Done when:** 5 masters + platform cuts exist and every claims checklist is ticked.
- **Common mistake:** adding hype in the edit — the calm is the positioning.

## 10 · Social accounts + posting

- **Where:** TikTok, Instagram, YouTube (Shorts), X, LinkedIn — handle: `getsvault` (or closest available; record finals in `MARKETING_SOURCE_OF_TRUTH.md`).
- **Do:** create accounts, bio = one-line promise + `getsvault.com` link **with the matching platform UTM from `launch-links.csv`**; post per `08_LAUNCH_CALENDAR_30_DAYS.md`; pin V21 then V24.
- **Done when:** accounts live, bio links tracked, first posts scheduled.
- **Common mistake:** raw `getsvault.com` in bios — every bio link needs its platform's UTM params or attribution is blind.

## 11 · Creator research + outreach

- **Where:** `docs/marketing/launch/ops/CREATOR_OPS.md` + `creators.csv` (import to Google Sheets).
- **Do:** prospect 20–30 real creators (research is external — nothing pre-populated by design), assign `creator_id`s, send approved messages §18–§20 from `09_LAUNCH_COPY.md`.
- **Done when:** 20+ rows with status `contacted`, follow-ups scheduled.
- **Common mistake:** improvising offer terms in DMs — the approved messages carry the only two guardrails + FTC line; keep them.

## 12 · TestFlight invitations

- **Where:** App Store Connect → TestFlight → External Testing.
- **Do:** create an external group, invite the first testers (waitlist emails), attach the current build; test notes = "first score in about 60 seconds; connect with Plaid Sandbox `user_good` if you don't want to link a real bank."
- **Done when:** invites accepted and at least a handful of sessions appear in analytics (`app_opened` in `analytics_events`).
- **Common mistake:** external groups need Beta App Review on first build — submit that early, it's not instant.

## 13 · Legal review pass (compliance backlog)

- **Where:** counsel or self-review checklist.
- **Do:** the flagged backlog: subscription-terms wording on the paywall (auto-renew disclosure), privacy-label accuracy vs `store/app-store-listing.md` §Privacy summary, GLBA/state-privacy applicability of Plaid data handling, FTC affiliate-disclosure process for creators (§CREATOR_OPS), and the consent-gate copy (`legal_acceptances` flow is live in prod).
- **Done when:** each item has a written yes/no/fix note; fixes land as repo changes.
- **Common mistake:** treating the empty testimonial section as filler to complete — it stays empty until real, permissioned quotes exist.

## 14 · Supabase dashboard spot-checks (no CLI access exists for these)

- **Where:** supabase.com/dashboard → project `gvdfypehwmemootjizmd`.
- **Do:** Edge Functions → `push-dispatch` → Logs: confirm the 15-minute cron invocations return 200 and show no errors; Table Editor → `notification_log`: rows progress `queued → sent` once a device with a valid push token is eligible (your phone, after the TestFlight build).
- **Done when:** one full `sent`/`delivered` row exists for your own device.
- **Common mistake:** reading the 2 existing `queued` `tier_up` rows as stuck — they wait for the send window/eligibility by design.
