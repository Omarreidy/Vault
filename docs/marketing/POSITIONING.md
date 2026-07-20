# VAULT — Market Positioning (Pre-Acquisition)

**Date:** 2026-07-19 · **Status:** Recommended, pending Imran's sign-off and real-user validation
**Basis:** Direct inspection of the shipping app (`src/`), website (`website/`), store metadata (`store/`), financial spec (`qa/FINANCIAL_SPEC.md`), QA review (`qa/QA_REVIEW.md`), and the launch-audit constraints.
**Companion doc:** `docs/marketing/MARKETING_SOURCE_OF_TRUTH.md` — the short rules file all future marketing work must follow.

---

## Executive summary

**Recommended position: VAULT is the finance app that tells you your next money move — three specific, dollar-quantified moves a day, generated from your real accounts, with a momentum score that compounds as you act.**

- **Category to create:** *Daily money moves* (action-first finance). Every incumbent is a mirror — it shows you your money. VAULT is the only product in the consideration set whose core object is a **move**: a specific action with a dollar amount, an effort level, and a finish line ("Vault Closed" after 3 moves).
- **Primary customer:** the *Behind-But-Earning* young professional (24–32, $50–110k) who earns decent money, has 3+ disconnected accounts, hates budgeting, and feels vaguely guilty that they "should be doing something" with their money.
- **Core problem owned:** **the action gap** — people don't lack financial data; they lack a clear, trustworthy answer to "what should I do next?" Awareness apps produce guilt; guilt produces deletion. (The website's own Problem section already says this: "Budgeting apps show you charts. Then guilt. Then you delete them.")
- **Backup position:** The Daily Open (ritual-led — "the 60-second morning money practice").
- **Rejected-though-seductive position:** status-first ("Your financial status, ranked" — the current App Store subtitle). Status stays as retention texture, not the acquisition promise. Reasons in Step 6.
- **Biggest risk:** the promise "tells you what to do next" is only as strong as move quality and variety. Today there are 5 personalized move detectors; by week 2 a connected user can exhaust the novel ones. This is a product-roadmap dependency of the positioning, not a copy problem.

---

## Step 1 — Product truth inventory

### A. Capabilities that exist and work (safe to market)

| Capability | Evidence |
|---|---|
| 3-question onboarding → server-computed starting score in ~60s, no bank link required | `OnboardingScreen.tsx`, `submit-onboarding` edge fn (server recomputes; client can't inflate) |
| Real Plaid connection, read-only, verified (no fake-success path) | `PlaidLinkScreen*.tsx`; QA High #1 fixed — web flow verifies `plaid_items` before claiming success |
| Wealth Velocity Score 0–1000, server-computed, deterministic, behavior-weighted (savings/investment/debt/spending), guarded columns (client cannot write score/tier/premium) | `calculate-score`, FINANCIAL_SPEC §5, D1 fix verified in prod |
| Tiers: Bronze → Silver → Gold → Platinum → Black, thresholds on score | `velocity.ts`, `brand.ts` |
| The Daily Open ritual: velocity delta since yesterday → 3 moves to close → XP → streak → "Vault Closed" celebration | `ritual.ts` (`DAILY_MOVES_TARGET = 3`), `feed.ts` ordering contract, `VaultClosedCelebration.tsx` |
| Personalized moves from real account data with real dollar amounts (idle checking cash, credit utilization >30%, no Roth IRA, no savings account, subscription bloat) | `feed.ts fetchPersonalizedMoves()` — rule-based, deterministic, sorted by impact |
| AI Concierge grounded in the user's actual balances/net worth/income estimates; streams; honest failure states ("Unable to connect", never fabricates); 5 free messages/day, unlimited with Premium | `concierge.ts`, `supabase/functions/concierge/prompt.ts`, FINANCIAL_SPEC §13 |
| Deterministic XP economy (effort-based, +15 personalized bonus, never random), streaks on local calendar (timezone bug fixed), challenges, achievements gated on real Plaid data | `ritual.ts`, FINANCIAL_SPEC §10/D3 |
| Auto-seeded goals from real Plaid data (emergency fund, debt payoff, investment ladder) | `goals.ts`, FINANCIAL_SPEC §9 |
| FI trajectory / what-if projections (4% SWR; action boost) | `trajectory.ts`, FINANCIAL_SPEC §8 |
| Financial scanner ("asset or liability?") with validated output and honest error card | `financialScanner.ts`, D12 fixed |
| Real cohort layer: activity feed, reactions, referrals (+75 XP both sides), leaderboard rank among real onboarded profiles | Supabase RPCs, FINANCIAL_SPEC §11 |
| In-app notifications built only from real on-device state ("nothing here is invented") | `notifications.ts` |
| Trust infrastructure: RLS, guarded entitlement columns, read-only Plaid, no data selling, delete-account, legal consent gate with explicit "educational only" acknowledgement | `legal.ts`, `LegalAcknowledgementScreen.tsx`, D1 |
| Premium (RevenueCat, server-verified entitlement): unlimited Concierge, deep-dive sessions, account-grounded guidance, future Premium features | `UpgradeScreen.tsx` PERKS (deliberately honest), `premium.ts` |

### B. Capabilities that exist but are weak (market with restraint)

- **Move variety:** only 5 personalized detectors; the rest of the feed is generic. A connected user can exhaust novel personalized moves within ~2 weeks.
- **Subscription/"leak" detection:** relies on legacy Plaid `category[]` strings, which modern Plaid responses may return as `null` (FINANCIAL_SPEC §4). "Leaks, spotted for you" is real but fragile.
- **Cohort/social density:** real infrastructure, but empty until network exists; QA flagged it "feels partly placeholder."
- **Score dimension display without Plaid:** synthesized from the onboarding score (plausible-but-synthetic; FINANCIAL_SPEC §5).
- **Income estimation:** silent $5k/month fallback shapes the spending score when no payroll transactions are detected.
- **Percentile:** a formula of the user's own score (`score/1000×95+5`), *not* a measured population statistic. Never market "you're in the top X% of Americans/members."

### C. Partially built (do not market until shipped)

- Push notification delivery (client+server built and verified 2026-07-18; deploy, migration, and device test still pending).
- Legal-consent migration (built 2026-07-17; not yet pushed to prod by Imran).
- Server-side Concierge rate limiting / entitlement check (free limit is client-enforced only today).

### D. Planned or nonexistent (NEVER claim)

- Exclusive partner rates, partner access, "Member Card," concierge priority tiers
- Monthly wealth reports; advanced Signal tab; premium financial products
- Guaranteed savings or any quantified outcome promise
- Bill negotiation, subscription cancellation *on the user's behalf* (Rocket Money's turf — VAULT surfaces, the user acts)
- Money movement of any kind (VAULT is read-only)
- Real-time/live score updates (score recomputes from a ≤30-day snapshot on refresh)
- Human advisors, fiduciary advice, tax preparation

### E. Existing claims that must be fixed or retired (compliance backlog — do not reuse in new marketing)

| Location | Claim | Problem |
|---|---|---|
| `src/services/progression.ts` tier unlock copy | "partner rates," "exclusive partner access," "concierge priority," "Member Card" | Features do not exist — in-app overclaim, contradicts launch audit |
| `src/services/progression.ts` (prog_g3) | "73% of people who ask, get something" | Unsourced statistic (violates the no-unsourced-claims rule) |
| `store/app-store-listing.md` | "Watch it climb in real time" | Score is snapshot-based, not real-time |
| `store/app-store-listing.md` | "Your AI advisor" | Regulated-adjacent term; legal docs say educational only — use "Concierge" |
| `store/app-store-listing.md` subtitle | "Your financial status, ranked." | Rejected position (Step 6); replace |
| `website` Hero | "Private-bank intelligence, in your pocket" | Puffery implying a service tier that doesn't exist; soften or cut |
| `website` MeetVault | "It sees everything." | False — HSA, PayPal, mortgages, and unrecognized subtypes are excluded from every number (FINANCIAL_SPEC §2) |
| `website` WealthFeed example card | "Annual fee posts Friday — call for a retention offer first." | Implies predictive bill detection that doesn't exist; replace with a real detector example |
| `website` WealthFeed | "generated from your actual accounts **overnight**" | Moves are generated on open from the stored snapshot; drop "overnight" |
| ToS/store ($12.99) vs `UpgradeScreen`/Settings ($9.99) | Price inconsistency | Reconcile before any paid campaign (RevenueCat is truth; docs must match) |

### F. What VAULT genuinely does unusually well

1. **It has a finish line.** Bank apps and dashboards are infinite scrolls of information. VAULT is bounded: three moves, vault closed, done for the day. No finance app in the consideration set can be *completed*.
2. **Its atomic unit is an action, not a chart.** The core data type in the codebase is literally `WealthMove` — title, dollar impact, effort level, action label. The product is built around doing.
3. **Moves carry the user's own numbers.** "$4,200 sitting idle in checking" hits differently than "consider a high-yield savings account."
4. **A momentum score that behavior can actually change** — accessible from any starting balance. **Claim carefully:** the formula weighs ratios and habits heavily, but it also includes balance thresholds (investment-balance milestones, savings levels), so the supportable phrasing is "how you handle money, not just how much you have" — never the absolute "behavior, never balance." (Corrected 2026-07-19; the absolute form previously appeared here and on the website.)
5. **An AI that answers with your numbers** and honestly refuses to fabricate when data is missing.
6. **A verified honest-data discipline** — the no-fake-data rule is enforced in code and audit. This is a trust asset almost no consumer fintech can claim; marketing should quietly radiate it.

---

## Step 2 — Highest-value target customer

### Segment evaluation

| Segment | Life stage / income | Frustration & tension | Trust / avoid | Plaid? | Pay? | Retention | CAC | Verdict |
|---|---|---|---|---|---|---|---|---|
| **Behind-But-Earning young professional** | 24–32, $50–110k, 3+ accounts | "I make decent money — why does it feel like I'm not getting anywhere?" Guilt without a system; hates budgeting | Trusts design + read-only + specificity; avoids anything that feels like a lecture | High (already uses fintech) | High ($10/mo is a normal subscription) | High (streak psychology fits their Duolingo/Whoop habits) | Medium | **PRIMARY** |
| Recent graduates | 22–25, $35–65k, first salary | "Nobody taught me any of this"; overwhelm at first paycheck | Trusts peer content; avoids jargon | Medium | Medium | Medium | Low–medium | **SECONDARY** |
| Optimizer / self-improvement identity | 25–38, varies; tracks gym, sleep, reading | "Money is the one area of my life without a system" | Trusts scores, streaks, metrics; avoids fluff | High | High | High | Medium | **SECONDARY** |
| College students | 18–22, minimal income | Money anxiety, but little to optimize | High app comfort | Low value from Plaid (thin accounts → few moves fire) | Low | Low | Low | Reject for launch |
| Paycheck-to-paycheck | Any age, strained | Survival stress, not optimization | May feel judged by a "wealth" brand; moves like "move idle $4k" won't fire | Medium | Low | Low | Reject for launch (revisit with different move set) |
| First-time investors | 24–35 | "Which account do I even open?" | Trusts guidance | High | Medium | Medium | High (Robinhood et al. own the keywords) | Fold into primary, don't lead |
| People who want status/visible progress | 20–30 | Wants to feel ahead of peers | Fragile: status claims in finance read as gimmick | Medium | Medium | Medium–high | Medium | Texture, not target |

### Primary: the Behind-But-Earning young professional

- **Who:** 24–32, employed, $50–110k, urban/suburban, 3–6 financial accounts across checking, an old 401(k), maybe a Robinhood account, 1–2 credit cards.
- **Current tools:** bank app (checked passively), maybe a dead Mint/Monarch trial, occasional ChatGPT money questions, no spreadsheet discipline.
- **Main frustration:** knows roughly where they stand; has no idea what to *do*, in what order.
- **Emotional tension:** quiet guilt + comparison anxiety. Earning "enough" makes the drift feel more shameful, not less.
- **Desired identity:** "someone who has their money handled" — competent, quietly ahead, not a spreadsheet person.
- **Trigger moments:** payday, a raise, a friend mentioning their Roth IRA, tax season, seeing rent leave the account, a viral "how much you should have saved by 30" post.
- **Why they'll trust VAULT:** specificity (their own numbers), read-only access, no ads/data selling, a designed, premium feel.
- **Why they'd avoid it:** Plaid hesitation; "another finance app I'll abandon"; skepticism that AI + gamification is a gimmick.
- **Why this segment wins:** they have enough financial surface area for the move detectors to fire real, impressive moves on day one (idle cash, credit utilization, no Roth); they're subscription-normalized; their habit psychology matches the streak loop; and they're reachable with content about the exact feeling the product resolves.

### Secondary segments

1. **Recent graduates** — same promise, "start right" framing; feeds the primary segment in 2–3 years.
2. **Optimizers** — highest organic-content leverage (they post streaks and scores); message: "the last untracked system in your life."

---

## Step 3 — The real problem

- **Functional problem:** no clear, prioritized next action. Every existing tool ends at awareness (charts, categories, balances).
- **Emotional problem:** money guilt and avoidance. Awareness without action doesn't create progress — it creates shame, then deletion.
- **Identity problem:** "I'm bad with money" as a fixed trait. VAULT's loop converts identity from *state* (balance) to *behavior* (moves made), which the user controls.
- **Habit problem:** no financial routine exists between "check balance nervously" and "annual panic."
- **Social/status problem:** progress is invisible — there's no felt reward for doing the right thing with money.
- **Trust problem:** generic advice feels like content marketing; advisors feel like they're for rich people; AI feels ungrounded.

**The problem VAULT should own: the action gap.** People have never had more financial data and less clarity about what to do next. This is the problem the product mechanically solves (moves), emotionally solves (relief + completion), and habitually solves (the Daily Open). The functional statement of the problem is the position: *finance apps show you your money; none of them tell you what to do with it.*

---

## Step 4 — Six positioning directions

### Direction 1 — "The Financial Operating System" (system-led; current website hero)

- **Target:** tech-literate professionals · **Category:** financial OS / super-app
- **Problem:** disconnected tools, no unified intelligence · **Promise:** one system that runs your financial life
- **Functional benefit:** everything understood in one place · **Emotional:** sophistication, control · **Identity:** "I run my money like a company"
- **Reason to believe / proof:** Plaid aggregation + score + concierge + feed *(but VAULT reads and suggests — it doesn't run anything; loans/HSA excluded; no money movement)*
- **Download:** curiosity about "OS" · **Return:** weak — OS implies ambient, not daily pull · **Pay:** unclear from the frame
- **Objection:** "So… what does it actually do?" · **Trust risk:** breadth overclaim · **Competitive weakness:** "financial OS"/"super app" already used by Copilot, M1, others; ChatGPT-era "OS" is noise
- **Long-term expansion:** high (the frame can hold future products)
- **Homepage H1:** "Wealth has a new operating system." · **Sub:** "VAULT reads your real accounts, scores your momentum, and hands you tomorrow's money move."
- **ASC subtitle:** "Run your money like a system" · **15s ad:** montage of connected accounts assembling into a dashboard → score → move
- **Word-of-mouth:** "It's like an operating system for your money" *(listener still has to ask what it does)*
- **Avoid:** "runs your money," "sees everything," "all your money in one place"

### Direction 2 — "Your Financial Chief of Staff" (AI-led)

- **Target:** busy professionals · **Category:** AI money assistant
- **Problem:** money questions with no trusted, personalized answerer · **Promise:** an AI that knows your numbers and handles the thinking
- **Functional:** grounded answers on demand · **Emotional:** relief of delegation · **Identity:** "I have people for this"
- **Proof:** Concierge genuinely reasons from real balances; honest failure states; 5 free msgs/day, unlimited on Premium
- **Download:** "ChatGPT but it knows my accounts" · **Return:** weak — chat is pull, not push · **Pay:** strongest of all directions (Premium *is* unlimited Concierge)
- **Objection:** "I can ask ChatGPT for free" · **Trust risk:** high — AI + bank access is the scariest possible combination for skeptics; "advisor" language is regulated-adjacent
- **Competitive weakness:** Cleo, Copilot Intelligence, Monarch AI, every bank's chatbot — crowded and low-trust
- **Expansion:** medium · **Homepage H1:** "The first money question it can't answer is none." · **Sub:** "VAULT's Concierge answers with your actual balances — not generic advice."
- **ASC subtitle:** "Money answers, your numbers" · **15s ad:** user asks "Can I afford Lisbon in October?" → grounded answer with real numbers
- **Word-of-mouth:** "It's an AI you can ask money questions and it actually knows your accounts"
- **Avoid:** "advisor," "financial planner," "manages your money"

### Direction 3 — "The Daily Open" (ritual-led)

- **Target:** habit-driven self-improvers · **Category:** daily money practice
- **Problem:** no financial routine; money only gets attention in panic moments · **Promise:** 60 seconds a morning quietly rebuilds your relationship with money
- **Functional:** daily brief + 3 moves + streak · **Emotional:** calm, momentum, "handled" · **Identity:** "I'm someone with a money practice"
- **Proof:** the loop is fully built — delta since yesterday, 3 moves to close, XP, streaks, Vault Closed celebration
- **Download:** "Duolingo for money" instantly parses · **Return:** the strongest of all directions — the position *is* the retention loop · **Pay:** indirect (ritual is free; Concierge upsell needs a bridge)
- **Objection:** "A streak app for money sounds gimmicky" · **Trust risk:** medium — ritual framing can undersell financial substance · **Competitive weakness:** habit apps have taught users that streaks ≠ outcomes
- **Expansion:** high (rituals scale to weekly/monthly practices)
- **Homepage H1:** "Sixty seconds a morning. That's the whole system." · **Sub:** "Open the vault, see what changed overnight, make three moves, close it. Done."
- **ASC subtitle:** "The 60-second money habit" · **15s ad:** coffee brews; phone: +6 velocity, three cards swiped, vault seals shut; VO: "Done before the coffee."
- **Word-of-mouth:** "It's like Duolingo but for your actual bank accounts"
- **Avoid:** "life-changing habit," promising outcomes from streaks alone

### Direction 4 — "The Next Move" (action-led)

- **Target:** Behind-But-Earning young professionals · **Category:** daily money moves (action-first finance)
- **Problem:** the action gap — every finance app stops at awareness · **Promise:** you will always know your next money move
- **Functional:** three specific, dollar-quantified moves a day from your real accounts · **Emotional:** relief — the "what should I be doing?" hum goes silent · **Identity:** from "bad with money" to "someone who makes moves"
- **Proof:** real move detectors quoting the user's own numbers ("$4,200 sitting idle in checking"); impact-sorted feed; Concierge for the "why"; momentum score that responds to behavior
- **Download:** clearest promise in the set — answers the exact question users type into Google · **Return:** new moves daily + streak + delta · **Pay:** natural ladder — free tells you *what*, Premium (unlimited Concierge) is *unlimited why and how, grounded in your accounts*
- **Objection:** "How good are the moves, really?" · **Trust risk:** move quality must hold; repetitive moves break the promise (top product dependency) · **Competitive weakness:** incumbents can bolt on "recommendations" — VAULT's moat is the loop (moves + finish line + momentum), which must stay ahead
- **Expansion:** high — "next move" scales from cancel-a-fee to open-a-Roth to estate planning; category noun ("money moves") is ownable and already the product's core object
- **Homepage H1:** "Your money has a next move." · **Sub:** "VAULT reads your real accounts and hands you three specific moves every morning — with the dollar amounts that make them worth doing. Most take minutes."
- **ASC subtitle:** "Your next money move, daily" · **15s ad:** bank app scroll (charts, nothing to do) → cut to VAULT: "$4,200 idle in checking → move it." Swipe. Done. "Charts don't build wealth. Moves do."
- **Word-of-mouth:** "It looks at your actual accounts and tells you three specific things to do each day — with real dollar amounts."
- **Avoid:** "we do it for you" (VAULT doesn't execute), "guaranteed savings," "advice"

### Direction 5 — "Wealth Velocity" (status/progress-led; current ASC subtitle)

- **Target:** status-motivated 20s · **Category:** financial status & score
- **Problem:** financial progress is invisible and unrewarded · **Promise:** your financial life, scored and ranked — rise on habits, not just holdings
- **Functional:** 0–1000 score, five tiers, streaks, shareable wins · **Emotional:** pride, comparison, climb · **Identity:** "I'm Gold tier"
- **Proof:** the score/tier system is real, server-computed, behavior-weighted, ungameable by clients
- **Download:** score-reveal curiosity is a proven hook (credit-score psychology) · **Return:** decent (tier climb) · **Pay:** weak — status doesn't map to unlimited Concierge
- **Objection:** "Is this a game or a finance tool?" · **Trust risk:** highest in the set — status framing invites gimmick dismissal exactly where trust matters most; percentile is synthetic; tier "rewards" copy currently overclaims (partner rates that don't exist); confusion with credit score
- **Competitive weakness:** Credit Karma owns "free score" mindshare; a status app with an empty cohort at launch undercuts its own promise
- **Expansion:** medium — status ceilings out; wealth is mostly built privately
- **Homepage H1:** "Your financial status, ranked." · **Sub:** "A 0–1000 score for how you move money — climb the tiers on behavior, never balance."
- **ASC subtitle:** "Your financial status, ranked." · **15s ad:** score count-up 0→684, tier flip to GOLD, share card
- **Word-of-mouth:** "It gives you a wealth score and tiers like a credit card"
- **Avoid:** "top X% of members" (synthetic percentile), tier perks, any implication that score = creditworthiness

### Direction 6 — "The Wealth Ladder" (plan/outcome-led)

- **Target:** goal-driven savers, first-$100K seekers · **Category:** wealth-building action plan
- **Problem:** wanting to build wealth with no ordered path · **Promise:** a sequenced ladder from wherever you are to financial independence
- **Functional:** tier gateway moves (HYSA → Roth → index fund → $100K), auto-seeded goals, FI trajectory with what-ifs · **Emotional:** direction, hope · **Identity:** "I'm on the path"
- **Proof:** progression ladder + goals + trajectory all exist *(but the ladder is static content, and "plan" implies more personalization than the product delivers)*
- **Download:** strong for searchers ("how to build wealth") · **Return:** weak — a plan is consulted, not visited daily · **Pay:** moderate (deep-dive sessions fit "plan me")
- **Objection:** "Every finance site has a checklist like this" · **Trust risk:** "plan" edges toward advice/outcome territory · **Competitive weakness:** content sites and advisors do "plans" with more authority
- **Expansion:** medium · **Homepage H1:** "The ladder from your first $1k to financial independence." · **Sub:** "VAULT sequences the moves — you climb."
- **ASC subtitle:** "Your wealth ladder, in order" · **15s ad:** ladder rungs lighting up: HYSA → Roth → first index fund → $100K
- **Word-of-mouth:** "It gives you the ordered checklist to build wealth and tracks you up it"
- **Avoid:** "your personalized financial plan," retirement-outcome promises

### Scoring matrix (1–10, scored honestly; no direction was given a thumb on the scale)

| Criterion | 1 OS | 2 Chief of Staff | 3 Daily Open | 4 Next Move | 5 Status | 6 Ladder |
|---|---|---|---|---|---|---|
| Five-second clarity | 4 | 6 | 7 | **10** | 6 | 7 |
| Differentiation | 5 | 4 | 7 | **8** | 8 | 5 |
| Credibility vs product | 5 | 7 | **9** | **9** | 6 | 6 |
| Emotional strength | 4 | 5 | 7 | **8** | 8 | 6 |
| Product alignment | 5 | 6 | **9** | **9** | 7 | 6 |
| Trust | 6 | 4 | 7 | **7** | 4 | 6 |
| App Store conversion | 4 | 5 | 7 | **9** | 6 | 6 |
| Paid-ad potential | 4 | 5 | 6 | **9** | 6 | 6 |
| Organic-content potential | 4 | 6 | 8 | 8 | **9** | 5 |
| Retention alignment | 5 | 4 | **10** | 8 | 7 | 5 |
| Subscription alignment | 5 | **9** | 5 | 7 | 4 | 5 |
| Category potential | 7 | 4 | 7 | **8** | 6 | 5 |
| **Mean** | **4.8** | **5.4** | **7.4** | **8.3** | **6.4** | **5.7** |

Direction 4 wins on the criteria that decide acquisition (clarity, credibility, store conversion, paid ads) while staying near the top on retention. Direction 3 is its natural mechanism — in the final position, **the Daily Open becomes *how* VAULT delivers the next move**, so the backup is largely absorbed rather than discarded. Direction 2 becomes the Premium story. Direction 5 becomes retention texture.

---

## Step 5 — Competitive positioning

> Competitor feature descriptions below reflect general market knowledge as of early 2026. **Verify every specific competitor claim before using it in any comparative ad** (per the no-unsourced-claims rule). None of the recommended copy names competitors.

| Alternative | Hired to do | Better than VAULT at | VAULT better at | Why switch / why refuse | Message to use / not use |
|---|---|---|---|---|---|
| **Bank app** | Check balance, pay bills | Authority, money movement, free, zero setup | Cross-account view; telling you what to *do*; momentum | Switch: "my bank never told me my cash was idle." Refuse: inertia, "another app" | Use: "Your bank shows you what happened. VAULT shows you what to do next." Not: "replace your bank" (VAULT can't move money) |
| **Rocket Money** | Find/cancel subscriptions, bill negotiation | Executes cancellations/negotiations *for* you | Breadth of moves beyond bills; daily practice; grounded AI; momentum identity | Switch: outgrew "cancel my subscriptions." Refuse: wants done-for-you execution | Use: "Canceling subscriptions is one move. VAULT deals you a new hand every day." Not: any claim VAULT cancels or negotiates for you |
| **Monarch Money** | Full-picture budgeting/planning, couples | Depth of tracking, budgets, shared finances, reporting | Action-first loop; a finish line; behavior score; lighter daily touch | Switch: "I set up Monarch and stopped opening it." Refuse: loves budget granularity | Use: "Tracking is homework. Moves are progress." Not: "more features than Monarch" (false) |
| **Copilot Money** | Beautiful iOS spend tracking | Categorization polish, design-led tracking | Same as Monarch: doing vs seeing | Same dynamics | Same contrast; never fight on design alone |
| **Credit Karma** | Free credit score, card offers | Free, real credit bureau data, huge distribution | Whole-financial-life behavior score; no ads; the user is the customer, not the product | Switch: wants guidance, not card offers. Refuse: "free is enough" | Use: "A score you can actually move — and nobody's selling you a credit card." Not: any comparison implying Velocity is a credit score |
| **Robinhood** | Trade/invest | Executing investments | Deciding what account/action comes first | Mostly complementary — VAULT's Roth/index-fund moves hand off to brokers | Use: "Before you pick stocks, make the moves that actually matter." Not: investment-performance claims |
| **ChatGPT** | Free money Q&A | Free, unlimited, general knowledge | Answers grounded in *your* balances by default; a daily push loop; a score that remembers; finance-specific guardrails | Switch: tired of re-typing their financial situation. Refuse: "free is fine" | Use: "Generic AI knows money. VAULT's Concierge knows *your* money." Not: "smarter than ChatGPT" |
| **Spreadsheets** | Total control, custom tracking | Infinite flexibility; trust in own math | Automation; zero maintenance; proactive detection | Spreadsheet people rarely switch — don't spend against them | Use (softly): "The spreadsheet shows the leak in row 40. VAULT flags it before Tuesday." Not: mocking spreadsheets |
| **Traditional budgeting apps (YNAB et al.)** | Envelope discipline | Methodology, devoted community | No guilt loop; minutes not hours; action over categorization | Switch: budgeting felt like punishment. Refuse: methodology believers | Use: "Budgeting tells you no. VAULT tells you next." Not: "budgeting doesn't work" |
| **Doing nothing** (the real #1) | Avoiding the anxiety | Zero effort, zero confrontation | 60-second score with no bank link; relief instead of shame; smallest possible first step | Switch: a trigger moment + a promise that takes one minute. Refuse: fear of seeing the truth | Use: "Find out where you stand in 60 seconds. No bank login needed." Not: fear/shame angles — shame is the incumbent, don't feed it |

---

## Step 6 — Final positioning

### PRIMARY: The Next Move (Direction 4), delivered through the Daily Open (Direction 3)

**Why it won:** It is the only direction that is simultaneously (a) understandable in five seconds, (b) mechanically true of the shipping product, (c) aimed at the exact gap every competitor leaves open, and (d) naturally laddered into the paid product (free = today's moves; Premium = unlimited grounded answers about any move, any time). It converts VAULT's most distinctive engineering — the move object, the impact sort, the 3-move finish line, the behavior score — into the promise itself. And it gives the category a noun users already say ("money moves") rather than an abstraction they have to learn.

- **Category:** *Daily money moves* — action-first finance. Not a budgeting app, not a tracker, not a chatbot. (Claim the category descriptively; do not claim "first" or "only" in public copy.)
- **Target customer:** Behind-But-Earning young professionals, 24–32, $50–110k, multiple accounts, no system, allergic to budgeting.
- **Problem:** the action gap — you can see all your money and still have no idea what to do next. Awareness apps end in guilt; guilt ends in deletion.
- **Promise:** *You will always know your next money move.* Three specific, dollar-quantified moves a day — most doable in minutes.
- **Mechanism:** the Daily Open. VAULT reads your connected accounts (read-only), finds what's working against you — idle cash, credit utilization, missing accounts, subscription creep — sorts by dollar impact, and deals you three moves. Do them, close the vault, keep the streak, watch your Wealth Velocity climb.
- **Proof:** moves quote your own numbers; the score is computed server-side from behavior and can't be inflated; the Concierge answers follow-ups from your actual balances; when VAULT doesn't know, it says so — nothing is fabricated.
- **Emotional payoff:** relief and completion. The background hum of "I should be doing something with my money" goes silent by 8 a.m.
- **Identity transformation:** from "I'm bad with money" (a state) to "I make moves" (a behavior). Tiers, streaks, and Wealth Wins make the new identity visible and shareable — status is the *reward* for action, never the pitch.
- **Competitive contrast:** every finance app shows you your money. VAULT tells you what to do with it — and makes doing it feel like progress instead of homework.
- **Trust boundary (never imply):** guaranteed savings or outcomes; financial/investment/tax advice; real-time data; money movement or done-for-you execution; features that don't exist (partner rates, wealth reports, premium products); measured population percentiles; credit-score equivalence.

### BACKUP: The Daily Open (Direction 3, ritual-led)

Kept warm rather than shelved — it's the mechanism inside the primary position and the natural fallback if user testing shows "tells you what to do" reads as too advisory or too good to be true. Its retention alignment is a perfect 10 and its credibility is absolute (the loop exists exactly as described). Its weakness as a *primary* is acquisition economics: "a 60-second money habit" requires the listener to already believe habits compound, while "know your next money move" pays off in the first session. If CAC on action-led creative disappoints, re-lead with the ritual and let "moves" become the supporting proof.

### REJECTED (seductive but wrong): Wealth Velocity status-first (Direction 5 — the current App Store subtitle)

This is the direction closest to the original TikTok+AmEx vision, and it should be *retired as the lead* deliberately, not drift on by default:

1. **Trust tax at the exact moment trust decides.** The download decision in finance is a trust decision. "Your financial status, ranked" reads as entertainment precisely where users are choosing whether to hand over bank credentials.
2. **The proof isn't there at launch.** Status needs an audience; the cohort is real but empty. Tier-unlock copy currently promises rewards that don't exist (Step 1E). Percentile is synthetic. A status pitch invites scrutiny of exactly the claims VAULT can't yet support.
3. **It narrows the market.** Status-seeking is a minority public motivation even among people strongly moved by it privately — few adults want to say "I downloaded an app to rank my wealth." "Know your next move" is the same climb with a socially safe alibi.
4. **It's monetization-orphaned.** Premium is unlimited Concierge; status doesn't sell that.
5. **Status still gets its job.** Tiers, streaks, score reveals, and Wealth Wins remain the retention and share engine — inside the product, where they're delightful, rather than on the storefront, where they're suspect.

Also demoted: "Wealth has a new operating system" as the website H1. "Financial operating system" survives as interior brand language (site section headers, About copy, investor narrative) but not as the five-second pitch — it scores 4 on clarity and the product doesn't operate anything.

---

## Step 7 — Messaging system

1. **Category statement:** VAULT is a daily money-moves app — action-first finance, built on your real accounts.
2. **One-sentence positioning:** VAULT reads your real accounts and tells you your next money move — three specific, dollar-quantified moves a day, with a momentum score that climbs as you act.
3. **Five-second pitch:** VAULT tells you your next money move. Every day. From your real accounts.
4. **Fifteen-second pitch:** Finance apps show you charts. VAULT reads your actual accounts and hands you three specific moves every morning — idle cash to relocate, a fee to kill, an account you're missing — with the dollar amounts attached. Do them in minutes, close the vault, watch your momentum score climb.
5. **Thirty-second pitch:** You don't need another chart — you need to know what to do next. VAULT connects to your accounts read-only, finds what's quietly working against you, and deals you three specific moves each morning, sorted by dollar impact. Most take minutes. Completing them closes your vault for the day, builds your streak, and moves your Wealth Velocity — a 0–1000 score based on how you behave with money, not how much you have. Questions? The Concierge answers with your actual numbers, not generic advice. Free to start; your first score takes 60 seconds, no bank login required.
6. **Founder pitch (Imran's voice):** I kept watching smart people earning good money feel behind — not because they lacked information, but because nothing ever told them what to do next. Banks show you what happened. Budgeting apps grade your past. So the average person's "financial plan" is guilt. VAULT flips it: connect your accounts, and every morning it hands you the three highest-impact moves it can find in your actual data. There's a finish line every day. Momentum you can watch. That's the whole idea — close the gap between knowing and doing.
7. **Investor-style pitch (internal only):** Consumer finance has an engagement asymmetry: the products with daily habit loops (banks, trackers) create no action, and the products that create action (advisors) have no daily loop. VAULT owns the gap with an action-first loop — personalized, dollar-quantified daily moves from Plaid data, a completion mechanic, and a behavior-based momentum score — monetized by an AI concierge grounded in the user's own accounts. The loop drives retention; retention drives the subscription; the move graph compounds into a defensible dataset of what actions users actually take.
8. **Word-of-mouth explanation:** "It looks at your actual bank accounts and tells you three specific things to do each day — like 'you've got $4,000 sitting idle, here's where it should go' — and you build a streak doing them."
9. **Homepage headline:** Your money has a next move.
10. **Homepage subheadline:** VAULT reads your real accounts and hands you three specific moves every morning — with the dollar amounts that make them worth doing. Most take minutes. The momentum compounds.
11. **Primary CTA:** Get your score in 60 seconds *(App Store download button retains standard badge; this is the supporting line)*
12. **Secondary CTA:** Watch the Daily Open *(demo video)*
13. **Three primary benefits + 14. proof for each:**
    - **Always know your next move** — proof: move cards generated from your connected accounts, quoting your own balances, sorted by dollar impact.
    - **Feel progress daily** — proof: 3-move Daily Open with a real finish line, streaks on your actual behavior, a server-computed 0–1000 momentum score no one can inflate — including you.
    - **Ask anything, get *your* answer** — proof: Concierge responses are grounded in your real balances and net worth; when data's missing it says so instead of guessing.
15. **Feature-to-benefit translations:**
    - Plaid read-only connection → "VAULT can look, never touch."
    - Impact-sorted move feed → "The biggest dollar wins surface first."
    - Wealth Velocity score → "A number that moves when *you* move — how you handle money, not just how much you have."
    - Vault Closed + streaks → "A finance app you can finish. Sixty seconds and you're done."
    - Deep-dive Concierge sessions (Premium) → "A long, unhurried conversation about your debt plan — grounded in your actual numbers."
16. **AI Concierge value statement:** Ask the Concierge anything about your money and it answers from your actual accounts — your balances, your debt, your cash flow — not from generic internet advice. Educational guidance, straight answers, and if it doesn't have the data, it tells you.
17. **Daily-moves value statement:** Every morning, VAULT scans your connected accounts and deals you three specific moves — real dollar amounts, real impact, most doable in minutes. Not tips. Not articles. Moves.
18. **Progress-system value statement:** Your Wealth Velocity score (0–1000) is built from how you save, spend, invest, and handle debt — not just how much you have — so it can climb from any starting point. Close your vault daily, keep the streak, rise through the tiers.
19. **Trust statement:** Read-only access through Plaid — VAULT can see, never move, your money. Credentials never touch our servers. Your data is never sold, there are no ads, and you can delete everything with one tap. Every number in VAULT comes from your real data or is labeled an estimate — nothing is fabricated.
20. **Plaid connection explanation:** VAULT connects to your bank through Plaid, the same connection layer used by major banks and apps you already use. You log in with Plaid, not with us — we never see or store your credentials, and access is strictly read-only.
21. **Premium value statement:** VAULT Premium removes the Concierge's daily limit: unlimited questions, long deep-dive sessions (debt payoff plans, investing decisions, negotiation prep), every answer grounded in your connected accounts — plus every future Premium feature as it ships. One good money decision can cover the year. *(State price only as shown in-app until the $9.99/$12.99 discrepancy is reconciled.)*
22. **App Store subtitle options (≤30 chars):** "Your next money move, daily" (27) · "Daily moves from real accounts" (30) · "Know your next money move" (25) · "3 daily moves. Real momentum." (29). Name suggestion to test: "VAULT: Daily Money Moves" (24).
23. **App Store promotional-text options (≤170 chars):**
    - "Connect your accounts and VAULT hands you three specific money moves every morning — real dollar amounts from your real data. Open the vault. Close it in minutes."
    - "Stop staring at charts. VAULT finds the idle cash, the creeping fees, the missing accounts — and tells you exactly what to do about them. Three moves a day."
24. **Social-profile bio:** Your money has a next move. Three a day, from your real accounts. 🔒 Read-only · Never sold · getsvault.com
25. **Launch announcement (short form):** VAULT is live. Every finance app shows you your money — VAULT tells you what to do with it. Connect your accounts (read-only, via Plaid) and get three specific moves every morning with the dollar amounts attached. Close your vault daily. Watch your momentum climb. Your first score takes 60 seconds — no bank login needed.
26. **Ten advertisement hooks** *(dollar examples must depict real detector behavior and be labeled illustrative where required):*
    1. "Your bank app shows you what you spent. VAULT shows you the $4,200 doing nothing — and where it should go."
    2. "I don't budget. I get three moves a day."
    3. "Charts don't build wealth. Moves do."
    4. "A finance app with a finish line: three moves, vault closed, done by 8 a.m."
    5. "You don't have a money problem. You have a 'what do I do next' problem."
    6. "Deleted my budgeting app. Kept the one that tells me what to do."
    7. "It found the subscription creep, the idle cash, and the credit-card timing I was getting wrong — in one morning."
    8. "Most finance apps grade your past. This one deals your next hand."
    9. "60 seconds. No bank login. Find out where you actually stand."
    10. "The gap between knowing your finances and doing something about them? That's the whole app."
    11. *(Ritual variant for testing)* "Coffee brews. Vault opens. Three moves. Vault closed. That's the practice."
27. **Ten organic-content hooks:**
    1. Day-30 streak post: "30 days of closing my vault — here's every move it dealt me."
    2. "I asked an AI that can see my actual accounts what I'm doing wrong. It was uncomfortably specific." *(Concierge screen recording, numbers blurred)*
    3. "Things my bank never told me, week 3" (running series of real detector finds)
    4. "Rating my money moves by dollar impact — smallest to largest"
    5. Score-reveal reaction: "I answered 3 questions and it estimated my Wealth Velocity. Then I connected my accounts. It dropped."
    6. "POV: a finance app you can actually *finish* every day"
    7. "The 5 money leaks VAULT looks for in your accounts (I had 3 of them)"
    8. "My boyfriend thinks I 'suddenly got good with money.' It's three moves a day."
    9. "What closing your vault 7 days straight does to your brain"
    10. "Budgeting apps vs. a moves app — 2 weeks each, here's what actually changed"
28. **Five creator talking points:** (1) show a real move card with your own (or demo-account) numbers — specificity is the hook; (2) the finish line: film "vault closed" as the daily payoff; (3) the score only moves on behavior — you can't buy your way up; (4) read-only via Plaid, credentials never stored — say it on camera; (5) never promise savings amounts or outcomes — show what it *found*, not what it guarantees.
29. **Five objection responses:**
    - *"Another finance app I'll abandon."* — Most finance apps are homework with no finish line. VAULT is three moves and done — the average session is about as long as brushing your teeth, and there's a streak that makes you protective of it.
    - *"I'm not connecting my bank to an app."* — Fair. Start without connecting: 60 seconds, three questions, your starting score. When you're ready, the connection is read-only through Plaid — we never see your credentials and can't move a cent.
    - *"ChatGPT answers money questions free."* — It answers questions about money *in general*. The Concierge answers about *your* money — it can see your actual balances (read-only) — and VAULT surfaces the moves before you'd think to ask.
    - *"Is this a game or a real finance tool?"* — The score and streaks make progress visible, but every number underneath is your real account data, and the score is computed on our servers from behavior — nobody can inflate it, including you.
    - *"Is it financial advice?"* — No — VAULT is educational. It shows you what's in your data and explains options; it never manages money and big decisions deserve a qualified professional. That's stated in-app, plainly.
30. **FAQ (public):**
    - *What does VAULT actually do?* Reads your connected accounts (read-only), finds what's costing you or missing, and gives you three specific moves a day plus an AI Concierge that answers with your numbers.
    - *Do I have to connect my bank?* No — you get a starting score from three questions. Connecting unlocks moves and answers based on your real data.
    - *Is my data safe?* Read-only via Plaid; credentials never stored by VAULT; encrypted in transit and at rest; never sold; delete everything anytime in Settings.
    - *Is this financial advice?* No — educational information only, and the app says so explicitly. Consult a qualified professional for major decisions.
    - *What's the Wealth Velocity score?* A 0–1000 measure of financial behavior (saving, investing, debt, spending) computed from your data. It is not a credit score and doesn't affect one.
    - *What's free vs. Premium?* Free: daily moves, score, goals, streaks, and 5 Concierge messages a day. Premium: unlimited Concierge with deep-dive sessions, grounded in your accounts, plus future Premium features.
    - *Can VAULT move my money?* Never. Read-only, by design.

---

## Step 8 — Brand language

### Own (repeat relentlessly)

"Money moves" / "your next move" · "the Daily Open" / "Vault Closed" · "Wealth Velocity" · "momentum" · "how you handle money, not just how much you have" · "moves, not charts" · "the action gap" · "read-only" · "your real accounts" / "your actual numbers" · "a finance app with a finish line" · "grounded in your accounts" · "look, never touch" · "streak" · "close your vault"

> ⚠️ Retired 2026-07-19: the absolute "behavior, not balance" / "never by balance" — the score formula includes balance thresholds, so the absolute form is unsupportable. Use the "not just how much you have" form.

### Use carefully (with the stated guardrail)

- **"Financial operating system"** — interior brand flourish only (About page, deep site sections, investor narrative); never the headline promise; never "runs/manages your money."
- **"Personalized"** — always anchor to mechanism: "from your connected accounts," never bare.
- **"Wealth" / "build wealth"** — as direction and identity ("wealth-building behavior"), never as promised outcome ("VAULT builds your wealth" is out).
- **"AI Concierge"** — fine as the product name; always pair first public mentions with "educational guidance."
- **"Financial score" / "Wealth Velocity"** — always distinguish from credit score at first mention in any new surface.
- **"Financial health"** — generic; use only in passing, never as the promise.
- **"Bank-grade encryption"** — prefer the specific truth (AES-256 at rest, TLS 1.3 in transit, read-only via Plaid).
- **Dollar examples in ads** ("$4,200 idle") — must depict what detectors actually catch; label illustrative where the surface implies a testimonial.
- **"Save money"** — only as "find where money is leaking," never a quantified promise.

### Never use

- **"Financial advisor" / "advisor" / "financial plan(ner)" / "fiduciary"** — regulated-adjacent; legal position is educational-only. (Also fix the internal Concierge prompt's self-description eventually.)
- **"Real-time" / "live"** for scores or data — snapshot-based; say "updated when your accounts refresh."
- **"Guaranteed," "get richer," any promised savings/outcome amount**
- **"Premium insights," "wealth reports," "partner rates," "member card," "priority concierge"** — don't exist.
- **"Top X% of members/Americans"** — percentile is synthetic.
- **"All your money in one place" / "sees everything"** — false (HSA/PayPal/mortgages excluded).
- **"Take control of your finances," "your financial future starts here," "budget better," "smarter financial decisions," "AI-powered finance"** — banned generics.
- Unsourced statistics of any kind. Fabricated testimonials/reviews of any kind (Founding section stays empty until real quotes exist, with permission).
- Fear/shame creative ("you're behind and it's your fault") — shame is the incumbent we're displacing.

---

## Step 9 — Scenario validation (10 users)

| User | Thinks VAULT is | Attracts | Confuses / objection | Download? | Connect? | Pay? | Message adjustment |
|---|---|---|---|---|---|---|---|
| College student, 20 | "Duolingo for money" | Score reveal, streaks | Moves don't fire on a $300 checking account → feels thin | Yes | Maybe | No | None — accept weak fit; don't spend here |
| Recent grad, 23, first job | "The app that tells me what to do with my first paycheck" | "In order, for me" sequencing | Jargon (Roth, utilization) — needs the `lesson` explainers surfaced | Yes | Yes | Later | Lean on "no idea where to start? It's 3 questions" |
| 25-year-old, $70k | Exactly the promise: next moves from real accounts | "$4,200 idle" specificity | "How is this different from Mint?" → answer: Mint watched, VAULT deals | **Yes** | **Yes** | Likely (Concierge habit) | None — this is the bullseye |
| Paycheck-to-paycheck | "An app for people with money to move" | Score without bank login | Moves assume surplus; "wealth" branding can sting | Maybe | Hesitant | No | Don't target; keep onboarding non-judgmental |
| Rocket Money user | "Rocket but broader?" | Daily moves beyond bills | Expects done-for-you cancellation — VAULT doesn't execute | Maybe | Yes | Maybe | Say "you act, with exact instructions" — never imply execution |
| Monarch user | "A lighter, action-first Monarch" | Finish line; no budget upkeep | Misses budget depth; may keep both | Yes (alongside) | Yes | Maybe | Position as complement: "Monarch tracks. VAULT moves." (organic only) |
| Beginner investor | "It'll tell me what account to open first" | Roth/index-fund gateway moves | Wants stock picks — VAULT must visibly not do that | Yes | Yes | Maybe | Set boundary early: "moves, not picks" |
| Plaid-uncomfortable | "An app that wants my bank login" | 60-second no-connection score | The connect ask itself | Yes | **No (at first)** | No | Lead every funnel with the no-connection path; read-only messaging at the moment of ask, not before |
| "Budgeting is boring" | "Finally not a budget" | Three-and-done; no categorizing | Streak skepticism ("gimmick?") | **Yes** | Yes | Maybe | "No budgets. No categories. Three moves." — strongest anti-budget creative |
| Status-motivated | "A wealth score I can climb" | Tiers, Black tier mystique, share cards | Empty cohort at launch; wants visible rank | Yes | Yes | Weak | Let them discover status *inside*; don't re-lead with it |

**Net finding:** the action-led message survives all ten without modification to its core; the two real funnel risks are (1) the Plaid ask — solved by always offering the 60-second no-connection score first, and (2) execution expectations from Rocket Money users — solved by "exact instructions, you act" phrasing.

---

## Step 10 — Implementation package

### Website copy recommendations (`website/`)

1. **Hero H1:** replace "Wealth has a new operating system." → **"Your money has a next move."** Keep the vault/gold aesthetic untouched — the visual world is an asset.
2. **Hero sub:** "VAULT reads your real accounts and hands you three specific moves every morning — with the dollar amounts that make them worth doing. Most take minutes. The momentum compounds." (Drops "Private-bank intelligence.")
3. **MeetVault:** "It sees everything." → "It sees where you stand." (fixes the overclaim).
4. **WealthFeed example cards:** replace the "Annual fee posts Friday" card with a real detector example (e.g., "Credit utilization at 42% — pay $600 before your statement closes."). Drop "overnight."
5. **Problem section:** already on-strategy ("Budgeting apps show you charts. Then guilt. Then you delete them.") — keep verbatim; it's the best line on the site.
6. **Add a "How it works" triad** matching the three primary benefits (moves → finish line → grounded answers).
7. **Trust section:** keep as-is — it's specific and true.
8. **Founding/testimonials:** remains empty until real, permissioned quotes exist.

### App Store copy recommendations (`store/app-store-listing.md`)

- **Name (test):** "VAULT: Daily Money Moves" · **Subtitle:** "Your next money move, daily"
- **Description:** rebuild from the messaging system above; delete "real time," "AI advisor" (→ "AI Concierge"), and the social-media-addiction framing ("as addictive as social media" invites Apple-review and trust problems); keep tier/status content as a middle section, not the lead.
- **Screenshots order:** 1) a move card with dollar amount, 2) Daily Open brief with delta, 3) Vault Closed + streak, 4) Concierge grounded answer, 5) score/tiers, 6) trust panel.
- **Keywords:** add "money moves, what to do with money, next move"; drop "status."
- Reconcile listed price with RevenueCat before submission.

### Social & advertising direction

- **Paid:** direct-response creative built on hooks #1–#5; always end on the 60-second no-bank-login score to soften the Plaid cliff. Measure CPI *and* connect-rate — a cheap install that never connects is not acquisition.
- **Organic:** the streak/score/discovery formats (Step 7 #27); creators show real move cards with blurred numbers; never scripted outcome claims.
- **Tone:** confident, specific, dry wit; never shame; never hype. The brand whispers money and shouts specificity.

### Premium messaging

Free = today's moves and your score. Premium = the unlimited version of the question that follows every move: *"okay — why, and how, for me?"* Unlimited Concierge, deep-dive sessions, grounded in connected accounts, future Premium features included. Never sell Premium with features from the nonexistent list (Step 1D).

### Testing hypotheses (falsifiable)

1. Action-led hero beats status-led and OS-led on 5-second comprehension ("what does this app do?") by ≥30 pts.
2. "Your next money move, daily" beats "Your financial status, ranked." on tap-through in ASC search-ads A/B.
3. Ads ending on "60 seconds, no bank login" produce a higher *connect* rate downstream than ads leading with Plaid-powered specificity, despite softer clicks.
4. Post-reveal onboarding copy "Connect to get your three moves" beats "Connect to unlock your real score" on connect rate.
5. Users retained ≥14 days describe VAULT with "tells me what to do" language unprompted (word-of-mouth playback test).

### Open questions requiring real-user evidence

- Does "moves" read as *actions* or as *investment trades* to cold audiences? (If trades: adjust to "money moves" everywhere, never bare "moves," and test.)
- Where exactly is the Plaid-consent cliff in the funnel, and does the no-connection score meaningfully recover it?
- Do week-2 users hit move repetition, and how fast does it burn the promise? (Determines urgency of new detectors.)
- Which price is real — $9.99 or $12.99 — and does the Premium bridge ("why and how, unlimited") convert at either?
- Does the cohort layer at low density help or hurt first impressions? (QA flagged it can read as placeholder.)

---

*All public claims in this document trace to shipping code or verified audits cited in Step 1. Anything not listed in Step 1A/B must not be marketed. This document is superseded in case of conflict by `MARKETING_SOURCE_OF_TRUTH.md` plus the legal disclaimers in `src/constants/legal.ts`.*
