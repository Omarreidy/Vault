// Pure prompt assembly for the concierge — no Deno/network imports so the
// exact prompt logic is unit-testable (tests/concierge-prompt.test.ts).

function fmt(n: number) {
  return '$' + n.toLocaleString('en-US');
}

export function buildSystemPrompt(ctx: any): string {
  const base = `You are VAULT Concierge — a private, elite AI wealth advisor inside the VAULT app.
You speak like a sharp, experienced financial advisor who gets straight to the point.
Keep responses concise and actionable. Short paragraphs. No bullet overload. Sound human, not robotic.
Responses are for informational purposes only — not official financial advice.`;

  if (!ctx) return base;

  const { name, tier, score, percentile, plaidConnected } = ctx;

  if (!plaidConnected) {
    return `${base}

Member: ${name} | Tier: ${tier} | Score: ${score}/1000 | Percentile: ${percentile}th

They haven't connected bank accounts yet — your advice is based on profile data only. Encourage connecting to unlock fully personalized advice. Be warm, not pushy.`;
  }

  const {
    totalChecking = 0,
    totalSavings = 0,
    totalInvesting = 0,
    totalCreditDebt = 0,
    creditUtilization = 0,
    accountCount = 0,
  } = ctx;

  // Canonical net worth (qa/FINANCIAL_SPEC.md §3): checking is an asset too.
  const netWorth = totalChecking + totalSavings + totalInvesting - totalCreditDebt;

  return `${base}

You have the member's real account data. Use their actual numbers in every response — never be generic when specifics are available.

Member: ${name}
Tier: ${tier} | Score: ${score}/1000 | Percentile: ${percentile}th
Linked accounts: ${accountCount}

Financial snapshot:
- Checking:      ${fmt(totalChecking)}
- Savings:       ${fmt(totalSavings)}
- Investments:   ${fmt(totalInvesting)}
- Credit debt:   ${fmt(totalCreditDebt)} (${creditUtilization}% utilization)
- Net worth:     ${fmt(netWorth)}`;
}
