# VAULT — Claims Checklist (run on EVERY new asset)

Authority order: `src/constants/legal.ts` + `MARKETING_SOURCE_OF_TRUTH.md` > `POSITIONING.md` > this checklist. `tests/claims.test.ts` enforces a subset automatically on `src/`, `website/src`, `store/`, and the concierge prompt — docs and off-repo assets (videos, captions, emails, DMs) are enforced only by this checklist, so run it by hand.

## The 60-second pass (any asset: video, caption, email, screenshot, reply)

1. **Capability:** every claim maps to POSITIONING Step 1A (shipping + verified). Nothing from 1C (partial: push at the time of writing, server-side rate limit) or 1D (nonexistent: partner rates, member card, wealth reports, negotiation/cancellation, money movement, human advisers).
2. **Numbers:** every figure is (a) the demo account's real in-app state, (b) sourced, or (c) labeled **Illustrative**. No population stats, ever ("most people," "73%," "average American spends…"). No "top X%" / age-group comparisons — the stored percentile is synthetic.
3. **Adviser boundary:** no "advisor/adviser/advice/planner/fiduciary" framing except explicit negation ("not a financial adviser"). Concierge = "educational guidance," paired at first mention.
4. **Freshness:** no "real-time," no "live" (sole exception: the Market tab's quoted data, with timestamps). Say "when your accounts refresh" / "a refreshed snapshot."
5. **Outcomes:** no guarantees, no promised savings amounts, no credit-score point promises, no "builds your wealth." Habit language ("compounds") applies to behavior, never returns.
6. **Execution:** VAULT never moves money, cancels, negotiates, or trades — "it finds, you act." Read-only appears alongside every Plaid mention.
7. **Three-moves phrasing:** "three moves closes your vault" (mechanic) ✔ — "three novel dollar-quantified moves from your accounts every day" (promise) ✘. Move variety is finite; never promise daily novelty.
8. **Price:** never a number anywhere. "Price is shown in the app." RevenueCat/ASC is the only source.
9. **Coverage:** never "all your money in one place" / "sees everything" (HSA, PayPal, mortgages excluded).
10. **Social proof:** no invented testimonials, reviews, user stories, or recency ("found $400 last Tuesday"). Fictional scenarios carry a visible "Imagine/hypothetical" label. Founding section stays empty until real, permissioned quotes exist.
11. **Tone:** no shame, no fear, no hype, no banned generics ("take control of your finances," "your financial future starts here," "budget better," "smarter financial decisions," "AI-powered finance"). No "first/only" claims; no named-competitor claims without verified sourcing.
12. **Disclosures:** creator/UGC content carries #ad per FTC; Reddit/community posts disclose founder status.

## Asset-type addenda

- **Screenshots/video:** demo account + Plaid Sandbox only; never edit numbers in post; "Illustrative" corner tag on any frame with dollar figures; crop prices out of paywall shots.
- **App Store metadata:** additionally passes `npm test` (claims suite scans `store/`).
- **Support/review replies:** use the templates (`store/app-store-listing.md`, `09_LAUNCH_COPY.md` §24–28); improvised replies still take this checklist.
- **Anything that fails a point:** fix the asset, or if the asset reveals a *repo* surface violating policy, fix the surface and extend `tests/claims.test.ts` with the pattern.
