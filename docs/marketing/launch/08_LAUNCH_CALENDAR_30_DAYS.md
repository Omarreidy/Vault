# VAULT — 30-Day Launch Operating Plan (Phase 5)

**Assumptions:** solo founder (Imran), ~2h/day weekdays + ~4h weekend days, faceless content, budget ≤ ~$500 for the month (0 required; optional items marked), iPhone app approved or in final review at Day 1. If approval slips, Days 8–14 shift right; Days 1–7 do not depend on approval.

**North-star metric (whole plan): activated users** = installed → signed up → connected an account → completed a Daily Open. Watch weekly: activation rate, D1/D7 return, connect rate. Downloads without connection are explicitly not success.

**Standing daily block (~25 min, every day, not repeated in the tables):** post the day's video (already produced) → reply to every comment/DM → check `analytics_events`/`website_events` funnel dashboard → check App Store reviews + support inbox, respond same-day using the templates in `09_LAUNCH_COPY.md` / `store/app-store-listing.md`.

**Stop/continue/scale legend:** rules trigger on 7-day windows, not single days — early numbers are directional, not statistical (traffic is too small for significance; see `11_EXPERIMENTS.md`).

---

## Week 0 — Pre-launch readiness (Days 1–7)

| Day | Primary objective | Exact actions | Deliverable | Channel | Effort | Cost | Depends on | Success metric | Rule |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Ship the measurement + legal foundation | Apply `20260719000000_launch_analytics.sql` **and** the pending legal-consent + notification migrations to prod (`supabase db push`); set Vercel env vars `NEXT_PUBLIC_SUPABASE_URL/ANON_KEY`; deploy website; verify `website_events` rows appear | Live tracked website on the new positioning | Vercel/Supabase | 1.5h | $0 | This repo's work, committed & pushed | `page_view` rows visible with UTM attribution | Blocker: nothing launches until events flow |
| 2 | Store package submitted-ready | Verify RevenueCat/ASC price (resolves $9.99-vs-$12.99); paste listing copy from `store/app-store-listing.md` into ASC; add ToS/Privacy URLs to ASC metadata (rejection fix); confirm org enrollment status | ASC metadata complete | App Store Connect | 2h | $0 (enrollment fees already in motion) | Apple org enrollment | Metadata passes ASC validation | Blocker |
| 3 | Screenshot + preview capture | Demo account + Plaid Sandbox on device; capture the 8 primary frames + all preview-video recordings per `store/screenshot-plan.md` / `app-preview-video.md` | Raw captures complete | device | 3h | $0 | Day 2 demo account working | All 8 frames + 7 recordings captured | Continue until complete |
| 4 | Produce launch-week content batch 1 | Assemble/frame screenshots; edit V21, V24, V01 (scripts in `07_LAUNCH_VIDEOS.md`); create TikTok/IG/Shorts accounts with bio from `MARKETING_SOURCE_OF_TRUTH` | 3 finished videos + framed screenshots + live social profiles | CapCut/Descript | 4h | $0–60 (editor app) | Day 3 captures | 3 videos exported | Continue |
| 5 | Device test + notification go-live | Full device pass: signup → onboarding → Plaid sandbox → Daily Open → move → Concierge → paywall → restore; deploy push functions; send test push | Signed-off test checklist (`13_LAUNCH_CHECKLIST.md`) | device | 2h | $0 | Day 1 migrations | Zero blocking bugs; push received on device | Blocker if red |
| 6 | TestFlight cohort + email capture | Invite 10–20 friendlies to TestFlight with a 3-line ask (copy in `09`); stand up waitlist capture (Vercel form or Tally) linked from site if store URL still pending | 10+ TestFlight installs; waitlist live | TestFlight/email | 2h | $0 | Build uploaded | ≥8 testers complete a Daily Open | If <5 respond, personally chase — do not skip |
| 7 | Content batch 2 + creator list | Edit V07, V22, V03; build creator sheet: 30 micro-creators (10–100k) in personal-finance/self-improvement who do faceless or duet-able formats; note rates/emails | 6 total videos ready; creator sheet of 30 | sheet | 4h | $0 | — | 30 qualified creators listed | Continue |

## Launch week (Days 8–14)

| Day | Primary objective | Exact actions | Deliverable | Channel | Effort | Cost | Depends on | Success metric | Rule |
|---|---|---|---|---|---|---|---|---|---|
| 8 | **Approval day → store live** | Set `APP_STORE_URL` in `website/src/lib/brand.ts`, redeploy; smoke-test store link + UTM chain end-to-end; soft-launch: post V21 (pinned), tell TestFlight cohort it's live with review ask | Live, tracked path website→store→app | all | 2h | $0 | Apple approval | First organic install recorded (`app_opened`) | Blocker |
| 9 | Public announcement | Founder launch post (X + LinkedIn from `09`); personal texts/DMs to 30 real contacts with the ask ("install + connect + honest review"); post V01 | Announcement live everywhere | X/LinkedIn/DM | 2h | $0 | Day 8 | 25 installs · 10 connects cumulative | Continue regardless — day-1 numbers mean nothing |
| 10 | Community seeding | Post Reddit intro (r/personalfinance-adjacent subs that allow it — read rules first; `09` has the copy) + 2 community posts (Indie Hackers, a fintech Slack/Discord); post V24 | 3 community threads | Reddit etc. | 2h | $0 | — | 1 thread with real discussion; support Qs answered <2h | If a thread turns hostile on privacy, answer with the trust copy — never defensive |
| 11 | Creator outreach wave 1 | Send 15 creator emails/DMs (templates in `09`): free year + flat micro-fee offer, `?creator=` links; post V22 | 15 outreaches logged | email/DM | 2h | $0 now | Day 7 sheet | ≥4 replies within 72h | If <2 replies by Day 14, rewrite the hook (lead with the demo video, not the app) |
| 12 | Review + support hardening | Personally ask every activated friendly for an App Store review (never incentivized); triage all bug reports; ship hotfix build if needed; post V07 | ≥8 honest reviews; bug list triaged | ASC/support | 2h | $0 | Day 9–11 users | Crash-free sessions >99%; all support <24h | Bugs beat marketing: a broken first session costs more than a missed post |
| 13 | First funnel read | Pull the 8 funnels (`10_ANALYTICS_EVENTS.md`): where is the biggest % drop — store page? signup? Plaid? first open? Write it down; choose ONE fix | 1-page funnel memo + chosen fix | analytics | 1.5h | $0 | Events flowing | Funnel memo exists with a named bottleneck | The memo's bottleneck owns next week's effort |
| 14 | Week-1 retro + batch 3 | Ship the chosen fix if small; edit V12, V27, V11; schedule week-2 posting; email waitlist/TestFlight non-converts ("what stopped you?" — 3 replies is gold) | Fix shipped or scheduled; 9 videos total ready | all | 4h | $0 | Day 13 | Retro written; next week scheduled | Scale what got comments; drop what got silence |

## Weeks 2–4 (Days 15–30) — iterate toward qualified acquisition

| Day | Primary objective | Exact actions | Channel | Effort | Cost | Success metric | Rule |
|---|---|---|---|---|---|---|---|
| 15 | Content iteration 1 | Compare the 9 posted videos on hold rate + link taps; double down on best pillar: produce 2 variants of the winner (alt hooks from `07`) | TikTok/IG/YT | 2h | $0 | A repeatable winner identified | Scale: winning format gets 2 slots/week |
| 16 | Creator wave 2 | Follow up wave 1 (template in `09`); 10 new outreaches incl. 3 UGC-style offers (they make it, you post it) | email/DM | 1.5h | $0–150/video UGC | 2 creators committed | Stop UGC spend if creator CPA > 3× organic after first 2 paid posts |
| 17 | Plaid-hesitation attack | Read `plaid_link_started` vs `succeeded/exited`; if exit rate >40%: move V24 link into onboarding-adjacent surfaces (post-score share sheet, bio, auto-reply), post trust-explainer variant | product/content | 2h | $0 | Connect rate trend up WoW | This is the highest-leverage number in the business — revisit weekly forever |
| 18 | User interviews round 1 | DM/email 5 activated users + 5 who installed but never connected; 15-min calls or 5-question async; log verbatims (listen for "tells me what to do next") | calls | 2.5h | $0–50 gift cards | 6 completed conversations | If ≥3 non-connectors cite the same fear, that's next week's content + onboarding copy |
| 19 | Referral activation | In-app nudge timing check (post-first-Vault-Closed is the moment); personally ask the 10 most-active users to share their code; post V28 | app/DM | 1.5h | $0 | First `referral_shared`→`referral_redeemed` chains | If share→redeem <10%, the share message is weak — rewrite `buildShareMessage` copy next sprint |
| 20 | Week-2 funnel read | Re-pull funnels; compare to Day-13 memo; write week-2 memo; choose next single fix | analytics | 1.5h | $0 | Bottleneck named; last week's fix measured | Kill fixes that didn't move their number in 7 days |
| 21 | Batch 4 production | Produce 3 videos: best pillar ×2 + 1 from an untested pillar (P4); refresh pinned video if V21 CTR decays | content | 4h | $0 | 12+ videos posted total | Continue |
| 22 | Store-page test prep | If ASC Product Page Optimization available: stage Alternative A screenshots (from `screenshot-plan.md`) as treatment; else A/B the *website* hero sub (`?v=` variant) | ASC/site | 2h | $0 | Test live and tracked | Directional call after ≥300 store impressions/arm — not before |
| 23 | Press/newsletter pitch | Send the pitch (`09`) to 8 personal-finance newsletters/podcasts that cover consumer fintech; personalize 2 lines each | email | 2h | $0 | 1 reply | Newsletters beat press for this audience; drop cold press after this pass |
| 24 | Retention read | Cohort D1/D7 from events: does Daily Open drive return (users with ≥1 `vault_closed` vs 0)? Write the one-pager | analytics | 1.5h | $0 | D7 of vault-closers vs non-closers known | If closers' D7 ≥ 2× non-closers, the loop works — push everything toward first close |
| 25 | Subscription read | Funnel: `upgrade_viewed`→`purchase_started`→`purchase_completed` + RevenueCat webhook truth; where do people bounce? | analytics | 1h | $0 | Paywall funnel documented | Don't touch pricing this month — evidence only |
| 26 | Interviews round 2 + testimonial harvest | 5 more conversations; ask permission to quote (real, attributed) — first real quotes go to `Founding` section + ASC review themes | calls | 2h | $0 | 2 permissioned quotes | Testimonials section stays empty until these exist — no exceptions |
| 27 | Batch 5 + Shorts SEO pass | 3 videos; retitle best performers on YT with search phrasing ("finance app no bank login", "app that tells you what to do with money") | content | 3.5h | $0 | Shorts search impressions up | Shorts is the compounding channel — never skip its titles |
| 28 | Paid test preparation (prep only) | Define a $200–300 TikTok Spark test on the best organic video for week 5+: audience, `utm_campaign`, success = cost per *connected* user, kill threshold | plan | 1.5h | $0 (spend later) | Written test plan with kill rule | Do not start paid before organic proves a connecting audience exists |
| 29 | Month funnel + experiment scoring | Full-funnel month report vs the 8 funnels; score the open experiments in `11_EXPERIMENTS.md` (directional verdicts); update creator sheet outcomes | analytics | 2.5h | $0 | Month report written | Every experiment gets: continue / kill / promote |
| 30 | Month-2 plan | From the report: pick the 3 things that produced activated users; drop the rest; write month-2 calendar skeleton; celebrate closing 30 vaults of your own | plan | 2h | $0 | Month-2 plan exists | Scale rule for month 2: one proven channel > three promising ones |

---

## Budget summary (worst case)
Editor app ~$60 · UGC tests ≤$300 · interview gift cards ≤$50 · paid social $0 this month (prep only) → **≤ ~$410.**

## What this plan refuses to do
- Buy installs before the funnel proves installs become connections.
- Chase press before product-channel fit.
- Post daily *forever* — Days 15+ deliberately trade volume for iteration on evidence.
- Treat any single day's metric as a verdict; all rules read 7-day windows.
