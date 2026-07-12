/**
 * Canonical Plaid financial math — the single definition of account
 * categorization, balance/income/spend aggregation, and the Velocity score.
 *
 * This file exists in two byte-identical copies (edge functions cannot import
 * app code across the deploy boundary):
 *   - src/services/plaidMath.ts            (app)
 *   - supabase/functions/_shared/finance.ts (edge functions)
 * tests/parity.test.ts fails if the copies drift. Edit both together.
 */

export type VaultTier = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'BLACK';

export interface PlaidBalances {
  current?: number | null;
  limit?: number | null;
}

export interface PlaidAccount {
  account_id?: string | null;
  name?: string | null;
  mask?: string | null;
  type?: string | null;
  subtype?: string | null;
  balances?: PlaidBalances | null;
}

export interface PlaidTransaction {
  transaction_id?: string | null;
  pending_transaction_id?: string | null;
  pending?: boolean | null;
  amount?: number | null;
  category?: string[] | null;
  name?: string | null;
  date?: string | null;
}

export const SAVINGS_SUBTYPES = ['savings', 'money market', 'cd'];
export const INVESTMENT_SUBTYPES = ['brokerage', '401k', 'ira', 'roth', '403b', '529'];
export const INCOME_CATEGORIES = ['Payroll', 'Deposit', 'Income'];

const num = (v: unknown): number => (typeof v === 'number' && isFinite(v) ? v : 0);

/**
 * Drops duplicate accounts. Two layers:
 * 1. exact `account_id` repeats (same row read twice);
 * 2. across re-linked items the same real account reappears under a NEW
 *    account_id — collapse rows whose (name, mask, type, subtype) all match,
 *    but only when a mask is present (mask-less accounts are never merged).
 */
export function dedupeAccounts<T extends PlaidAccount>(accounts: T[]): T[] {
  const byId = new Set<string>();
  const byIdentity = new Set<string>();
  const out: T[] = [];
  for (const a of accounts ?? []) {
    if (!a) continue;
    const id = a.account_id;
    if (id) {
      if (byId.has(id)) continue;
      byId.add(id);
    }
    const mask = a.mask ?? '';
    if (mask) {
      const key = `${a.name ?? ''}|${mask}|${a.type ?? ''}|${a.subtype ?? ''}`;
      if (byIdentity.has(key)) continue;
      byIdentity.add(key);
    }
    out.push(a);
  }
  return out;
}

/**
 * Drops transactions that would double-count money movement:
 * 1. a pending transaction superseded by its posted version
 *    (posted rows carry `pending_transaction_id` pointing at the pending row);
 * 2. exact `transaction_id` repeats. Rows without ids are never collapsed.
 */
export function dedupeTransactions<T extends PlaidTransaction>(transactions: T[]): T[] {
  const txs = (transactions ?? []).filter(Boolean);
  const supersededPendingIds = new Set<string>();
  for (const t of txs) {
    if (t.pending_transaction_id) supersededPendingIds.add(t.pending_transaction_id);
  }
  const seen = new Set<string>();
  const out: T[] = [];
  for (const t of txs) {
    const id = t.transaction_id;
    if (id) {
      if (seen.has(id)) continue;
      if (supersededPendingIds.has(id)) continue;
      seen.add(id);
    }
    out.push(t);
  }
  return out;
}

export interface CategorizedAccounts<T extends PlaidAccount = PlaidAccount> {
  checking: T[];
  savings: T[];
  investment: T[];
  credit: T[];
  loans: T[];
}

export function categorizeAccounts<T extends PlaidAccount>(accounts: T[]): CategorizedAccounts<T> {
  const list = accounts ?? [];
  return {
    checking: list.filter(a => a?.subtype === 'checking'),
    savings: list.filter(a => SAVINGS_SUBTYPES.includes(a?.subtype ?? '')),
    investment: list.filter(a => INVESTMENT_SUBTYPES.includes(a?.subtype ?? '')),
    credit: list.filter(a => a?.type === 'credit'),
    loans: list.filter(a => a?.type === 'loan'),
  };
}

/** Unrounded sum of a balance field; null/undefined/non-finite count as 0. */
export function sumBalances(accounts: PlaidAccount[], key: 'current' | 'limit'): number {
  return (accounts ?? []).reduce((s, a) => s + num(a?.balances?.[key]), 0);
}

/** Plaid legacy category match: money in + Payroll/Deposit/Income category. */
export function isIncomeTx(t: PlaidTransaction): boolean {
  return (
    num(t?.amount) < 0 &&
    INCOME_CATEGORIES.some(c =>
      (t?.category ?? []).some(tc => typeof tc === 'string' && tc.includes(c)),
    )
  );
}

/** |sum| of income transactions over the stored window; 0 when none. Unrounded. */
export function estimateMonthlyIncome(transactions: PlaidTransaction[]): number {
  const incomeTx = (transactions ?? []).filter(isIncomeTx);
  if (incomeTx.length === 0) return 0;
  return Math.abs(incomeTx.reduce((s, t) => s + num(t.amount), 0));
}

/**
 * Spend over the stored window = sum of positive amounts. Refunds/reversals
 * (negative, non-income) deliberately do NOT offset spend — legacy Plaid
 * categories cannot reliably distinguish a refund from an own-account
 * transfer. Documented in qa/FINANCIAL_SPEC.md §4. Unrounded.
 */
export function sumSpend(transactions: PlaidTransaction[]): number {
  return (transactions ?? []).filter(t => num(t?.amount) > 0).reduce((s, t) => s + num(t.amount), 0);
}

/** Canonical net worth: checking + savings + investments − credit debt. Unrounded. */
export function netWorthFromAccounts(accounts: PlaidAccount[]): number {
  const { checking, savings, investment, credit } = categorizeAccounts(accounts);
  return (
    sumBalances(checking, 'current') +
    sumBalances(savings, 'current') +
    sumBalances(investment, 'current') -
    sumBalances(credit, 'current')
  );
}

export function tierFromScore(score: number): VaultTier {
  if (score >= 900) return 'BLACK';
  if (score >= 700) return 'PLATINUM';
  if (score >= 450) return 'GOLD';
  if (score >= 200) return 'SILVER';
  return 'BRONZE';
}

/** Round, then clamp into [0, 100] — matches the score dimensions' contract. */
export function clamp100(val: number, min = 0, max = 100): number {
  return Math.min(Math.max(Math.round(val), min), max);
}

export interface VaultScoreResult {
  total: number;
  savings: number;
  investment: number;
  debt: number;
  spending: number;
  percentile: number;
  tier: VaultTier;
  /** 'fallback' means no income transactions were found and $5,000/mo was assumed. */
  income_basis: 'transactions' | 'fallback';
  totalSavings: number;
  totalInvesting: number;
  totalCreditDebt: number;
  creditUtilization: number;
  monthlySpend: number;
  estimatedMonthlyIncome: number;
  accountCount: number;
}

/**
 * The Velocity score (0–1000). Pure and deterministic: the same snapshot
 * always yields the same score. Formula documented in qa/FINANCIAL_SPEC.md §5.
 */
export function computeVaultScore(
  rawAccounts: PlaidAccount[],
  rawTransactions: PlaidTransaction[],
): VaultScoreResult {
  const allAccounts = dedupeAccounts(rawAccounts ?? []);
  const allTx = dedupeTransactions(rawTransactions ?? []);

  const { savings, investment, credit, loans } = categorizeAccounts(allAccounts);

  const totalSavings = sumBalances(savings, 'current');
  const totalInvesting = sumBalances(investment, 'current');
  const totalCreditDebt = sumBalances(credit, 'current');
  const totalCreditLimit = sumBalances(credit, 'limit');
  const totalLoanDebt = sumBalances(loans, 'current');

  const incomeSum = estimateMonthlyIncome(allTx);
  const hasIncomeTx = allTx.some(isIncomeTx);
  const income_basis: VaultScoreResult['income_basis'] = hasIncomeTx ? 'transactions' : 'fallback';
  const monthlyIncome = hasIncomeTx ? incomeSum : 5000; // documented fallback

  const totalSpend30d = sumSpend(allTx);

  // SAVINGS (0–100): liquid savings vs. a 3-month emergency-fund target.
  const emergencyFundTarget = monthlyIncome * 3;
  const savingsScore = clamp100(
    (totalSavings / Math.max(emergencyFundTarget, 1)) * 80 + (totalSavings > 1000 ? 20 : 0),
  );

  // INVESTMENT (0–100): step bonuses for having/growing invested assets.
  const investmentScore = clamp100(
    (totalInvesting > 0 ? 40 : 0) +
      (totalInvesting > 10000 ? 20 : 0) +
      (totalInvesting > 50000 ? 25 : 0) +
      (totalInvesting > 100000 ? 15 : 0),
  );

  // DEBT (0–100): credit utilization + loan-size penalty.
  const creditUtil = totalCreditLimit > 0 ? totalCreditDebt / totalCreditLimit : 0;
  const debtScore = clamp100(
    100 - creditUtil * 60 - (totalLoanDebt > 50000 ? 20 : totalLoanDebt > 20000 ? 10 : 0),
  );

  // SPENDING (0–100): spend ÷ income ratio, step function.
  const spendRatio = monthlyIncome > 0 ? totalSpend30d / monthlyIncome : 0.8;
  const spendingScore = clamp100(
    spendRatio < 0.5 ? 100 : spendRatio < 0.7 ? 80 : spendRatio < 0.85 ? 60 : spendRatio < 1.0 ? 40 : 20,
  );

  // WEIGHTED TOTAL (0–1000).
  const total = Math.round(
    savingsScore * 3 + investmentScore * 2.5 + debtScore * 2.5 + spendingScore * 2,
  );

  const percentile = Math.min(99, Math.round((total / 1000) * 95 + 5));

  return {
    total,
    savings: savingsScore,
    investment: investmentScore,
    debt: debtScore,
    spending: spendingScore,
    percentile,
    tier: tierFromScore(total),
    income_basis,
    totalSavings: Math.round(totalSavings),
    totalInvesting: Math.round(totalInvesting),
    totalCreditDebt: Math.round(totalCreditDebt),
    creditUtilization: Math.round(creditUtil * 100),
    monthlySpend: Math.round(totalSpend30d),
    estimatedMonthlyIncome: Math.round(monthlyIncome),
    accountCount: allAccounts.length,
  };
}
