# VAULT — App Preview Video Scripts (2026-07-19)

Constraints: App Store previews must be captured from the app itself (screen recordings), 15–30s, autoplay **muted** — the video must work with no sound. Portrait, 1320×2868 export for 6.9". All numbers on screen come from the demo account on Plaid Sandbox; on-screen captions carry the claims weight, VO is optional enrichment.

## 15-second cut (primary)

| t | Shot (screen recording) | On-screen copy (large, silent-first) | VO (optional) |
|---|---|---|---|
| 0.0–2.5 | Slow scroll through a generic-looking transactions list (VAULT's own transaction view), slightly desaturated | "Every finance app shows you your money." | "Every finance app shows you your money." |
| 2.5–4.5 | Hard cut: Daily Open opens — gold seam, velocity delta appears | "VAULT tells you what to do with it." | "VAULT tells you what to do next." |
| 4.5–8.5 | Move card front and center (idle-cash detector); thumb taps the action button; card completes with the XP tick | "Specific moves. Your real accounts." + small "Illustrative" caption | "Specific moves, drawn from your real accounts." |
| 8.5–11.5 | Second move completes → third → **Vault Closed** celebration + streak counter | "A finance app with a finish line." | "Close your vault. Keep the streak." |
| 11.5–15 | Score arc ticks up; cut to end card: VAULT wordmark on night/gold | "Your money has a next move." + App Store badge | "VAULT. Your money has a next move." |

## 30-second cut

Extends the 15s cut; same first 8.5 seconds, then:

| t | Shot | On-screen copy | VO |
|---|---|---|---|
| 8.5–12 | Subscription-creep move card; thumb reviews it | "It finds what you'd miss." + "Illustrative" | "Subscription creep. Idle cash. The utilization quietly hurting your score." |
| 12–17 | Concierge: typed question "What should I tackle first?" — grounded streamed answer | "Ask anything. It answers with *your* numbers." | "Ask the Concierge anything — it answers from your accounts, not the internet." |
| 17–21 | Vault Closed celebration + streak | "Three moves. Vault closed. Done by 8 a.m." | "Three moves a day. A real finish line." |
| 21–25 | Score arc climbs; tier badge | "Momentum you can measure." | "A 0–1000 score built on how you handle money — not just how much you have." |
| 25–30 | Plaid consent screen glimpse → Settings read-only row → end card | "Read-only. Look, never touch." → "Your money has a next move." + badge | "Read-only by design. VAULT — your money has a next move." |

## Production directions

- **Recordings required:** transactions view scroll · Daily Open entry · 3 move completions (idle cash, subscription, utilization) · Vault Closed celebration · Concierge streamed answer · score arc animation · Plaid consent + Settings rows. Capture everything in one demo-account session at 60fps via QuickTime/ReplayKit; no simulator chrome.
- **Motion:** cuts on action (tap → cut), never crossfade; one gentle speed-ramp into Vault Closed. No zooms into UI that Apple could read as misrepresenting scale.
- **Type:** same system as screenshots (Cormorant display / Inter support), captions on at all times — the muted autoplay IS the ad.
- **Audio:** minimal warm keys + a single soft "click" on each move completion and a low, satisfying thunk on Vault Closed; no VO requirement — mix VO at −6dB under captions if used. No music with lyrics.
- **Final CTA:** end card only — wordmark, headline, badge. No URLs (Apple strips them), no price, no ratings claims.
- **Compliance check before export:** no adviser framing, no freshness overclaims (data is a refreshed snapshot), no outcome promises, no price, "Illustrative" caption on any frame with dollar figures.
