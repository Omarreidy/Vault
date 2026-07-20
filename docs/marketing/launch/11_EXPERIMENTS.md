# VAULT — First Marketing Experiments (Phase 8)

**Evidence honesty:** launch traffic is small. Every rule below distinguishes **directional** evidence (enough to keep/kill a tactic for now) from **reliable** evidence (enough to lock strategy). Nothing here invents sample sizes the funnel can't produce; thresholds are minimum-observation floors, not significance claims. Re-test anything strategy-defining once volume allows.

Priority = expected information value ÷ cost. Run E1–E5 in month 1 (they piggyback on the launch calendar); E6–E10 as volume arrives.

---

### E1 · Does action-first beat status-first? (the positioning bet)
- **Hypothesis:** "Your money has a next move" produces more *qualified* interest than status-first framing.
- **Variable:** creative framing. **Control:** action-first videos/captions (V01/V21/V22). **Variant:** two status-framed edits of the same footage (score reveal/tier climb led).
- **Audience:** organic social, interleaved posting weeks 2–3.
- **Primary metric:** link-tap → `appstore_cta_click` rate per 1k views. **Guardrails:** downstream connect rate (status must not attract non-connectors); comment sentiment.
- **Tracking:** `utm_content` per video (already wired). **Minimum evidence:** ≥2k views per arm, ≥30 total link taps → directional; reliable only via later store-page test (E4/PPO).
- **Decision rule:** if status-led wins CTR but loses connect rate — positioning holds (it predicts exactly this). If status wins both by >30% relative, escalate to a store-page test before touching the position.
- **Next action:** winner's framing gets 2× posting slots; log verdict in this file.

### E2 · Which segment connects accounts most?
- **Hypothesis:** Behind-But-Earning converts to *connection* better than optimizers or grads.
- **Variable:** audience entry point. **Control:** P2 identity videos (V07/V10). **Variants:** P4/V19 (optimizer), V04 (beginner-investor lean).
- **Primary metric:** per-`utm_content` cohort: campaign-level connect rate (F8-style 72h window). **Guardrails:** volume per arm (a tiny high-rate arm isn't a strategy yet).
- **Minimum evidence:** ≥20 installs per arm → directional. **Decision rule:** best-connecting segment owns 50% of month-2 content; others keep 1 slot/week as scouts.
- **Next action:** update `06_CONTENT_PILLARS.md` posting mix.

### E3 · Which message produces qualified users, not cheap installs?
- **Hypothesis:** "60 seconds, no bank login" entry produces fewer clicks but more connects than "$4,200 idle" specificity entry.
- **Variable:** CTA framing across otherwise-similar videos. **Control:** specificity-led CTA. **Variant:** no-login-led CTA.
- **Primary metric:** connect rate per campaign cohort. **Guardrails:** absolute installs (don't celebrate a 90% rate on 4 people).
- **Tracking:** `utm_content` naming both CTA styles. **Minimum evidence:** ≥25 installs per arm.
- **Decision rule:** qualified-rate winner becomes the default video outro; loser survives only inside trust-content (V24).
- **Next action:** update the CTA line in `07_LAUNCH_VIDEOS.md` defaults.

### E4 · Screenshot sequence
- **Hypothesis:** PRIMARY narrative beats Alternative A (action-density) on store conversion for search traffic.
- **Variable:** first 3 screenshots. **Control:** PRIMARY. **Variant:** Alternative A (per `store/screenshot-plan.md`).
- **Primary metric:** ASC impression→download rate via Product Page Optimization. **Guardrails:** day-1 retention of the winner's cohort.
- **Minimum evidence:** ASC PPO needs ~300+ impressions/arm for a directional read; let it run 2+ weeks.
- **Decision rule:** >15% relative lift sustained → promote variant; else keep PRIMARY (it carries the positioning).
- **Next action:** then test frame-1 headline (the bigger lever) as its own PPO.

### E5 · Which pillar produces account connections?
- **Hypothesis:** P5 demos (V21/V22/V24) drive the highest connect-per-view despite lower reach than P2 identity content.
- **Variable:** pillar. **Control/variants:** all six, as posted in month 1.
- **Primary metric:** connects per 1k views by pillar (utm_content → campaign cohort). **Guardrails:** follower growth (identity pillars build the channel even when they don't convert directly).
- **Minimum evidence:** full month-1 posting cycle (30 videos).
- **Decision rule:** month-2 mix = 50% best pillar / 25% second / 25% scouts. Never zero out P2/P4 entirely (they feed the funnel's top).
- **Next action:** calendar Day 29 scoring session writes the verdict here.

### E6 · What reduces Plaid hesitation?
- **Hypothesis:** seeing read-only trust content before the ask lifts `plaid_link_started`→`succeeded`.
- **Variable:** trust exposure. **Control:** current flow. **Variant:** V24-style explainer surfaced at the connect card (copy/link), and/or connect-card copy "Connect to get your three moves" vs "unlock your real score" (positioning test #4).
- **Primary metric:** started→succeeded rate; secondary: card-view→started. **Guardrails:** overall funnel time (don't add a step that costs more than it saves).
- **Tracking:** `plaid_link_started/succeeded/exited` (new), `connect_card_*` (existing). **Minimum evidence:** ≥40 link-starts per arm.
- **Decision rule:** >20% relative lift → make the trust beat permanent in-product (product change, so it goes through normal dev, not a marketing hotfix).

### E7 · First-session CTA → first completed move
- **Hypothesis:** post-reveal emphasis on "your first move is waiting" beats score-centric copy for reaching first `move_acted` in session 1.
- **Variable:** post-onboarding emphasis. **Control:** current gaps→home flow. **Variant:** copy variant of the reveal CTA.
- **Primary metric:** signup→first `move_acted` same-day. **Guardrails:** onboarding completion rate.
- **Minimum evidence:** ≥50 signups per arm — likely month 2+; until then, observe the baseline only.
- **Decision rule:** directional winner ships; log before/after cohort curves (no concurrent A/B infra exists — sequential cohorts, stated honestly).

### E8 · Who reaches Premium value?
- **Hypothesis:** users who send ≥3 Concierge messages in week 1 are the Premium-qualified population.
- **Variable:** none (observational cohort study). **Primary metric:** `concierge_message_sent` depth vs `upgrade_viewed`/`purchase_completed` correlation.
- **Minimum evidence:** 30 days of `concierge_message_sent` data.
- **Decision rule:** if the correlation holds, month-2 lifecycle work targets Concierge depth (e.g., day-3 email already does this) rather than paywall exposure.

### E9 · Does the Daily Open create return behavior?
- **Hypothesis:** first `vault_closed` is the activation event — closers' D7 ≥ 2× non-closers.
- **Variable:** none (cohort comparison, calendar Day 24). **Primary metric:** D7 by closed-vs-not cohort. **Guardrails:** survivorship honesty — closers self-select; treat as necessary-not-sufficient evidence.
- **Decision rule:** if the gap is large, "get every user to one close" becomes the single activation goal in product and lifecycle; if small, the loop needs product work before more acquisition spend.

### E10 · Do users say "it tells me what to do next"? (language playback)
- **Hypothesis:** retained users describe VAULT in action-gap language unprompted.
- **Variable:** none — interview protocol (calendar Days 18/26): "How would you describe VAULT to a friend?" logged verbatim.
- **Primary metric:** ≥50% of retained interviewees use tells-me/what-to-do phrasing. **Guardrails:** interviewer never seeds the phrase.
- **Decision rule:** if the phrasing doesn't come back, the position isn't landing in-product — fix the product narrative surfaces before spending on the message externally. This is the cheapest strategic test in the file; do not skip it.
