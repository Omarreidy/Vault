# V24 · Read-Only, or: Why VAULT Can't Hurt You — Production Package

**Role in launch:** the objection-killer. Pin second; link in the comments of every move video. BOFU. **No face required** — screen recording + text.
**Recommended duration:** 30–33s.

## Final script / voiceover text (~30s, plain and unhurried)

> How VAULT's bank connection works, plainly. You connect through Plaid — the connection layer your other finance apps already use. Your login goes to Plaid, not to VAULT; VAULT never sees or stores your credentials. Access is read-only: it can see balances and transactions to find your moves — it cannot move money, pay anyone, or change anything. Ever. And in Settings: disconnect any account, or delete everything — one tap, gone from our servers. Now you know exactly what you'd be agreeing to.

## Shot list

| # | Shot | Source | Duration |
|---|---|---|---|
| 1 | Black frame, white text: "Before you connect a bank to any app…" | template | 0–3s |
| 2 | Plaid consent screen, slow pan | screen rec A | 3–11s |
| 3 | "login goes to Plaid, not VAULT" text over consent screen | overlay | 8–11s |
| 4 | Settings → Connected accounts row | screen rec B | 11–19s |
| 5 | Delete-account row, tap → confirmation sheet appears (then CANCEL) | screen rec B | 19–27s |
| 6 | End card: "read-only: look, never touch" + getsvault.com/privacy | template | 27–33s |

## Required screen recordings

- **Rec A:** demo account → start Plaid connect flow → hold on the Plaid consent screen 8s (do not proceed past consent). Plaid Sandbox.
- **Rec B:** Profile → Settings → connected accounts list → scroll to delete-account row → tap → confirmation visible → **cancel** (never execute the delete on the demo account).

## On-screen captions

"login goes to Plaid, not VAULT" → "read-only: look, never touch" → "delete everything, one tap."

## Editing timeline

0:00 text hook 3s → consent screen with VO ~8s → settings walk ~8s → delete confirmation beat ~8s (this is the trust peak — let it breathe) → end card 5s. No music or barely-there ambient; this video's tone is "terms explained by a person who isn't selling."

## Thumbnail / first frame

Black + white text: **"Before you connect a bank to any app, watch this 30 seconds."**

## Caption (post text)

> The unskippable video for the skeptics — which is the correct thing to be. Login goes to Plaid, never to VAULT. Read-only: it can look, never touch. Delete everything anytime. Full details: getsvault.com/privacy

## CTA

"Questions? Ask in comments — real answers." (Founder answers every comment for 48h.)

## Links (from `../../launch-links.csv`)

- TikTok: `https://getsvault.com/?utm_source=tiktok&utm_medium=organic&utm_campaign=launch&utm_content=v24&creator=founder&v=a`
- Instagram: `https://getsvault.com/?utm_source=instagram&utm_medium=organic&utm_campaign=launch&utm_content=v24&creator=founder&v=a`
- YouTube Shorts: `https://getsvault.com/?utm_source=youtube&utm_medium=organic&utm_campaign=launch&utm_content=v24&creator=founder&v=a`

## Export naming

`VAULT_v24_{platform}_{cut}_{yyyymmdd}.mp4` · master `VAULT_v24_master_{yyyymmdd}.mov`.

## Platform adaptations

- **TikTok:** unedited pace, native captions; pin comment: "Plaid is the same connection layer used by major finance apps — your credentials never reach us."
- **Instagram Reels:** identical cut; add cover text for grid.
- **YouTube Shorts:** spoken intro line: "What a finance app can and cannot do with read-only access." Title: same sentence (high search intent).

## Claims checklist

- [ ] Every capability statement is negative-space accurate: cannot move money / pay / change — these are true by architecture (read-only Plaid scopes)
- [ ] "Your other finance apps already use [Plaid]" stays generic — NO named competitors
- [ ] Delete claim shown with the real UI (and cancelled before executing)
- [ ] No dollar figures on screen (avoid feed shots in Rec B scroll)
- [ ] No "bank-level security" or unverifiable security claims; encryption wording only if it mirrors the privacy policy
- [ ] No price, no advisor framing, no "real-time"
- [ ] No face ✓
