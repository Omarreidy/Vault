# Screenshots Needed

## App Store (iOS) — Required sizes
- 6.9" iPhone 16 Pro Max: 1320 × 2868 px (minimum 3 required, up to 10)
- 6.5" iPhone 14 Plus: 1242 × 2688 px (if targeting older devices)
- 12.9" iPad Pro: 2048 × 2732 px (if supporting iPad — currently disabled)

## Google Play — Required sizes
- Phone: 1080 × 1920 px minimum (up to 8 screenshots)
- 7" tablet (optional but recommended)
- 10" tablet (optional)

## Screens to capture (priority order)
> ⚠️ Superseded 2026-07-19: the full creative system (order, copy, framing,
> alternates) now lives in `store/screenshot-plan.md`. Capture list, in the
> narrative's order:
1. **Home / Wealth Feed** — one personalized move card front and center
2. **Daily Open brief** — velocity delta + today's hand
3. **Move card detail** — utilization detector with impact + effort
4. **Vault Closed** — celebration + streak
5. **AI Concierge** — grounded answer to "What should I tackle first?"
6. **Score Screen** — score arc + tier badge (post-connect)
7. **Settings / Plaid consent** — read-only + delete-account visible
8. **Upgrade screen** — perks list, cropped above the price line

## How to take them
### Option A — Netlify web version (fastest)
Visit https://vaultreidy.netlify.app in Chrome DevTools with device emulation:
- Set to iPhone 14 Pro Max (430 × 932) → screenshot → scale up
- Use browser's "Capture full size screenshot" in DevTools

### Option B — Expo Go on real device
- Run `npx expo start`
- Open in Expo Go
- Take screenshots on device

### Option C — EAS build (best quality, after Android build is done)
- Install the .apk from the EAS build on an Android device/emulator
- Take native screenshots
