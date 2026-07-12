/**
 * Velocity-score engine + shared Plaid math (src/services/plaidMath.ts, mirrored
 * to supabase/functions/_shared/finance.ts). Covers: empty accounts, zero/negative
 * balances, refunds, duplicate + pending/posted transactions, reconnected
 * accounts, missing categories, large values, rounding, determinism (idempotent
 * repeated requests), and long transaction histories.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  computeVaultScore,
  dedupeAccounts,
  dedupeTransactions,
  categorizeAccounts,
  sumBalances,
  estimateMonthlyIncome,
  sumSpend,
  netWorthFromAccounts,
  tierFromScore,
  clamp100,
} from '../src/services/plaidMath';

const acct = (over: any = {}) => ({
  account_id: over.account_id ?? `acc-${Math.random()}`,
  name: 'Checking',
  mask: '1234',
  type: 'depository',
  subtype: 'checking',
  balances: { current: 0, limit: null },
  ...over,
});

const tx = (over: any = {}) => ({
  transaction_id: over.transaction_id ?? `tx-${Math.random()}`,
  pending: false,
  pending_transaction_id: null,
  amount: 0,
  category: ['Shops'],
  ...over,
});

// ── the two copies of the shared module must never drift ────────────────────
test('parity: plaidMath.ts and _shared/finance.ts are byte-identical', () => {
  const a = fs.readFileSync(path.join(__dirname, '../src/services/plaidMath.ts'), 'utf8');
  const b = fs.readFileSync(path.join(__dirname, '../supabase/functions/_shared/finance.ts'), 'utf8');
  assert.equal(a, b, 'edit both copies together — see file header');
});

// ── documented baseline: user with no bank data ──────────────────────────────
test('empty accounts + no transactions → documented 450/GOLD baseline with fallback income', () => {
  const s = computeVaultScore([], []);
  assert.equal(s.savings, 0);
  assert.equal(s.investment, 0);
  assert.equal(s.debt, 100);      // no credit/loans = perfect debt score (documented)
  assert.equal(s.spending, 100);  // $0 spend vs $5k fallback income (documented)
  assert.equal(s.total, 450);
  assert.equal(s.tier, 'GOLD');
  assert.equal(s.income_basis, 'fallback'); // silent $5k assumption is now visible
  assert.equal(s.percentile, 48);
  assert.equal(s.accountCount, 0);
});

test('zero balances score identically to empty, but report the accounts', () => {
  const s = computeVaultScore(
    [acct({ subtype: 'checking' }), acct({ subtype: 'savings', mask: '5678' })],
    [],
  );
  assert.equal(s.total, 450);
  assert.equal(s.accountCount, 2);
  assert.equal(s.totalSavings, 0);
});

// ── negative balances ────────────────────────────────────────────────────────
test('negative (overdrawn) savings clamps the savings score at 0, never below', () => {
  const s = computeVaultScore([acct({ subtype: 'savings', balances: { current: -500 } })], []);
  assert.equal(s.savings, 0);
  assert.equal(s.totalSavings, -500);
});

test('overpaid credit card (negative balance) yields perfect, not >100, debt score', () => {
  const s = computeVaultScore(
    [acct({ type: 'credit', subtype: 'credit card', balances: { current: -50, limit: 1000 } })],
    [],
  );
  assert.equal(s.debt, 100);
});

test('negative net worth is representable (credit debt > assets)', () => {
  const nw = netWorthFromAccounts([
    acct({ subtype: 'checking', balances: { current: 1000 } }),
    acct({ type: 'credit', subtype: 'credit card', balances: { current: 6000, limit: 10000 } }),
  ]);
  assert.equal(nw, -5000);
});

// ── documented quirks pinned so silent changes fail loudly ───────────────────
test('pinned: credit debt with no reported limit scores utilization as perfect', () => {
  const s = computeVaultScore(
    [acct({ type: 'credit', subtype: 'credit card', balances: { current: 5000, limit: 0 } })],
    [],
  );
  assert.equal(s.debt, 100); // documented remaining risk (spec §5)
});

test('pinned: refunds/reversals do NOT offset spend (spec §4)', () => {
  const s = computeVaultScore(
    [acct()],
    [
      tx({ amount: 80, category: ['Shops'] }),
      tx({ amount: -80, category: ['Shops'] }), // refund of the same purchase
    ],
  );
  assert.equal(s.monthlySpend, 80);
  assert.equal(s.income_basis, 'fallback'); // a refund is never income
  assert.equal(s.estimatedMonthlyIncome, 5000);
});

// ── duplicate / pending+posted transactions (regression D4) ──────────────────
test('a pending transaction and its posted version count once, not twice', () => {
  const pending = tx({ transaction_id: 'p1', pending: true, amount: 50 });
  const posted = tx({ transaction_id: 't1', pending_transaction_id: 'p1', amount: 50 });
  assert.equal(sumSpend(dedupeTransactions([pending, posted])), 50);
  assert.equal(sumSpend(dedupeTransactions([posted, pending])), 50); // order-independent
  const s = computeVaultScore([acct()], [pending, posted]);
  assert.equal(s.monthlySpend, 50);
});

test('exact duplicate transaction_ids collapse to one; id-less rows never collapse', () => {
  const dup = tx({ transaction_id: 'x', amount: 25 });
  assert.equal(sumSpend(dedupeTransactions([dup, { ...dup }])), 25);
  const anonA = { amount: 10, category: ['Shops'] } as any;
  const anonB = { amount: 10, category: ['Shops'] } as any;
  assert.equal(sumSpend(dedupeTransactions([anonA, anonB])), 20);
});

test('duplicate paychecks from a double-stored item do not double income', () => {
  const pay = tx({ transaction_id: 'pay1', amount: -2600, category: ['Transfer', 'Payroll'] });
  assert.equal(estimateMonthlyIncome(dedupeTransactions([pay, { ...pay }])), 2600);
});

// ── deleted & reconnected accounts (regression D6) ───────────────────────────
test('re-linked institution (same account, new account_id) is not double-counted', () => {
  const original = acct({ account_id: 'item1-acc', name: 'Everyday Checking', mask: '4321', balances: { current: 8000 } });
  const relinked = acct({ account_id: 'item2-acc', name: 'Everyday Checking', mask: '4321', balances: { current: 8000 } });
  const deduped = dedupeAccounts([original, relinked]);
  assert.equal(deduped.length, 1);
  assert.equal(sumBalances(categorizeAccounts(deduped).checking, 'current'), 8000);
});

test('same account_id repeated collapses; distinct accounts are kept', () => {
  const a = acct({ account_id: 'same', balances: { current: 100 } });
  assert.equal(dedupeAccounts([a, a]).length, 1);
  const two = dedupeAccounts([
    acct({ mask: '1111', balances: { current: 100 } }),
    acct({ mask: '2222', balances: { current: 200 } }),
  ]);
  assert.equal(two.length, 2);
});

test('mask-less accounts are never merged by the identity heuristic', () => {
  const a = acct({ account_id: 'a1', mask: null, balances: { current: 100 } });
  const b = acct({ account_id: 'a2', mask: null, balances: { current: 100 } });
  assert.equal(dedupeAccounts([a, b]).length, 2);
});

// ── missing categories / malformed rows ──────────────────────────────────────
test('null/missing categories and amounts never crash and never count as income', () => {
  const s = computeVaultScore(
    [acct(), null as any],
    [
      tx({ amount: -3000, category: null }),      // deposit but uncategorized
      tx({ amount: 40, category: undefined }),
      { amount: null } as any,
      null as any,
    ],
  );
  assert.equal(s.income_basis, 'fallback'); // documented: uncategorized income invisible
  assert.equal(s.monthlySpend, 40);
});

// ── income + spending dimensions ─────────────────────────────────────────────
test('income transactions drive the spending ratio (step boundaries exact)', () => {
  const pay = (amt: number) => tx({ amount: -amt, category: ['Payroll'] });
  const spend = (amt: number) => tx({ amount: amt });
  const spendingScore = (income: number, out: number) =>
    computeVaultScore([acct()], [pay(income), spend(out)]).spending;

  assert.equal(spendingScore(1000, 499.99), 100); // < 0.5
  assert.equal(spendingScore(1000, 500), 80);     // exactly 0.5 falls to next band
  assert.equal(spendingScore(1000, 700), 60);
  assert.equal(spendingScore(1000, 850), 40);
  assert.equal(spendingScore(1000, 1000), 20);
  assert.equal(spendingScore(1000, 25000), 20);   // floor at 20
});

test('savings score: emergency-fund ratio + >$1,000 bonus', () => {
  const withSavings = (n: number) =>
    computeVaultScore([acct({ subtype: 'savings', balances: { current: n } })], []).savings;
  // income falls back to $5k → target $15k
  assert.equal(withSavings(15000), 100); // 80 + 20 bonus
  assert.equal(withSavings(1000), 5);    // 5.33 → 5; bonus requires > 1000
  assert.equal(withSavings(1001), 25);   // 5.34 + 20 → 25
});

test('investment score steps at 0/10k/50k/100k boundaries', () => {
  const inv = (n: number) =>
    computeVaultScore([acct({ subtype: 'brokerage', balances: { current: n } })], []).investment;
  assert.equal(inv(0), 0);
  assert.equal(inv(1), 40);
  assert.equal(inv(10000), 40);
  assert.equal(inv(10001), 60);
  assert.equal(inv(50001), 85);
  assert.equal(inv(100001), 100);
});

test('loan penalties step at 20k/50k', () => {
  const loan = (n: number) =>
    computeVaultScore([acct({ type: 'loan', subtype: 'student', balances: { current: n } })], []).debt;
  assert.equal(loan(20000), 100);
  assert.equal(loan(20001), 90);
  assert.equal(loan(50001), 80);
});

// ── large values, rounding, determinism ──────────────────────────────────────
test('very large balances clamp to a perfect 1000/BLACK, never overflow', () => {
  const s = computeVaultScore(
    [
      acct({ subtype: 'savings', balances: { current: 1e12 } }),
      acct({ subtype: 'brokerage', balances: { current: 1e12 } }),
    ],
    [],
  );
  assert.equal(s.savings, 100);
  assert.equal(s.investment, 100);
  assert.equal(s.total, 1000);
  assert.equal(s.tier, 'BLACK');
  assert.equal(s.percentile, 99); // capped
  assert.ok(Number.isSafeInteger(s.totalSavings));
});

test('float-cent amounts aggregate then round once (no per-item drift)', () => {
  const s = computeVaultScore(
    [acct({ balances: { current: 100.499 } })],
    [tx({ amount: 0.1 }), tx({ amount: 0.1 }), tx({ amount: 0.1 }), tx({ amount: 10.005 }), tx({ amount: 20.015 })],
  );
  // 0.30000000000000004 + 30.02 = 30.32 → 30
  assert.equal(s.monthlySpend, 30);
});

test('same snapshot always produces the same score (idempotent recompute)', () => {
  const accounts = [
    acct({ subtype: 'savings', balances: { current: 12345.67 } }),
    acct({ type: 'credit', subtype: 'credit card', mask: '9', balances: { current: 1234.56, limit: 10000 } }),
  ];
  const txs = [tx({ amount: -3210.99, category: ['Payroll'] }), tx({ amount: 987.65 })];
  assert.deepEqual(computeVaultScore(accounts, txs), computeVaultScore(accounts, txs));
});

test('a user with years of history (5,000 tx, 12 accounts) computes fast and sane', () => {
  const accounts = Array.from({ length: 12 }, (_, i) =>
    acct({ account_id: `acc${i}`, mask: String(1000 + i), subtype: i % 2 ? 'savings' : 'checking', balances: { current: 2500 } }),
  );
  const txs = Array.from({ length: 5000 }, (_, i) =>
    tx({
      transaction_id: `t${i}`,
      amount: i % 30 === 0 ? -2600 : 42.5,
      category: i % 30 === 0 ? ['Payroll'] : ['Shops'],
      date: new Date(Date.UTC(2023, 0, 1) + i * 6 * 3600_000).toISOString().slice(0, 10),
    }),
  );
  const started = Date.now();
  const s = computeVaultScore(accounts, txs);
  assert.ok(Date.now() - started < 1000);
  assert.equal(s.income_basis, 'transactions');
  assert.equal(s.estimatedMonthlyIncome, 167 * 2600); // 167 payroll rows (i = 0, 30, …, 4980)
  assert.equal(s.monthlySpend, Math.round(4833 * 42.5));
});

// ── tier + clamp primitives ──────────────────────────────────────────────────
test('tier thresholds at exact boundaries', () => {
  assert.equal(tierFromScore(0), 'BRONZE');
  assert.equal(tierFromScore(199), 'BRONZE');
  assert.equal(tierFromScore(200), 'SILVER');
  assert.equal(tierFromScore(449), 'SILVER');
  assert.equal(tierFromScore(450), 'GOLD');
  assert.equal(tierFromScore(699), 'GOLD');
  assert.equal(tierFromScore(700), 'PLATINUM');
  assert.equal(tierFromScore(899), 'PLATINUM');
  assert.equal(tierFromScore(900), 'BLACK');
  assert.equal(tierFromScore(-50), 'BRONZE');
});

test('clamp100 rounds then clamps', () => {
  assert.equal(clamp100(-5), 0);
  assert.equal(clamp100(49.5), 50);
  assert.equal(clamp100(100.4), 100);
  assert.equal(clamp100(250), 100);
});
