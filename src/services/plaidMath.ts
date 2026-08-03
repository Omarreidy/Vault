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
  /** Plaid's current taxonomy. The legacy `category` array is being retired. */
  personal_finance_category?: { primary?: string | null; detailed?: string | null } | null;
  name?: string | null;
  date?: string | null;
}

export const SAVINGS_SUBTYPES = ['savings', 'money market', 'cd'];
export const INVESTMENT_SUBTYPES = ['brokerage', '401k', 'ira', 'roth', '403b', '529'];

// Earned income only. 'Deposit' is deliberately absent: Plaid files a transfer
// from your own savings as ['Transfer', 'Deposit'], and counting that as income
// inflated monthly income by the size of every internal transfer.
export const INCOME_CATEGORIES = ['Payroll', 'Income'];

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
  // A re-linked bank arrives as a NEW Plaid Item whose transactions carry fresh
  // transaction_ids for the same real-world payments, so id matching alone lets
  // every reconnect duplicate a member's whole window — tripling reported income
  // and spend for anyone who reconnected twice. The server now drops superseded
  // Items on connect; this is the second line of defence, matching on what the
  // transaction actually *is* rather than on the id Plaid happened to mint.
  const seenIdentity = new Set<string>();
  const out: T[] = [];
  for (const t of txs) {
    const id = t.transaction_id;
    if (id) {
      if (seen.has(id)) continue;
      if (supersededPendingIds.has(id)) continue;
      seen.add(id);
    }

    // Same date, same exact amount, same merchant, same account = the same
    // payment seen twice. Two genuinely separate purchases matching on all four
    // is possible but rare, and under-counting one coffee is a far smaller error
    // than double-counting an entire month.
    const identity = [
      t.date ?? '',
      String(num(t.amount)),
      String(t.name ?? '').toLowerCase().trim(),
      String((t as any).account_id ?? ''),
    ].join('|');
    if (t.date && t.name) {
      if (seenIdentity.has(identity)) continue;
      seenIdentity.add(identity);
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

/** Legacy category array, lowercased, never null. */
function legacyCats(t: PlaidTransaction): string[] {
  return (t?.category ?? []).filter((c): c is string => typeof c === 'string');
}

/**
 * Money moved between the member's own accounts, or a credit-card bill being
 * paid. Neither is consumption and neither belongs in monthly spend:
 *
 *   • A card payment double-counts. The purchases it settles were already
 *     counted as spend on the card itself, so adding the payment from checking
 *     books the same money twice.
 *   • A transfer into savings is the opposite of spending, yet it used to raise
 *     reported spend by the amount saved.
 *
 * ['Payment', 'Rent'] is real spending and must NOT be excluded — only card
 * payments are, which is why this checks for the pairing rather than 'Payment'.
 */
export function isTransferOrCardPayment(t: PlaidTransaction): boolean {
  const pfc = t?.personal_finance_category;
  const primary = typeof pfc?.primary === 'string' ? pfc.primary.toUpperCase() : '';
  const detailed = typeof pfc?.detailed === 'string' ? pfc.detailed.toUpperCase() : '';
  if (primary.startsWith('TRANSFER_')) return true;
  if (detailed.includes('CREDIT_CARD_PAYMENT')) return true;

  const cats = legacyCats(t);
  if (cats.some(c => c === 'Transfer')) return true;
  if (cats.some(c => c === 'Payment') && cats.some(c => /credit card/i.test(c))) return true;
  return false;
}

/**
 * Earned money in. Reads Plaid's current taxonomy first and falls back to the
 * legacy category array, because the legacy field is being retired and an
 * income figure of 0 silently substitutes a hardcoded fallback in the score.
 * Internal transfers are excluded — they are not income.
 */
export function isIncomeTx(t: PlaidTransaction): boolean {
  if (num(t?.amount) >= 0) return false;

  // Current taxonomy is unambiguous where present.
  const primary = t?.personal_finance_category?.primary;
  if (typeof primary === 'string') {
    const p = primary.toUpperCase();
    if (p === 'INCOME') return true;
    if (p.startsWith('TRANSFER_')) return false;
  }

  // An explicit income marker wins over the Transfer tag: Plaid files a
  // direct-deposited paycheck as ['Transfer', 'Payroll']. Excluding everything
  // tagged Transfer would discard real wages and report zero income.
  // A bare ['Transfer', 'Deposit'] carries no such marker and is money arriving
  // from another of the member's own accounts, so it correctly falls through.
  return INCOME_CATEGORIES.some(c => legacyCats(t).some(tc => tc.includes(c)));
}

/** |sum| of income transactions over the stored window; 0 when none. Unrounded. */
export function estimateMonthlyIncome(transactions: PlaidTransaction[]): number {
  const incomeTx = (transactions ?? []).filter(isIncomeTx);
  if (incomeTx.length === 0) return 0;
  return Math.abs(incomeTx.reduce((s, t) => s + num(t.amount), 0));
}

/**
 * Spend over the stored window = money that actually left, excluding movement
 * between the member's own accounts and credit-card bill payments (see
 * isTransferOrCardPayment — counting those inflated reported spend, badly for
 * anyone who pays a card from checking or saves regularly).
 *
 * Refunds/reversals (negative, non-income) still deliberately do NOT offset
 * spend: Plaid's categories cannot reliably tell a refund from an own-account
 * transfer. Documented in qa/FINANCIAL_SPEC.md §4. Unrounded.
 */
export function sumSpend(transactions: PlaidTransaction[]): number {
  return (transactions ?? [])
    .filter(t => num(t?.amount) > 0 && !isTransferOrCardPayment(t))
    .reduce((s, t) => s + num(t.amount), 0);
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
