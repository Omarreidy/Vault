import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function clamp(val: number, min = 0, max = 100) {
  return Math.min(Math.max(Math.round(val), min), max);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const { user_id } = await req.json();
    if (!user_id) throw new Error('user_id required');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get Plaid data for this user
    const { data: plaidItems } = await supabase
      .from('plaid_items')
      .select('accounts, transactions')
      .eq('user_id', user_id);

    if (!plaidItems || plaidItems.length === 0) {
      return new Response(JSON.stringify({ error: 'no_plaid_data' }), {
        status: 404, headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    // Flatten all accounts and transactions across all linked items
    const allAccounts = plaidItems.flatMap((item: any) => item.accounts ?? []);
    const allTx       = plaidItems.flatMap((item: any) => item.transactions ?? []);

    // ── ACCOUNT CATEGORIZATION ────────────────────────────────────────────────
    const checking   = allAccounts.filter((a: any) => a.subtype === 'checking');
    const savings    = allAccounts.filter((a: any) => a.subtype === 'savings' || a.subtype === 'money market' || a.subtype === 'cd');
    const investment = allAccounts.filter((a: any) => ['brokerage','401k','ira','roth','403b','529'].includes(a.subtype));
    const credit     = allAccounts.filter((a: any) => a.type === 'credit');
    const loans      = allAccounts.filter((a: any) => a.type === 'loan');

    const totalChecking   = checking.reduce((s: number, a: any)   => s + (a.balances?.current ?? 0), 0);
    const totalSavings    = savings.reduce((s: number, a: any)    => s + (a.balances?.current ?? 0), 0);
    const totalInvesting  = investment.reduce((s: number, a: any) => s + (a.balances?.current ?? 0), 0);
    const totalCreditDebt = credit.reduce((s: number, a: any)     => s + (a.balances?.current ?? 0), 0);
    const totalCreditLimit = credit.reduce((s: number, a: any)    => s + (a.balances?.limit ?? 0), 0);
    const totalLoanDebt   = loans.reduce((s: number, a: any)      => s + (a.balances?.current ?? 0), 0);

    // ── INCOME ESTIMATION FROM TRANSACTIONS ───────────────────────────────────
    const incomeCategories = ['Payroll', 'Deposit', 'Income'];
    const incomeTx = allTx.filter((t: any) =>
      t.amount < 0 && // Plaid: negative = money coming in
      incomeCategories.some(c => (t.category ?? []).some((tc: string) => tc.includes(c)))
    );
    const monthlyIncome = incomeTx.length > 0
      ? Math.abs(incomeTx.reduce((s: number, t: any) => s + t.amount, 0)) / Math.max(1, allTx.length > 0 ? 1 : 0)
      : 5000; // fallback $5K/month

    // ── SPENDING (last 30 days, excluding income) ─────────────────────────────
    const spendTx = allTx.filter((t: any) => t.amount > 0);
    const totalSpend30d = spendTx.reduce((s: number, t: any) => s + t.amount, 0);

    // ── SCORE DIMENSIONS ─────────────────────────────────────────────────────

    // SAVINGS (0–100): total liquid savings ÷ 3 months expenses
    // 100 = 6+ months emergency fund
    const emergencyFundTarget = monthlyIncome * 3;
    const savingsScore = clamp((totalSavings / Math.max(emergencyFundTarget, 1)) * 80 + (totalSavings > 1000 ? 20 : 0));

    // INVESTMENT (0–100): any investing is good; more is better
    const investmentScore = clamp(
      (totalInvesting > 0 ? 40 : 0) +
      (totalInvesting > 10000 ? 20 : 0) +
      (totalInvesting > 50000 ? 25 : 0) +
      (totalInvesting > 100000 ? 15 : 0)
    );

    // DEBT (0–100): lower utilization = higher score
    const creditUtil = totalCreditLimit > 0 ? totalCreditDebt / totalCreditLimit : 0;
    const debtScore = clamp(
      100 -
      (creditUtil * 60) -        // penalize high utilization
      (totalLoanDebt > 50000 ? 20 : totalLoanDebt > 20000 ? 10 : 0)
    );

    // SPENDING (0–100): spending ÷ income ratio
    const spendRatio = monthlyIncome > 0 ? totalSpend30d / monthlyIncome : 0.8;
    const spendingScore = clamp(
      spendRatio < 0.5 ? 100 :
      spendRatio < 0.7 ? 80 :
      spendRatio < 0.85 ? 60 :
      spendRatio < 1.0 ? 40 : 20
    );

    // WEIGHTED TOTAL (0–1000)
    const total = Math.round(
      savingsScore * 3 +
      investmentScore * 2.5 +
      debtScore * 2.5 +
      spendingScore * 2
    );

    // PERCENTILE estimate
    const percentile = Math.min(99, Math.round((total / 1000) * 95 + 5));

    // TIER
    const tier = total >= 900 ? 'BLACK'
      : total >= 700 ? 'PLATINUM'
      : total >= 450 ? 'GOLD'
      : total >= 200 ? 'SILVER'
      : 'BRONZE';

    const result = {
      total,
      savings: savingsScore,
      investment: investmentScore,
      debt: debtScore,
      spending: spendingScore,
      percentile,
      tier,
      tierProgress: 0,
      weeklyChange: 0,
      // Contextual data for personalized moves
      totalSavings: Math.round(totalSavings),
      totalInvesting: Math.round(totalInvesting),
      totalCreditDebt: Math.round(totalCreditDebt),
      creditUtilization: Math.round(creditUtil * 100),
      monthlySpend: Math.round(totalSpend30d),
      estimatedMonthlyIncome: Math.round(monthlyIncome),
      accountCount: allAccounts.length,
    };

    // Save to profile
    await supabase.from('profiles').update({
      score: total,
      tier,
      percentile,
    }).eq('id', user_id);

    return new Response(JSON.stringify(result), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
});
