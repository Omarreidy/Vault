# VAULT — Faceless Content Engine: Six Pillars (Phase 4)

Platforms: TikTok, Instagram Reels, YouTube Shorts. No founder face required — every format below works with screen recordings, text-on-screen, VO (recorded or quality TTS), and simple b-roll (hands, desk, coffee, phone — never faces).

**Universal claims boundaries (apply to every pillar):**
- All app footage from the demo account (Plaid Sandbox); any dollar figure on screen carries a small "Illustrative" caption.
- Never a fabricated user outcome or fake personal story — fictional scenarios must be labeled ("Imagine:" / "Say you're…").
- Never: guarantees, savings promises, "advisor," "real-time/live" (except the market tab), percentiles, prices, "sees everything," shame or fear framing.
- The Plaid mention is always paired with "read-only."
- Sponsored/creator content is disclosed per FTC rules (#ad).

**Universal metrics:** 3-second hold rate → completion rate → profile visits → link taps (`?creator=`/`?utm_content=` attributed) → **website→store clicks → installs → account connections** (the only number that ultimately counts). Vanity views explicitly do not gate decisions.

---

## Pillar 1 — Your Next Money Move (the promise, demonstrated)

- **Target viewer:** 24–32, salaried, multiple accounts, scrolls money content but acts on none of it.
- **Emotional tension:** "I know I should be doing *something* with my money — I just don't know what, or in what order."
- **Core message:** there is always a specific, knowable next move — and an app that finds yours in your own accounts.
- **Visual style:** screen-recorded move cards on the night/gold UI; big captions; satisfying completion ticks.
- **VO style:** calm, specific, zero hype — "here's what it found, here's why it matters."
- **Repeatable format:** **"The Move"** — one detector per video: what it catches, why it costs you, what the move is. Infinite series (idle cash, utilization, missing Roth, missing HYSA, subscription creep — then rotate scenarios).
- **Connection to VAULT:** the move card IS the content; no bridge needed.
- **CTA:** "Your accounts have moves in them. VAULT finds yours — link in bio."
- **Claims boundaries:** moves shown must map to real detectors in `src/services/feed.ts`; never imply VAULT executes the move.
- **Metrics focus:** link taps → connect rate (this pillar should drive the most qualified installs).

## Pillar 2 — Behind-But-Earning (identity)

- **Target viewer:** same demo, but reached through feeling rather than product interest.
- **Emotional tension:** "I make decent money. Why does it feel like I'm not getting anywhere?" — quiet guilt, comparison anxiety, earning-but-drifting.
- **Core message:** you're not bad with money; you've never had a system that tells you what to do next. The gap is structural, not moral.
- **Visual style:** text-on-screen over muted b-roll (commute, desk, direct deposit notification, rent leaving); slower pace; no UI until the last beat.
- **VO style:** second-person, empathetic, never preachy; names the feeling precisely.
- **Repeatable format:** **"Be honest"** — a series of named, specific micro-feelings ("payday amnesia," "the raise that changed nothing," "the Roth conversation you nodded through").
- **Connection to VAULT:** last beat only — "this is the exact feeling VAULT was built for."
- **CTA:** soft — "60 seconds, three questions, no bank login. See where you stand."
- **Claims boundaries:** never shame ("it's your fault" framing banned); never invented statistics about "most people."
- **Metrics focus:** completion rate + saves/shares (identity content spreads); installs are secondary here.

## Pillar 3 — What Financial Dashboards Fail To Tell You (contrast)

- **Target viewer:** people who tried Mint/Monarch/Copilot/bank apps and quietly stopped opening them.
- **Emotional tension:** "I have all the data and none of the direction." Post-budgeting-app disillusionment.
- **Core message:** awareness isn't progress. Charts show what happened; none of it tells you what to do. That's the action gap.
- **Visual style:** split-screen or hard cuts: generic chart/dashboard aesthetic (grayscale, busy) vs one gold move card (calm, specific).
- **VO style:** dry, slightly wry; states the obvious thing nobody says.
- **Repeatable format:** **"Shown vs Told"** — "Your bank shows you X. It never tells you Y." One pair per video.
- **Connection to VAULT:** VAULT is the "told" side of every pair.
- **CTA:** "Stop being shown. Start being told — VAULT, link in bio."
- **Claims boundaries:** never name competitors in paid or claim superiority with unverifiable specifics; generic category contrast only ("budgeting apps," "your bank app").
- **Metrics focus:** 3-second hold (the contrast is the hook) + link taps.

## Pillar 4 — Quiet Wealth-Building Behavior (psychology)

- **Target viewer:** self-improvement identity (tracks gym/sleep/reading); secondary optimizer segment.
- **Emotional tension:** "Money is the one area of my life without a system." Loud money culture (trading, hustle, flexing) feels wrong; doing nothing feels worse.
- **Core message:** wealth is mostly built quietly — small, boring, repeated moves; behavior compounds before balances do.
- **Visual style:** minimal — single line of serif text on dark, slow reveals; occasional streak/score UI beat.
- **VO style:** measured, almost essayistic; the "quiet luxury" of money content.
- **Repeatable format:** **"Quiet rules"** — one principle per video ("the person with a system beats the person with a windfall"), grounded in a VAULT mechanic at the end.
- **Connection to VAULT:** streaks, the daily practice, the score that responds to how you handle money — not just how much you have.
- **CTA:** "Build quietly. VAULT — three moves a day."
- **Claims boundaries:** principles stay behavioral, never outcome-promising ("compounds" describes habits, not returns); no unsourced stats.
- **Metrics focus:** saves + follows (this pillar builds the account's identity).

## Pillar 5 — VAULT Product Demonstrations (proof)

- **Target viewer:** warm audience — profile visitors, repeat viewers deciding whether to install.
- **Emotional tension:** "Okay but what actually happens when I download it? And is the bank thing safe?"
- **Core message:** here is the real product doing the real thing: 60-second score, the Daily Open, a move completing, the Concierge answering with account numbers, read-only trust.
- **Visual style:** clean full-screen recordings, real pace (light speed-ramps), captions narrating; nothing staged beyond the demo account.
- **VO style:** founder-adjacent but faceless — "let me show you" energy, plain language.
- **Repeatable format:** **"Watch it work"** — one flow per video, start to finish, no jump cuts that hide steps (trust is the point). Includes the dedicated read-only/Plaid explainer and delete-account demo.
- **Connection to VAULT:** is VAULT.
- **CTA:** direct — "Free to try. Your first score takes 60 seconds, no bank login."
- **Claims boundaries:** demo account only; show honest states (including the Concierge saying it lacks data); never edit numbers in post.
- **Metrics focus:** link taps → install → **connect rate** (this pillar exists to close).

## Pillar 6 — Financial Momentum & Identity (the loop)

- **Target viewer:** habit-app natives (Duolingo/Whoop/Strava users) 22–35.
- **Emotional tension:** "I can keep a streak for Spanish and the gym — why is money the thing I avoid?" Progress in money is invisible, so it never feels rewarding.
- **Core message:** momentum needs a finish line and a visible score; VAULT gives money both — and doing becomes identity ("I make moves").
- **Visual style:** kinetic UI moments — streak counters, Vault Closed seals, score deltas, tier thresholds; satisfying, game-feel edits.
- **VO style:** energetic but dry; the satisfaction is in the visuals.
- **Repeatable format:** **"The Close"** — vault-closing moments, streak milestones, "what day N of closing your vault feels like"; plus "finish line" essays.
- **Connection to VAULT:** the celebration/streak UI is the content.
- **CTA:** "A finance app you can finish. Close your first vault today."
- **Claims boundaries:** streaks reward behavior, never promised outcomes; status/tiers shown as texture, never "ranking against people your age."
- **Metrics focus:** shares + rewatches; retention framing ("finish line") feeding Day-1 return expectations.

---

**Posting mix (launch month):** P1 ×6 · P2 ×5 · P3 ×5 · P4 ×4 · P5 ×6 · P6 ×4 = 30 videos (see `07_LAUNCH_VIDEOS.md`). Every video ends on one CTA and carries an attributed link (`getsvault.com?utm_source={platform}&utm_content={video-id}`).
