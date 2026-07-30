# App Store Connect metadata — VAULT

Source of truth for the App Store listing. Paste from here into App Store
Connect; edit here first so the two never diverge.

This file lives under `store/`, which `tests/claims.test.ts` scans — so the
listing is now held to the same claims policy as the app itself. That gap is
how the previous listing ended up carrying an unsupported freshness claim and
adviser framing while the app's own copy had already been cleaned of both.

Character limits: promotional text 170, description 4000, keywords 100.

---

## Promotional Text

```
See where you actually stand — then make one move that improves it. VAULT turns your connected accounts into a plan you can act on today.
```

## Description

```
VAULT turns your connected accounts into a clear picture of where you stand — and one specific move to improve it.

Most money apps hand you charts and leave you to interpret them. VAULT tells you what to do next.

HOW IT WORKS
Connect your accounts securely through Plaid. VAULT reads your balances, spending, and net worth, then builds your Vault Score — a single number for your financial health, refreshed as your accounts update.

WHAT YOU GET
• Vault Score — one number for where you stand, built from how you save, spend, invest, and handle debt
• Next Move — a specific, doable action for your situation, not generic tips
• Wealth Recap — net worth, cash, investments, and debt in a single view
• AI Concierge — ask questions about your money in plain language, get a straight answer
• Trajectory — see where your current habits lead over time
• Company Research — understand a business before you put money into it
• Streaks — build the habit that makes the rest of it compound

WHY SMALL MOVES WIN
A fee you cancel, a rate you negotiate, a contribution you automate. Individually small, together decisive. VAULT surfaces the ones that matter for your accounts and tracks whether you followed through.

YOUR DATA
Bank connections run through Plaid, the same infrastructure used by many major finance apps. Connections are read-only: VAULT never sees your banking password and can never move your money.

VAULT PREMIUM
VAULT Premium is an auto-renewing monthly subscription that unlocks full access. The price is shown in the app before you purchase. Payment is charged to your Apple Account at confirmation. The subscription renews automatically unless you cancel at least 24 hours before the end of the current period, and you can manage or cancel it anytime in your iPhone Settings.

VAULT provides educational information to help you understand your own finances. It is not a financial adviser, does not provide investment advice, and does not recommend specific securities.

Terms of Use: https://getsvault.com/terms
Privacy Policy: https://getsvault.com/privacy
```

## Keywords

```
net worth,money,budget,savings,investing,debt,finance tracker,plaid,financial health,score
```

## Copyright

```
2026 Vault Wealth LLC
```

## Support / Marketing URLs

- Support URL: `https://getsvault.com/support`
- Marketing URL: `https://getsvault.com`

---

## Why specific things are worded the way they are

**"refreshed as your accounts update"** — not a freshness superlative. Plaid
data arrives in snapshots, so any claim of instantaneous data is inaccurate as
well as against policy.

**"AI Concierge"** rather than adviser language — VAULT is educational and holds
no advisory registration. Guideline 3.2.1(viii) puts financial-services apps
under extra scrutiny, and describing the product as something it is not
registered to be is the kind of claim that draws it.

**No price anywhere** — RevenueCat and App Store Connect are the only sources.
A price written into copy goes stale the moment pricing changes.

**Subscription paragraph** — guideline 3.1.2(c) requires title, length, price
location, renewal terms, and functional Terms of Use and Privacy Policy links.
The app satisfies this in `src/screens/UpgradeScreen.tsx`; this paragraph plus
the two links satisfy the metadata half, which is what build 20 was rejected for.
