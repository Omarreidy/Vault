export const PRIVACY_POLICY = `# VAULT Privacy Policy

**Effective Date:** June 8, 2026
**Last Updated:** June 8, 2026

## 1. Introduction

VAULT ("we," "our," or "us") operates the VAULT mobile application (the "App"). This Privacy Policy explains how we collect, use, disclose, and protect your information when you use our App.

## 2. Information We Collect

### 2.1 Information You Provide
- **Account information:** Email address, name, and password when you create an account.
- **Financial account connections:** When you connect bank accounts via Plaid, we receive read-only access to your transaction history, account balances, and account metadata. We never receive or store your banking credentials.

### 2.2 Information Collected Automatically
- **Usage data:** Features you interact with, screens you visit, time spent in the app.
- **Device information:** Device type, operating system version, unique device identifiers.
- **Crash reports:** Error logs to improve app stability.

### 2.3 Financial Data (via Plaid)
We use Plaid Technologies, Inc. to connect to your financial institutions. Plaid's data access is read-only. We use this data solely to:
- Calculate your Wealth Velocity Score
- Generate your personalized Wealth Feed
- Power AI Concierge responses

We do not sell your financial data to third parties. Ever.

## 3. How We Use Your Information

- Provide and improve the App's core features
- Calculate and update your Wealth Velocity Score
- Generate personalized financial insights and recommendations
- Operate the AI Concierge feature
- Send you relevant notifications (with your permission)
- Comply with legal obligations

## 4. Data Sharing

We do not sell your personal information. We share data only with:
- **Plaid:** To facilitate bank account connections (read-only)
- **Supabase:** Secure cloud database hosting for your account data
- **Anthropic:** AI processing for Concierge responses (no personal financial details are retained by Anthropic beyond the API call)
- **Service providers:** Analytics and crash reporting, bound by confidentiality agreements
- **Law enforcement:** Only when required by valid legal process

## 5. Data Security

We implement bank-grade security measures including:
- AES-256 encryption for data at rest
- TLS 1.3 for data in transit
- Read-only financial data access via Plaid
- No storage of banking credentials

## 6. Data Retention

We retain your data for as long as your account is active. You may request deletion of your account and associated data at any time by contacting support@getvault.app.

## 7. Your Rights

Depending on your location, you may have the right to:
- Access the personal data we hold about you
- Correct inaccurate data
- Delete your data ("right to be forgotten")
- Export your data in a portable format
- Opt out of certain data processing

To exercise these rights, contact: privacy@getvault.app

## 8. Children's Privacy

VAULT is not directed to children under 13. We do not knowingly collect information from children under 13. If you believe we have inadvertently collected such information, contact us immediately.

## 9. Changes to This Policy

We will notify you of material changes to this Privacy Policy via in-app notification or email at least 30 days before the changes take effect.

## 10. Contact Us

**VAULT**
Email: privacy@getvault.app
Support: support@getvault.app`;

export const TERMS_OF_SERVICE = `# VAULT Terms of Service

**Effective Date:** June 8, 2026

## 1. Acceptance of Terms

By downloading, installing, or using the VAULT app, you agree to these Terms of Service. If you do not agree, do not use the App.

## 2. Description of Service

VAULT is a personal finance platform that connects to your financial accounts (via Plaid), calculates a Wealth Velocity Score, and delivers personalized financial insights through an AI-powered feed and concierge.

## 3. Eligibility

You must be at least 18 years old and a legal resident of the United States to use VAULT. By using the App, you represent that you meet these requirements.

## 4. Account Registration

You are responsible for maintaining the confidentiality of your account credentials. You are responsible for all activity that occurs under your account.

## 5. Financial Data and Plaid

VAULT uses Plaid to connect to your financial institutions. By connecting accounts, you authorize VAULT and Plaid to access your financial data on a read-only basis. VAULT does not store your banking credentials.

**VAULT IS NOT A BANK.** We do not hold, transfer, or custody funds. We provide informational and educational financial insights only.

## 6. Not Financial Advice

The information provided by VAULT, including AI Concierge responses, Wealth Feed cards, and Wealth Velocity Score, is for **informational and educational purposes only** and does not constitute financial, investment, tax, or legal advice. Always consult a qualified financial professional before making financial decisions.

## 7. Subscription and Payments

- VAULT offers a free tier and a premium subscription at $12.99/month (or current pricing as displayed in the App).
- Subscriptions are billed through the App Store (iOS) or Google Play (Android).
- You may cancel at any time. No refunds are provided for partial billing periods.

## 8. Prohibited Conduct

You agree not to:
- Use the App for any illegal purpose
- Attempt to reverse engineer or extract the App's source code
- Share your account with others
- Use automated tools to access the App
- Attempt to circumvent security measures

## 9. Termination

We reserve the right to suspend or terminate your account at any time for violation of these Terms or for any other reason at our sole discretion.

## 10. Disclaimer of Warranties

THE APP IS PROVIDED "AS IS" WITHOUT WARRANTY OF ANY KIND. WE DO NOT GUARANTEE THE ACCURACY OF FINANCIAL DATA OR AI-GENERATED INSIGHTS.

## 11. Limitation of Liability

TO THE MAXIMUM EXTENT PERMITTED BY LAW, VAULT SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES ARISING FROM YOUR USE OF THE APP.

## 12. Governing Law

These Terms are governed by the laws of the State of Delaware, without regard to conflict of law principles.

## 13. Contact

For questions about these Terms: legal@getvault.app`;

// ─── Legal document versions ──────────────────────────────────────────────────
// Bump a version whenever its document materially changes; every user is then
// re-gated through the acknowledgement screen on next launch.
export const LEGAL_VERSIONS = {
  terms: '2026-06-08',
  privacy: '2026-06-08',
  disclosures: '1.0',
} as const;

// ⚠️ All language below should be reviewed and finalized by qualified legal
// counsel before release.
export const IMPORTANT_DISCLOSURES = `# Important Disclosures

**Version 1.0 — Effective July 17, 2026**

Please read carefully. These disclosures explain what VAULT is — and what it is not.

## Educational Purpose Only

Everything inside VAULT — including the Wealth Feed, Wealth Velocity Score, scanner verdicts, company research, budgets, projections, and AI Concierge responses — is educational and informational content. Nothing in VAULT constitutes financial, investment, legal, accounting, or tax advice, and nothing is a fiduciary recommendation.

## AI-Generated Content

VAULT uses artificial intelligence. AI can be wrong: it may produce inaccurate, incomplete, or outdated information, and it can present incorrect information confidently. Verify important information independently before acting on it. AI in VAULT is built to sharpen your thinking — never to replace professional financial guidance.

## Investment Research

Company research, stock data, market information, and AI-generated summaries are provided for education only. Nothing in VAULT is ever a recommendation to buy, sell, or hold any security, or to pursue any investment strategy. Investing involves risk, including the possible loss of principal.

## Scanner & Verdicts

The financial scanner classifies items and estimates costs and long-term impact. These are automated educational estimates and opinions generated by the app. They are not appraisals and are not guaranteed to be accurate.

## Estimates, Not Promises

Budgets, projections, cash-flow forecasts, financial-health scores, and wealth estimates are estimates only. Actual results will differ.

## VAULT Is Not a Bank

VAULT is not a bank, credit union, broker-dealer, investment adviser, or registered financial planner. VAULT never holds, moves, or custodies your money.

## No Guarantees

VAULT does not guarantee financial success, investment returns, savings, wealth growth, credit improvement, or any financial outcome.

## Your Data

Linked account data, merchant information, and market data come from third parties and may occasionally be delayed, incomplete, or inaccurate.

## Your Responsibility

You remain fully responsible for your investments, purchases, budgets, taxes, and every financial decision you make. When the stakes are high, consult a qualified professional.`;

// The affirmative acknowledgements — each requires its own deliberate tap.
// Versioned alongside IMPORTANT_DISCLOSURES: change these → bump disclosures version.
export const ACKNOWLEDGEMENTS = [
  {
    id: 'educational',
    text: 'I understand VAULT provides educational information only — not financial, investment, or tax advice.',
  },
  {
    id: 'ai-accuracy',
    text: 'I understand AI-generated content can be inaccurate, and I should verify important information myself.',
  },
  {
    id: 'responsibility',
    text: 'I understand I remain fully responsible for my own financial decisions.',
  },
] as const;
