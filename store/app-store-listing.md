# VAULT — App Store Listing

> Claims policy: every line here must comply with `docs/marketing/MARKETING_SOURCE_OF_TRUTH.md`.
> Price is configured in App Store Connect / RevenueCat — never hardcode a price in this copy.

## Name (30 chars max)
VAULT: Daily Money Moves

*(previous: "VAULT: Wealth Score & AI Money" — retired; "AI Money" was vague and score-led)*

## Subtitle (30 chars max)
Your next money move, daily

## Category
Primary: Finance
Secondary: Lifestyle

## Description (4000 chars max)

Every finance app shows you your money. VAULT tells you what to do with it.

Connect your accounts (read-only, via Plaid) and VAULT turns your real financial data into specific money moves — cards that show you what to do next and why it's worth doing. Not generic tips. Moves drawn from your actual accounts: idle cash that could be earning more, credit utilization quietly hurting your score, a savings or retirement account you're missing, subscription creep worth reviewing.

**THE DAILY OPEN**
Open the vault each morning: see how your score moved since yesterday, make three moves, close the vault. A finance app with a finish line — most days it takes minutes.

**YOUR WEALTH VELOCITY**
A 0–1000 score built from how you save, spend, invest, and handle debt — not just how much you have. It's computed on our servers from your real data and updates as your accounts refresh. It is not a credit score and never affects one.

**TIERS THAT MARK PROGRESS**
Bronze → Silver → Gold → Platinum → Black. Tiers mark milestones in your momentum as you climb.

**AI CONCIERGE**
Ask anything about your money. The Concierge answers with your actual balances — educational guidance, straight answers, and when it doesn't have the data, it says so. Five free messages a day; unlimited with Premium.

**WEALTH WINS**
Milestones become shareable cards — your first $10K saved, a score threshold crossed, a tier unlocked.

**PRIVATE BY DESIGN**
Read-only access via Plaid: VAULT can see balances and transactions, never move money. We never see or store your bank credentials. Your data is encrypted in transit and at rest, and it is never sold.

VAULT is educational — it is not a bank or a financial adviser, and it never guarantees financial outcomes.

Your money has a next move. Find it.

## Promotional text (170 chars max, optional)
Connect your accounts and VAULT hands you specific money moves from your real data. Open the vault. Close it in minutes.

## Keywords (100 chars, comma-separated)
money moves,next move,money,finance,savings,net worth,score,AI,plaid,cash flow,habit,wealth

## Support URL
https://getsvault.com/support

## Marketing URL
https://getsvault.com

## Privacy Policy URL
https://getsvault.com/privacy

## Age Rating
4+ (no objectionable content)

## Price
Free download with an auto-renewing monthly Premium subscription.
⚠️ The price shown to users comes from App Store Connect / RevenueCat — verify the configured price there before submission and never state a number in metadata that hasn't been verified against that configuration.

---

# Extended package (added 2026-07-19 launch pass)

## Name presentation

Display name on device: **VAULT** (from `app.json`). Store name: **VAULT: Daily Money Moves** — the suffix is the category claim and the search phrase in one. Do not add adjectives ("smart," "AI") to the name; the subtitle carries the promise.

## Promotional text — rotation set (each ≤170 chars)

Promotional text updates without review, so rotate it as a message test:

1. (default, live above) "Connect your accounts and VAULT hands you specific money moves from your real data. Open the vault. Close it in minutes."
2. "Your first score takes 60 seconds — three questions, no bank login. Connect when you're ready and your moves come from your real accounts."
3. "Stop staring at charts. VAULT finds the idle cash, the creeping fees, the missing accounts — and shows you exactly what to do about them."

## Keyword strategy (100-char field)

Current field: `money moves,next move,money,finance,savings,net worth,score,AI,plaid,cash flow,habit,wealth`

- **Own first:** "money moves," "next move" — low competition, exact-match to the promise and the category we're creating.
- **Volume terms we can rank for over time:** savings, net worth, cash flow, money habit.
- **Deliberately absent:** "budget/budgeting" (attracts users we tell to leave), "invest/trading" (wrong intent + compliance adjacency), competitor names (guideline risk), "status/rank" (retired position).
- Words already in the app name/subtitle (vault, daily, move) don't need repeating — Apple indexes name and subtitle.

## What's New template (per release)

> VAULT [X.Y] — [one-line theme]
>
> • [User-visible improvement, action-first phrasing: "The Daily Open now …"]
> • [Fix in plain words: "Fixed a case where …"]
>
> Open your vault — today's moves are waiting.

Rules: no feature promises that haven't shipped, no "coming soon," never mention prices. Keep the closing line constant — it's the brand's signature.

## Privacy summary (App Store privacy label talking points)

- **Data linked to you:** contact info (email), financial info (account balances and transactions via Plaid, read-only), identifiers (user ID), usage data (product analytics events — feature usage only, never balances or transaction contents).
- **Data not collected:** location, contacts, photos, browsing history, advertising identifiers.
- **No data sold. No third-party advertising.** Analytics are first-party (our own database).
- Bank credentials are entered with Plaid, never seen or stored by VAULT.
- Account and data deletion available in-app (Settings → Delete account).

## Subscription explanation (App Store review notes + in-listing clarity)

VAULT Premium is a monthly auto-renewing subscription purchased through Apple. Free accounts keep the daily moves, score, goals, streaks, and 5 Concierge messages a day. Premium removes the Concierge daily limit, adds deep-dive sessions, and includes future Premium features as they ship. Price is shown in the app from App Store Connect. Payment is charged to the Apple ID; subscriptions renew unless cancelled at least 24 hours before the period ends; manage or cancel in Settings → Apple ID → Subscriptions. Terms: https://getsvault.com/terms · Privacy: https://getsvault.com/privacy

## Support copy (getsvault.com/support + ASC support URL)

> **Need a hand?** Email support@getvault.app and a human reads it — usually the founder.
> Before you write: VAULT is read-only (it can never move your money), your bank login goes to Plaid (we never see it), and you can disconnect accounts or delete everything in Settings at any time.
> Include your account email and what you expected to happen — screenshots help.

## Review-request language (in-app prompt context)

Ask via the native `SKStoreReviewController` prompt only — after a *positive* moment, never after an error. Trigger: the user's third Vault Closed (they've completed the loop three times; the habit is forming). Optional pre-prompt card copy:

> "Three vaults closed. If VAULT is earning its place in your morning, a rating helps other people find their next move."

Never gate features on a review, never re-ask within the same version, never ask during onboarding or after a failed Plaid link.

## Review-response templates (App Store Connect)

**5★ with feature request:**
> Thank you — glad the daily moves are landing. [Feature] is a fair ask; it's on our list and your note just moved it up. — VAULT

**Critical: "moves got repetitive":**
> Fair criticism. Move variety is where we're investing most right now — new detectors ship regularly, and your feedback tells us which gaps matter. If you reconnect in a few weeks, I'd genuinely like to know if it feels different: support@getvault.app. — VAULT

**Critical: privacy/bank-connection concern:**
> Completely reasonable concern. VAULT's access is read-only through Plaid — we can see balances and transactions to find your moves, and we cannot move money, ever. Your bank login goes to Plaid, not us, and you can disconnect or delete everything in Settings. Details: getsvault.com/privacy. — VAULT

**Critical: "wanted it to cancel subscriptions / do it for me":**
> That's on us for not being clearer: VAULT surfaces what deserves action — like subscription creep — and gives you exact steps, but it never acts on your accounts. Read-only is a deliberate safety choice. If you want a done-for-you service, VAULT may not be the fit; if you want to stay in control, we've got you. — VAULT

**Critical: bug report:**
> Thank you for the specifics — this is fixed in [version] / being fixed now. If it's still misbehaving after updating, email support@getvault.app and I'll dig in personally. — VAULT

Rules for all responses: never argue, never promise dates, never mention prices, never claim capabilities from the prohibited list, sign as VAULT.
