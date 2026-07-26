# Build 24 — Release Notes & Build Record

**Version:** 1.0.0 (build 24, auto-incremented from remote) · **Profile:** production · **Previous TestFlight build:** 23 (commit `6f73089`, 2026-07-13)
**This build's commit:** `baf724b` · **Purpose:** unblock Phase 3 (App Store screenshots + launch-video screen recordings) with an app that reflects all post-build-23 work.

## Why this build now (build-credit rationale)

One EAS build credit remained and credits reset at the start of the month. The Apple organization migration (Vault Wealth LLC) is unlikely to complete before the reset, and **the Certificates/Identifiers/Profiles portal locks for the duration of the migration** — so a build attempted during migration can fail outright. Building *before* replying to Apple therefore costs nothing that wouldn't reset anyway, and it unblocks all of Phase 3.

Build 23 predates ~2,000 lines of app changes including every claims-compliance copy fix. **Screenshots captured from build 23 would show retired, non-compliant copy** and would have to be recaptured. This build makes the on-device app match the approved store copy.

## What's changed since build 23 (47 app files)

### Legal & compliance
- **New legal acknowledgement gate** (`LegalAcknowledgementScreen`, `AcknowledgementCheckbox`, `legalConsent.ts`) — consent is recorded server-side in `legal_acceptances`.
- **New disclaimer surfaces** — `DisclaimerCard`, `InlineDisclaimer` components.
- **Claims-consistency fixes** (from the 2026-07-19 audit): "Live score" → "Score" on the Score screen; paywall "Advice" → "Guidance"; removal of fabricated perks, unsourced statistics, hardcoded prices, percentile claims, and advisor framing across screens and services.
- **Real support addresses** — every in-app contact address is now `@getsvault.com` (was the unregistered `@getvault.app`, which bounced). Mailboxes verified live.

### Notifications
- Full client notification system: deep links (warm + cold start) via `navigationRef` + `notificationRouting`, badge clearing, token clearing on sign-out (both paths), token-rotation listener.
- Cross-device preference sync with quiet hours and pause (`notificationPrefs.ts` → `notification_prefs` table).
- Notification centre copy de-faked — actual timestamps, no invented figures.

### Instrumentation
- 17 new funnel analytics events (auth, onboarding, score reveal, Plaid start/exit, concierge, paywall, referral, app open). Pre-signup events now record correctly (the RLS policy that silently dropped them was fixed server-side and is live).

### Product surfaces
- Daily Open / `DailyBriefCard` refinements; feed personalization updates (`feed.ts`); substantial `insights.ts` rework; Settings screen rebuilt (notification controls, quiet hours, dead controls removed); Upgrade screen copy; locale service added.

## TestFlight "What to Test" notes

> Build 24 — the compliance + notifications build.
>
> • First run now shows a legal acknowledgement step — please read it and confirm it's clear.
> • Notification settings (Settings → Notifications): toggles, quiet hours, and pause should persist across app restarts.
> • Tap a push notification and confirm it opens the right screen, both when the app is open and fully closed.
> • The Daily Open, feed, and Settings copy have changed throughout — flag anything that reads as an overpromise or a certain outcome.
> • Your first score takes about 60 seconds and needs no bank login. To connect accounts without a real bank, use Plaid Sandbox: `user_good` / `pass_good`.
>
> Report anything odd to support@getsvault.com.

## Pre-build verification (2026-07-26)

| Check | Result |
|---|---|
| `npm run typecheck` | clean |
| `npm test` | 238/238 pass (incl. 18 claims-regression tests) |
| `npm run health` | 12 healthy · 0 warnings · 0 broken |
| Working tree | clean at `baf724b` (docs-only edit pending) |
| Push key `G5C3T49D48` | valid on Apple's servers |
| Dist cert / provisioning profiles | active to 2027-06-18 |

## Known limitations of this build

- Built under the **Individual** team (`MX438B4597`, Omar Reidy). After the Vault Wealth LLC migration completes, the distribution certificate and provisioning profiles will need regenerating, and **a fresh build will be required for the actual App Store submission** — this build is for TestFlight, screenshots, and video capture.
- **`eas.json` submit config is correct as-is — do not "fix" the appleId.** It reads `omarreidy2@gmail.com` (personal) while the developer account is `nmjaffee@gmail.com` (work, inbox not accessible). This is fine: submission authenticates with the **App Store Connect API Key** (`N9ZV54N66H`, ADMIN role) held in EAS credentials — a token, not an email login. Build 20 was submitted and reviewed under this same config; it was rejected for org enrollment, never for authentication. Apple-ID *login* (as during `eas credentials`) is separate and works via 2FA to the trusted phone, which Omar has.
