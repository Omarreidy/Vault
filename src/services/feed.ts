import { WealthMove } from '../types';
import { Insight } from './insights';
import { WealthWin } from '../types';
import { supabase } from './supabase';

export type FeedItemType = 'move' | 'pulse' | 'win' | 'beliefs';

export interface FeedItem {
  id: string;
  type: FeedItemType;
  data: WealthMove | Insight | WealthWin | null;
}

// Mix moves, pulse cards, and wins into a variable-reward sequence.
export function buildFeed(
  moves: WealthMove[],
  insights: Insight[],
  wins: WealthWin[],
): FeedItem[] {
  const feed: FeedItem[] = [];
  let mIdx = 0, pIdx = 0, wIdx = 0;
  const pattern = [3, 0, 0, 1, 0, 0, 0, 2, 0, 0, 1, 0, 0, 0, 1, 0, 2, 0, 0, 1];

  for (const slot of pattern) {
    if (slot === 3) {
      feed.push({ id: 'beliefs-audit', type: 'beliefs', data: null });
    } else if (slot === 0 && mIdx < moves.length) {
      feed.push({ id: `move-${moves[mIdx].id}`, type: 'move', data: moves[mIdx++] });
    } else if (slot === 1 && pIdx < insights.length) {
      feed.push({ id: `pulse-${insights[pIdx].id}`, type: 'pulse', data: insights[pIdx++] });
    } else if (slot === 2 && wIdx < wins.length) {
      feed.push({ id: `win-${wins[wIdx].id}`, type: 'win', data: wins[wIdx++] });
    } else if (mIdx < moves.length) {
      feed.push({ id: `move-${moves[mIdx].id}`, type: 'move', data: moves[mIdx++] });
    }
  }
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

    const allAccounts  = plaidItems.flatMap((item: any) => item.accounts ?? []);
    const allTx        = plaidItems.flatMap((item: any) => item.transactions ?? []);

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
        description: `You have $${Math.round(checkingBal).toLocaleString()} in checking earning near 0%. Moving even half to a high-yield savings account earns 50x more with zero risk.`,
        impact: `+$${Math.round(checkingBal * 0.045).toLocaleString()}/yr`,
        impactValue: Math.round(checkingBal * 0.045),
        category: 'savings',
        effort: 'quick',
        actionLabel: 'Move to HYSA',
        lesson: { headline: 'Your checking account is losing money', body: 'Inflation at 3%/yr means idle cash loses real value every day. A HYSA at 4.5% turns your waiting money into working money overnight.', xp: 10 },
      });
    }

    // High credit utilization
    if (creditUtil > 0.3 && creditDebt > 500) {
      moves.push({
        id: 'p-credit-util',
        title: `Credit utilization at ${Math.round(creditUtil * 100)}% — hurting your score`,
        description: `You're using ${Math.round(creditUtil * 100)}% of your $${Math.round(creditLimit).toLocaleString()} credit limit. Above 30% hurts your credit score. Paying down $${Math.round(creditDebt * 0.3).toLocaleString()} brings you to the safe zone.`,
        impact: '+40 credit score pts',
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
        impact: 'Earn 50x more on idle cash',
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
