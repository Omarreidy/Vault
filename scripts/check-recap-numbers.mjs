// Compare the monthly income/spend figures VAULT reports against your own bank.
//
//   node scripts/check-recap-numbers.mjs
//
// Prompts for your VAULT login, reads only your own stored Plaid snapshot, and
// prints the OLD figures (what build 26 shows) beside the NEW ones (what the
// corrected math produces). Nothing is uploaded or written anywhere; the output
// stays in your terminal.
//
// Then open your banking app, add up the last 30 days, and compare. The NEW
// column is what build 27 will display.

import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

const URL  = process.env.EXPO_PUBLIC_SUPABASE_URL  ?? 'https://gvdfypehwmemootjizmd.supabase.co';
const ANON = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? 'sb_publishable_tHoiSHF-49L1_p0OLRPeKw_5mfSi0fs';

const rl = createInterface({ input: stdin, output: stdout });
const email = await rl.question('VAULT email: ');
// Hide the password as it is typed.
stdout.write('VAULT password: ');
stdin.setRawMode?.(true);
let password = '';
for await (const chunk of stdin) {
  const c = chunk.toString();
  if (c === '\r' || c === '\n') break;
  if (c === '') process.exit(1);            // ctrl-c
  if (c === '') { password = password.slice(0, -1); continue; }
  password += c;
}
stdin.setRawMode?.(false);
stdout.write('\n\n');
rl.close();

const auth = await (await fetch(`${URL}/auth/v1/token?grant_type=password`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', apikey: ANON },
  body: JSON.stringify({ email: email.trim(), password }),
})).json();

if (!auth.access_token) {
  console.error('Sign-in failed:', auth.error_description ?? auth.msg ?? JSON.stringify(auth).slice(0, 120));
  process.exit(1);
}

const rows = await (await fetch(
  `${URL}/rest/v1/plaid_items?user_id=eq.${auth.user.id}&select=transactions`,
  { headers: { Authorization: `Bearer ${auth.access_token}`, apikey: ANON } },
)).json();

const tx = (Array.isArray(rows) ? rows : []).flatMap(r => r.transactions ?? []);
if (tx.length === 0) {
  console.log('No transactions stored — no bank connected, or the refresh has not run yet.');
  process.exit(0);
}

const num = v => (typeof v === 'number' && isFinite(v) ? v : 0);
const cats = t => (t?.category ?? []).filter(c => typeof c === 'string');

// Mirrors src/services/plaidMath.ts.
const isTransferOrCard = t => {
  const p = String(t?.personal_finance_category?.primary ?? '').toUpperCase();
  const d = String(t?.personal_finance_category?.detailed ?? '').toUpperCase();
  if (p.startsWith('TRANSFER_')) return true;
  if (d.includes('CREDIT_CARD_PAYMENT')) return true;
  const c = cats(t);
  if (c.some(x => x === 'Transfer')) return true;
  if (c.some(x => x === 'Payment') && c.some(x => /credit card/i.test(x))) return true;
  return false;
};
const isIncomeNew = t => {
  if (num(t?.amount) >= 0) return false;
  const p = String(t?.personal_finance_category?.primary ?? '').toUpperCase();
  if (p === 'INCOME') return true;
  if (p.startsWith('TRANSFER_')) return false;
  return ['Payroll', 'Income'].some(k => cats(t).some(c => c.includes(k)));
};
const isIncomeOld = t =>
  num(t?.amount) < 0 && ['Payroll', 'Deposit', 'Income'].some(k => cats(t).some(c => c.includes(k)));

const sum = list => list.reduce((s, t) => s + Math.abs(num(t.amount)), 0);
const money = n => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const oldIncome = sum(tx.filter(isIncomeOld));
const newIncome = sum(tx.filter(isIncomeNew));
const oldSpend  = sum(tx.filter(t => num(t.amount) > 0));
const newSpend  = sum(tx.filter(t => num(t.amount) > 0 && !isTransferOrCard(t)));

const dates = tx.map(t => t.date).filter(Boolean).sort();
console.log(`${tx.length} transactions stored, ${dates[0]} → ${dates[dates.length - 1]}\n`);
console.log('                 build 26 (old)      build 27 (new)');
console.log(`monthly income   ${money(oldIncome).padEnd(19)}${money(newIncome)}`);
console.log(`monthly spend    ${money(oldSpend).padEnd(19)}${money(newSpend)}`);

const excluded = tx.filter(t => num(t.amount) > 0 && isTransferOrCard(t));
if (excluded.length) {
  console.log(`\nno longer counted as spending (${excluded.length}, ${money(sum(excluded))}):`);
  for (const t of excluded.slice(0, 12)) {
    console.log(`  ${money(Math.abs(num(t.amount))).padStart(12)}  ${String(t.name ?? '').slice(0, 40)}`);
  }
}
console.log('\nNow compare the "new" column against the last 30 days in your bank app.');
