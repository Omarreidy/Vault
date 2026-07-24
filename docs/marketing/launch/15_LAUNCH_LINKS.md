# VAULT — Launch-Link Registry & Attribution Convention

**Base URL:** `https://getsvault.com/` — all tracked links land on the website (first-party `website_events` capture the parameters; see `10_ANALYTICS_EVENTS.md`). The App Store URL is **pending** (org enrollment); when it exists, bio links still point at getsvault.com — attribution only works on our domain, and the site's CTA forwards to the store. Machine-readable copy: `launch-links.csv` (same directory).

## Parameter convention (fixed — do not improvise new values)

| Param | Meaning | Allowed values |
|---|---|---|
| `utm_source` | Platform the click came from | `tiktok` · `instagram` · `youtube` · `linkedin` · `x` · `reddit` · `email` |
| `utm_medium` | Relationship of the poster to us | `organic` (our accounts) · `creator` (paid/affiliate creator) · `email` (broadcasts) · `paid` (ads, later) |
| `utm_campaign` | Push/window | `launch` (30-day launch window) · later: experiment names from `11_EXPERIMENTS.md` |
| `utm_content` | Creative ID | `v{NN}` = video concept from `07_LAUNCH_VIDEOS.md`; hook-variant suffix letter when A/B-testing hooks (`v01a`, `v01b`) |
| `creator` | Creator/affiliate ID | `founder` (our own accounts) · `c_{handle}` from the creator sheet (`ops/creators.csv`) |
| `v` | Landing-page variant | `a` (current page; add `b`… only when a variant actually exists) |

**Creator rule:** every creator gets one immutable `creator_id` (`c_` + handle, lowercase) assigned in `ops/creators.csv` before their link is issued; the same ID goes into their tracking link and their payout records. **App Store campaign-variant rule:** links printed inside App Store campaign contexts (ASC promotional text tests, search-ads landing tests) use `utm_source` of the real traffic platform, `utm_campaign=launch`, and vary only `v=` — never invent a new source for them.

## Launch-ready links — first five videos (founder-posted organic, campaign `launch`)

### V21 · The 60-second score (pin #1)
- TikTok: `https://getsvault.com/?utm_source=tiktok&utm_medium=organic&utm_campaign=launch&utm_content=v21&creator=founder&v=a`
- Instagram: `https://getsvault.com/?utm_source=instagram&utm_medium=organic&utm_campaign=launch&utm_content=v21&creator=founder&v=a`
- YouTube Shorts: `https://getsvault.com/?utm_source=youtube&utm_medium=organic&utm_campaign=launch&utm_content=v21&creator=founder&v=a`

### V24 · Read-only trust (pin #2)
- TikTok: `https://getsvault.com/?utm_source=tiktok&utm_medium=organic&utm_campaign=launch&utm_content=v24&creator=founder&v=a`
- Instagram: `https://getsvault.com/?utm_source=instagram&utm_medium=organic&utm_campaign=launch&utm_content=v24&creator=founder&v=a`
- YouTube Shorts: `https://getsvault.com/?utm_source=youtube&utm_medium=organic&utm_campaign=launch&utm_content=v24&creator=founder&v=a`

### V01 · The idle-cash move
- TikTok: `https://getsvault.com/?utm_source=tiktok&utm_medium=organic&utm_campaign=launch&utm_content=v01&creator=founder&v=a`
- Instagram: `https://getsvault.com/?utm_source=instagram&utm_medium=organic&utm_campaign=launch&utm_content=v01&creator=founder&v=a`
- YouTube Shorts: `https://getsvault.com/?utm_source=youtube&utm_medium=organic&utm_campaign=launch&utm_content=v01&creator=founder&v=a`

### V22 · The Daily Open
- TikTok: `https://getsvault.com/?utm_source=tiktok&utm_medium=organic&utm_campaign=launch&utm_content=v22&creator=founder&v=a`
- Instagram: `https://getsvault.com/?utm_source=instagram&utm_medium=organic&utm_campaign=launch&utm_content=v22&creator=founder&v=a`
- YouTube Shorts: `https://getsvault.com/?utm_source=youtube&utm_medium=organic&utm_campaign=launch&utm_content=v22&creator=founder&v=a`

### V07 · The anthem
- TikTok: `https://getsvault.com/?utm_source=tiktok&utm_medium=organic&utm_campaign=launch&utm_content=v07&creator=founder&v=a`
- Instagram: `https://getsvault.com/?utm_source=instagram&utm_medium=organic&utm_campaign=launch&utm_content=v07&creator=founder&v=a`
- YouTube Shorts: `https://getsvault.com/?utm_source=youtube&utm_medium=organic&utm_campaign=launch&utm_content=v07&creator=founder&v=a`

## Channel links (non-video surfaces)

- LinkedIn launch post: `https://getsvault.com/?utm_source=linkedin&utm_medium=organic&utm_campaign=launch&utm_content=launch_post&creator=founder&v=a`
- X launch thread: `https://getsvault.com/?utm_source=x&utm_medium=organic&utm_campaign=launch&utm_content=launch_thread&creator=founder&v=a`
- Reddit (per-community posts; keep `utm_content=reddit_{sub}`): `https://getsvault.com/?utm_source=reddit&utm_medium=organic&utm_campaign=launch&utm_content=reddit_general&creator=founder&v=a`
- Email announcement: `https://getsvault.com/?utm_source=email&utm_medium=email&utm_campaign=launch&utm_content=announce_1&v=a`

## Creator-link template

`https://getsvault.com/?utm_source={platform}&utm_medium=creator&utm_campaign=launch&utm_content=v{NN}&creator=c_{handle}&v=a`
— issue from `ops/creators.csv` only, one link per creator per concept; the `creator` value is the payout key (see F8 in `10_ANALYTICS_EVENTS.md`: payouts on tracked link volume, never claimed installs).

**Verified:** parameter capture on this exact convention was live-tested against production `website_events` on 2026-07-19 (see `14_ANALYTICS_VALIDATION.md`). Note: the production site records events only after the Vercel env vars are set (Omar action #2 in `16_OMAR_MANUAL_ACTIONS.md`).
