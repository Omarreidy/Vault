# VAULT End-to-End QA Review

Date: July 7, 2026
Account: appreview@getvault.app
Environment: Expo web at http://localhost:8081, mobile viewport 390x844

## Coverage

- Auth: switched from Create account to Sign in, signed in with the review account.
- Onboarding: reset account temporarily, tested hook, name, quiz, calculating, score reveal, and gaps. Account profile was restored to Alex Morgan / PLATINUM / score 741 / onboarding_complete true.
- Main app: Feed, notifications sheet, scanner entry, cohort feed, Vault score, Goals, Challenges, Pulse save, Signal/Research entry, Future trajectory/timeline, Plaid modal, Profile, Concierge entry, Settings, and logout area.
- API health: `npm run health` passed all 11 checks.

## Screenshots

- Auth: `qa-auth.png`, `qa-signin-filled.png`
- Feed: `qa2-feed.png`
- Onboarding: `qa-onboarding-hook.png`, `qa-onboarding2-reveal.png`, `qa-onboarding2-gaps.png`
- Vault: `qa2-vault-score.png`, `qa4-vault-goals.png`, `qa4-vault-challenges.png`
- Insights/Future/Profile: `qa2-pulse.png`, `qa3-research.png`, `qa2-future.png`, `qa2-timeline.png`, `qa2-profile.png`, `qa2-settings.png`

## Bugs and Issues

### High

1. Plaid web flow can produce false confidence.
   - Repro: Future > Connect > Plaid modal. The web copy says to connect in a new tab, then offers "I've connected my bank". In code, that calls `onSuccess([])` without a real Plaid callback/exchange.
   - Impact: User can believe a bank is connected when no account data was linked.
   - Fix: Remove manual success, or replace it with "I finished in Plaid, check connection" that verifies `plaid_items`/exchange status before closing.

2. Many controls are not accessible as buttons on web.
   - Repro: Inspect accessibility snapshot/focusables. Several `TouchableOpacity` rows expose as generic text only.
   - Impact: Keyboard and screen-reader users cannot reliably discover or activate key actions.
   - Fix: Add `accessibilityRole`, labels, selected/disabled state, and larger hit slop. Partially fixed for auth, Feed header/toggles, Insights actions/tabs, and Settings rows.

### Medium

3. Goals emitted an animated SVG console error on web.
   - Repro: Vault > Goals.
   - Impact: No visible crash observed, but the progress ring used an animated `react-native-svg` circle path that Expo web logged as an error.
   - Fix: Use a plain SVG `Circle` on web and keep the animated circle on native. Fixed in this pass.

4. Header icon controls are small and hard to hit.
   - Repro: On Feed, try tapping only the visible Scan/bell text/icon area in web. The tap is easy to miss.
   - Impact: Notifications and scanner feel hidden despite being important features.
   - Fix: Increase hit slop and add accessible labels. Partially fixed.

5. Settings/account actions are buried.
   - Repro: Profile > gear > scroll to bottom for Replay onboarding, Sign out, Delete account.
   - Impact: Logout and privacy/account controls require a long scroll and are not findable for first-time reviewers.
   - Fix: Add a sticky account footer or surface Sign out in the profile header menu.

6. Auth form does not behave like a web form.
   - Repro: Chrome console warns password field is not contained in a form.
   - Impact: Autofill, password managers, and Enter-to-submit are less reliable.
   - Fix: On web, wrap inputs in a form or handle `onSubmitEditing` consistently.

### Low

7. Dev console warnings remain: `shadow* style props are deprecated`, `props.pointerEvents is deprecated`, and web animation fallback warning.
   - Repro: Load app in Expo web dev mode.
   - Impact: No production break observed, but warning noise hides real issues.
   - Fix: Prefer `boxShadow` on web, move pointer events into style where supported, and audit animations that request native driver on web-only paths.

8. Onboarding CTA copy changes unexpectedly.
   - Repro: Reveal screen CTA says "See what's holding you back"; gaps screen CTA says "Show me my moves".
   - Impact: Not broken, but the final action is less clearly tied to entering the app.
   - Fix: Use one clear progression: "See my gaps" then "Enter Vault".

9. Social/cohort surfaces feel partly placeholder.
   - Repro: Profile > Leaderboard/Friends and Feed > Cohort.
   - Impact: The product promises cohort/social accountability, but empty states are generic until network density exists.
   - Fix: Seed richer cohort examples for first-run, or frame the feature as "forming" with a concrete invite loop.

## Console and Network

- Network/API failures: none observed in the health check or browser passes.
- `npm run health`: 11 healthy, 0 warnings, 0 broken.
- Console after fix: duplicate Supabase GoTrue client warning is gone; Settings text-node and Goals animated SVG errors were patched.
- Remaining console warnings are listed above.

## Differentiated Features

- Wealth Velocity score, tier ladder, and monthly recap language create a stronger identity than a generic budget app.
- Financial scanner ("asset or liability") is memorable and passed the backend health check.
- AI Concierge with consent flow and banking-context prompt is a strong differentiator.
- Future/FI trajectory and what-if scenarios make the product feel aspirational rather than ledger-like.
- Beliefs Audit is distinctive onboarding/feed content and feels closer to financial coaching than expense tracking.

## Generic or Thin Features

- Settings, notification preferences, and empty notifications are standard app patterns.
- Friends leaderboard/invite loop needs more concrete payoff to feel venture-scale.
- Goals are useful but currently conventional savings-progress cards.
- Plaid web connection flow feels like a workaround rather than a polished core integration.

## Fixes Implemented

- Reused the shared Supabase client in `src/services/concierge.ts` to remove the duplicate GoTrue client warning.
- Added accessibility roles/labels/states to key auth, Feed, Insights, and Settings controls.
- Added larger hit slop for Feed scanner and notification buttons.
- Fixed Settings web text-node noise by replacing string-leaking JSX conditionals with explicit null branches.
- Fixed Goal progress rings on web by using a non-animated SVG circle there.

## Follow-up Pass (July 7, 2026 — second round)

### Fixed

1. **Plaid web trust issue (High #1) — FIXED.** `PlaidLinkScreen.web.tsx` no longer has a
   blind "I've connected my bank" path. The button is now "I finished in Plaid — verify my
   connection": it queries the user's own `plaid_items` rows (RLS-scoped) and only reports
   success when the backend actually holds linked accounts. If none exist it says so honestly
   and asks the user to finish the Plaid flow. Copy updated: "After completing Plaid, return
   here and we'll verify your connection." Native iOS flow was already correct (real Plaid
   callback + token exchange) — untouched.

2. **Onboarding CTA progression (Low #8) — FIXED.** Reveal CTA is now "See my gaps →",
   final CTA remains "Show me my moves" with an explicit next-step line beneath it
   ("Next: your daily feed of personalized wealth moves."). Completing onboarding lands on
   the Feed tab (first tab in AppNavigator) — verified.

3. **Settings/account findability (Medium #5) — FIXED.** New ACCOUNT section (Sign out +
   Replay onboarding) sits directly after CONNECTED ACCOUNTS, mid-page instead of bottom.
   Delete account moved to its own DANGER ZONE section at the very bottom with a
   descriptive sub-line — harder to hit accidentally, still behind a destructive confirm.

4. **Accessibility round 2 (High #2, Medium #4) — EXTENDED.** Roles/labels/hitSlop added to:
   Settings close button, Notifications close + "Mark all read", Plaid close buttons
   (native + web), Plaid web verify button, cohort feed reaction buttons
   (with selected/disabled state), onboarding final CTA, and Switch rows (labels).
   Fixed last `{sub && <Text>}` text-node pattern in Settings ToggleRow.

### Intentionally left

- `shadow*` and `props.pointerEvents` deprecation warnings on web: fixing requires an
  app-wide styling refactor of `CARD_SHADOW` (used across ~20 components) for a dev-only
  warning with no production impact. Deferred.
- Notifications empty state copy kept — already VAULT-specific (score/moves/tier framing).
- Goals/cohort differentiation: addressed separately by tailored auto-goals generated from
  real Plaid data (commit 601a7cb) and the real Supabase-backed cohort layer (ac167dd).

### Verification (this pass)

- `npx tsc --noEmit`: 0 app errors.
- `npm run health`: 11/11 healthy (see terminal output).
- Web export bundles cleanly.
- Review account not modified (no onboarding replay, no data writes).
