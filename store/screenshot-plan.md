# VAULT — App Store Screenshot System (2026-07-19)

Claims policy: every overlay line complies with `docs/marketing/MARKETING_SOURCE_OF_TRUTH.md`.
Sizes: 6.9" (1320×2868) required; capture on an iPhone Pro Max class device or simulator.
Production note: capture from the **demo account** with a Plaid Sandbox connection — real app state, plausible numbers. Any figure that a viewer could read as a personal outcome is covered by a small "Illustrative" caption in the frame's corner. No fabricated balances beyond what the sandbox account actually shows in-app.

## Global art direction

- **Framing:** device in a thin dark bezel, slightly oversized, bottom-cropped on odd frames / top-cropped on even frames so consecutive frames feel like one continuous scroll.
- **Background:** the brand's night (#08080C) with the radial gold glow used on the website hero; frames 4 and 6 use cream (#FAFAF7) for rhythm. No stock photos, no hands, no lifestyle imagery.
- **Type:** Cormorant Garamond display for headlines (like the site), Inter for support lines. Gold (#C9A96E) accents only.
- **Copy discipline:** headline ≤6 words, support ≤12 words. One idea per frame. The 8 frames read as one story when swiped, and frame 1 works alone (most users see only it).

## PRIMARY narrative — "The Next Move" (launch version)

| # | Headline | Support line | App screen | Required state / data | Data type |
|---|---|---|---|---|---|
| 1 | **Your money has a next move.** | Specific moves, from your real accounts — every morning. | Home / Wealth Feed, one personalized move card front and center (idle-cash detector) | Demo account, Plaid Sandbox linked, feed composed with personalized moves | Seeded (sandbox) + "Illustrative" caption |
| 2 | **See what deserves attention.** | The Daily Open: what changed, what to do about it. | Daily Open brief — velocity delta since yesterday + today's hand | Demo account with a prior-day snapshot so the delta renders | Seeded |
| 3 | **Moves, not charts.** | Dollar amounts. Effort levels. Done in minutes. | Move card detail (credit-utilization detector) with impact + effort + action button | Sandbox card with utilization >30% | Seeded + "Illustrative" caption |
| 4 | **Close your vault. Every day.** | Three moves. A finish line. A streak worth protecting. | Vault Closed celebration + streak counter | Complete 3 moves on the demo account that day | Seeded (real celebration state) |
| 5 | **Ask with your numbers.** | The Concierge answers from your connected accounts — educational, straight. | Concierge conversation, one grounded Q&A visible ("What should I tackle first?") | Demo account, real Concierge response to a scripted question | Seeded (real response) + "Illustrative" caption |
| 6 | **Momentum you can measure.** | Wealth Velocity: 0–1000, built on how you handle money. | Score screen: score arc, tier badge, dimension bars | Demo account post-connect (real-data score badge visible) | Seeded |
| 7 | **Look. Never touch.** | Read-only via Plaid. Credentials never stored. Delete anytime. | Settings → connected accounts + delete-account row visible (or the Plaid consent screen) | Any connected state | Real UI |
| 8 | **When you want more why.** | Premium: unlimited Concierge, deep-dive sessions, your numbers. | Upgrade screen perks list (no price visible in crop) | Paywall open; **crop above the price line** | Real UI |

Emotional arc: promise → ritual → specificity → completion → intelligence → progress → safety → depth.
Objections answered in order: "what is it?" → "why daily?" → "is it generic?" → "will I stick with it?" → "why not ChatGPT?" → "what do I get long-term?" → "is my bank safe?" → "what's paid?"

Frame 8 crops out the price because metadata must never hardcode one; the App Store shows real pricing below the fold anyway.

## Alternative A — Action-first (test variant)

Reorders to pure move density: 1) move card idle cash · 2) move card subscription creep · 3) move card utilization · 4) Daily Open · 5) Vault Closed · 6) Concierge · 7) trust · 8) score. Hypothesis: three consecutive specific moves out-convert the narrative arc for cold search traffic ("the app is literally this").

## Alternative B — Progress-first (test variant)

1) Score reveal ("A score that moves when you do") · 2) tier ladder · 3) streak/Vault Closed · 4) move card · 5) Daily Open · 6) Concierge · 7) trust · 8) Premium. Hypothesis: score-reveal curiosity (credit-score psychology) hooks browsers; risk: re-imports the rejected status-first framing, so it must *test* its way in, never default.

## Alternative C — Trust-first (test variant)

1) "Look. Never touch." (read-only promise) · 2) 60-second score, no bank login (onboarding reveal) · 3) move card · 4) Daily Open · 5) Vault Closed · 6) Concierge · 7) score · 8) Premium. Hypothesis: for audiences arriving from privacy-skeptical contexts (Reddit), leading with the safety story lifts install→connect rate even if install rate dips.

## Recommendation

**Launch with the PRIMARY narrative.** It is the positioning, frame for frame. Once ASC search-ads or Product Page Optimization is available to the account, test in this order: (1) frame-1 headline "Your money has a next move." vs "Moves, not charts." — biggest single lever; (2) Primary vs Alternative A for search traffic; (3) Alternative C for creator/Reddit referral traffic via custom product pages. Progress-first (B) tests last and only against retention-qualified installs, per the positioning doc's rejection rationale.

## Capture checklist (manual, Imran)

1. Sign into the demo account on a physical iPhone; connect Plaid Sandbox (`user_good`).
2. Complete 2 moves the prior day so the Daily Open delta and streak render naturally; complete the 3rd during capture for the Vault Closed frame.
3. Ask the Concierge: "What should I tackle first this month?" — capture the grounded answer.
4. Screenshot at full device resolution; deliver raw PNGs to the frame template (background + type per this doc).
5. Verify every visible number is the sandbox account's real in-app state; add the "Illustrative" corner caption to frames 1, 3, 5.
