import { WealthMove } from '../types';
import { Insight } from './insights';
import { WealthWin } from '../types';
import { supabase } from './supabase';
import { dedupeAccounts, dedupeTransactions } from './plaidMath';

export type FeedItemType = 'move' | 'pulse' | 'win' | 'beliefs' | 'connect' | 'brief';

export interface FeedItem {
  id: string;
  type: FeedItemType;
  data: WealthMove | Insight | WealthWin | null;
}

// Deterministic Fisher-Yates using a linear congruential seed.
// Returns a new array — does not mutate.
function seededShuffle<T>(arr: T[], seed: number): T[] {
  const a = [...arr];
  let s = seed >>> 0;
  for (let i = a.length - 1; i > 0; i--) {
    s = Math.imul(s, 1664525) + 1013904223;
    const j = ((s >>> 0) / 0x100000000 * (i + 1)) | 0;
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Changes every calendar day — same feed all day, fresh tomorrow.
function todaySeed(): number {
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

// Mix moves, pulse cards, and wins into a variable-reward sequence.
// Moves and insights are shuffled daily so the feed never feels the same.
export function buildFeed(
  moves: WealthMove[],
  insights: Insight[],
  wins: WealthWin[],
  seed?: number,
): FeedItem[] {
  const s = seed ?? todaySeed();
  const shuffledMoves    = seededShuffle(moves, s);
  const shuffledInsights = seededShuffle(insights, s ^ 0xdeadbeef);
  const shuffledWins     = seededShuffle(wins, s ^ 0xc0ffee);

  const feed: FeedItem[] = [];
  let mIdx = 0, pIdx = 0, wIdx = 0;
  const pattern = [3, 0, 0, 1, 0, 0, 0, 2, 0, 0, 1, 0, 0, 0, 1, 0, 2, 0, 0, 1];

  for (const slot of pattern) {
    if (slot === 3) {
      feed.push({ id: 'beliefs-audit', type: 'beliefs', data: null });
    } else if (slot === 0 && mIdx < shuffledMoves.length) {
      feed.push({ id: `move-${shuffledMoves[mIdx].id}`, type: 'move', data: shuffledMoves[mIdx++] });
    } else if (slot === 1 && pIdx < shuffledInsights.length) {
      feed.push({ id: `pulse-${shuffledInsights[pIdx].id}`, type: 'pulse', data: shuffledInsights[pIdx++] });
    } else if (slot === 2 && wIdx < shuffledWins.length) {
      feed.push({ id: `win-${shuffledWins[wIdx].id}`, type: 'win', data: shuffledWins[wIdx++] });
    } else if (mIdx < shuffledMoves.length) {
      feed.push({ id: `move-${shuffledMoves[mIdx].id}`, type: 'move', data: shuffledMoves[mIdx++] });
    }
  }
  return feed;
}

export const CONNECT_CARD_ID = 'connect-unlock';
export const BELIEFS_ID = 'beliefs-audit';
export const BRIEF_ID = 'daily-brief';

// The Daily Vault Open ordering contract. The feed is a ritual, not a pile:
//
// 1. The daily brief opens: velocity delta since yesterday + moves to close.
// 2. Personalized moves (from real bank data) follow, biggest impact first.
// 3. Not connected: one connect-to-unlock card sits right after the first
//    real move, before the user starts skimming.
// 4. The beliefs audit stays in the feed but never near the front.
//
// Pure and deterministic so the daily feed stays stable within a day.
export function composeFeed(
  base: FeedItem[],
  personalizedMoves: WealthMove[] | null,
  plaidConnected: boolean,
): FeedItem[] {
  const personalized: FeedItem[] = (personalizedMoves ?? [])
    .slice()
    .sort((a, b) => b.impactValue - a.impactValue)
    .slice(0, 5)
    .map(m => ({ id: `move-${m.id}`, type: 'move' as const, data: { ...m, personalized: true } }));

  const personalizedIds = new Set(personalized.map(i => i.id));
  const rest = base.filter(i =>
    !personalizedIds.has(i.id) && i.type !== 'beliefs' && i.type !== 'connect' && i.type !== 'brief');
  const beliefs = base.find(i => i.type === 'beliefs');

  const feed: FeedItem[] = [
    { id: BRIEF_ID, type: 'brief', data: null },
    ...personalized,
    ...rest,
  ];

  if (!plaidConnected) {
    // Index 2: after the brief and the first real move.
    feed.splice(Math.min(2, feed.length), 0, { id: CONNECT_CARD_ID, type: 'connect', data: null });
  }

  // Re-insert the beliefs audit a few cards deep — content, not the opener.
  if (beliefs) feed.splice(Math.min(6, feed.length), 0, beliefs);

  return feed;
}

// Fetch personalized moves based on real Plaid account data
// Returns null if no Plaid data (caller falls back to generic moves)
export async function fetchPersonalizedMoves(): Promise<WealthMove[] | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: plaidItems } = await supabase
      .from('plaid_items')
      .select('accounts, transactions')
      .eq('user_id', user.id);

    if (!plaidItems || plaidItems.length === 0) return null;

    const allAccounts  = dedupeAccounts(plaidItems.flatMap((item: any) => item.accounts ?? []));
    const allTx        = dedupeTransactions(plaidItems.flatMap((item: any) => item.transactions ?? []));

    const checking     = allAccounts.filter((a: any) => a.subtype === 'checking');
    const savings      = allAccounts.filter((a: any) => ['savings','money market','cd'].includes(a.subtype));
    const credit       = allAccounts.filter((a: any) => a.type === 'credit');
    const investments  = allAccounts.filter((a: any) => ['brokerage','401k','ira','roth'].includes(a.subtype));

    const checkingBal  = checking.reduce((s: number, a: any)    => s + (a.balances?.current ?? 0), 0);
    const savingsBal   = savings.reduce((s: number, a: any)     => s + (a.balances?.current ?? 0), 0);
    const creditDebt   = credit.reduce((s: number, a: any)      => s + (a.balances?.current ?? 0), 0);
    const creditLimit  = credit.reduce((s: number, a: any)      => s + (a.balances?.limit ?? 0), 0);
    const investBal    = investments.reduce((s: number, a: any) => s + (a.balances?.current ?? 0), 0);

    const has401k = investments.some((a: any) => a.subtype === '401k');
    const hasRoth = investments.some((a: any) => a.subtype === 'roth');
    const hasSavings = savingsBal > 100;
    const creditUtil = creditLimit > 0 ? creditDebt / creditLimit : 0;

    // Subscription detection from transactions
    const subscriptionTx = allTx.filter((t: any) =>
      (t.category ?? []).some((c: string) => c.toLowerCase().includes('subscription') || c.toLowerCase().includes('software'))
    );
    const monthlySubscriptions = subscriptionTx.reduce((s: number, t: any) => s + Math.abs(t.amount), 0);

    // Build personalized moves based on actual account data
    const moves: WealthMove[] = [];

    // Idle checking cash
    if (checkingBal > 1000 && savingsBal < checkingBal * 0.5) {
      moves.push({
        id: 'p-idle-cash',
        title: `$${Math.round(checkingBal).toLocaleString()} sitting idle in checking`,
        description: `You have $${Math.round(checkingBal).toLocaleString()} in checking earning near 0%. Moving even half to a high-yield savings account earns far more, with FDIC-insured safety.`,
        impact: `+$${Math.round(checkingBal * 0.045).toLocaleString()}/yr`,
        impactValue: Math.round(checkingBal * 0.045),
        category: 'savings',
        effort: 'quick',
        actionLabel: 'Move to HYSA',
        lesson: { headline: 'Your checking account is losing money', body: 'Inflation means idle cash loses real value every day. A high-yield savings account turns your waiting money into working money.', xp: 10 },
      });
    }

    // High credit utilization
    if (creditUtil > 0.3 && creditDebt > 500) {
      moves.push({
        id: 'p-credit-util',
        title: `Credit utilization at ${Math.round(creditUtil * 100)}% — hurting your score`,
        description: `You're using ${Math.round(creditUtil * 100)}% of your $${Math.round(creditLimit).toLocaleString()} credit limit. Above 30% hurts your credit score. Paying down $${Math.round(creditDebt * 0.3).toLocaleString()} brings you to the safe zone.`,
        impact: 'Back under 30%',
        impactValue: Math.round(creditDebt * 0.3),
        category: 'debt',
        effort: 'quick',
        actionLabel: 'Pay down balance',
        lesson: { headline: 'Credit utilization is 30% of your credit score', body: 'Lenders see high utilization as a risk signal. Getting below 30% is the single fastest way to raise your credit score — often within one billing cycle.', xp: 10 },
      });
    }

    // No Roth IRA
    if (!hasRoth && investBal < 50000) {
      moves.push({
        id: 'p-roth',
        title: 'No Roth IRA — missing tax-free growth',
        description: "You don't have a Roth IRA. At your income level, paying taxes now and letting the growth compound tax-free is likely worth more than a traditional IRA deduction.",
        impact: '$180K+ tax-free at 60',
        impactValue: 7000,
        category: 'investment',
        effort: 'medium',
        actionLabel: 'Open Roth IRA',
        lesson: { headline: 'Roth IRA: pay taxes once, never again', body: 'Every dollar in a Roth grows completely tax-free. At retirement, those withdrawals are yours with no tax bill. The younger you start, the bigger the difference.', xp: 10 },
      });
    }

    // No savings account
    if (!hasSavings && checkingBal > 500) {
      moves.push({
        id: 'p-no-savings',
        title: 'No dedicated savings account detected',
        description: 'Your checking balance suggests you could be saving, but there\'s no HYSA linked. Separating savings from spending is the single most effective habit change in personal finance.',
        impact: 'Put idle cash to work',
        impactValue: 500,
        category: 'savings',
        effort: 'quick',
        actionLabel: 'Open HYSA',
        lesson: { headline: 'Separate accounts = automatic saving', body: 'When savings and spending share an account, you spend the savings. A separate HYSA creates a psychological barrier that dramatically improves saving rates.', xp: 10 },
      });
    }

    // Subscription bloat
    if (monthlySubscriptions > 100) {
      moves.push({
        id: 'p-subscriptions',
        title: `$${Math.round(monthlySubscriptions).toLocaleString()}/mo in subscriptions detected`,
        description: `Your transactions show $${Math.round(monthlySubscriptions).toLocaleString()}/month in subscription charges. That's $${Math.round(monthlySubscriptions * 12).toLocaleString()}/yr. Most people cancel 2–3 when they actually look.`,
        impact: `Save $${Math.round(monthlySubscriptions * 0.3 * 12).toLocaleString()}/yr`,
        impactValue: Math.round(monthlySubscriptions * 0.3 * 12),
        category: 'spending',
        effort: 'instant',
        actionLabel: 'Review subscriptions',
        lesson: { headline: 'Subscription creep is the stealthiest wealth drain', body: 'Most people underestimate their subscriptions by 2–3x. The ROI test: if you forgot about it, you don\'t need it. Cancel anything unused for 30+ days.', xp: 10 },
      });
    }

    return moves.length > 0 ? moves : null;
  } catch {
    return null;
  }
}
