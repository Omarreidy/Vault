# VAULT Launch-Marketing System (2026-07-19)

Built on the locked positioning: **“VAULT is the finance app that tells you your next money move.”**
Binding authorities: [`../MARKETING_SOURCE_OF_TRUTH.md`](../MARKETING_SOURCE_OF_TRUTH.md) and [`../POSITIONING.md`](../POSITIONING.md) — this folder implements them and never overrides them.

| File | Contents |
|---|---|
| `01_JOURNEY_AUDIT.md` | Stage-by-stage acquisition audit: promises, objections, trust gains/losses, blockers vs improvements |
| `06_CONTENT_PILLARS.md` | Six faceless content pillars (viewer, tension, format, claims boundaries, metrics) |
| `07_LAUNCH_VIDEOS.md` | 30 finished short-form scripts (hooks, VO, shots, captions, hypotheses) + strongest five |
| `08_LAUNCH_CALENDAR_30_DAYS.md` | Day-by-day operating plan with effort, cost, dependencies, stop/continue/scale rules |
| `09_LAUNCH_COPY.md` | 28 ready-to-use assets: hero, emails, posts, creator outreach, objection responses |
| `10_ANALYTICS_EVENTS.md` | Event dictionary (app + website) and the 8 funnel definitions |
| `11_EXPERIMENTS.md` | 10 prioritized experiments with decision rules (directional vs reliable evidence) |
| `12_CLAIMS_CHECKLIST.md` | The 12-point compliance pass every asset must survive |
| `13_LAUNCH_CHECKLIST.md` | Manual/external actions in dependency order (Imran) |

App Store creative lives with the store metadata: [`../../../store/app-store-listing.md`](../../../store/app-store-listing.md) (full metadata package), [`../../../store/screenshot-plan.md`](../../../store/screenshot-plan.md), [`../../../store/app-preview-video.md`](../../../store/app-preview-video.md).

Code shipped with this system: website copy/metadata on-position + first-party `website_events` tracking (`website/src/lib/track.ts`), app funnel events (`src/services/analytics.ts` + 7 instrumented surfaces), migration `supabase/migrations/20260719000000_launch_analytics.sql`, and two in-app claims fixes (ScoreScreen "Live score", paywall "Advice" → "Guidance").
