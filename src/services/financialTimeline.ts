import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { dedupeAccounts, dedupeTransactions } from './plaidMath';

export type TimelineCategory = 'savings' | 'investing' | 'debt' | 'income' | 'milestone';
export type TimelineEntryType = 'move' | 'milestone' | 'joined' | 'streak' | 'badge' | 'net_worth';

export interface TimelineEntry {
  id: string;
  type: TimelineEntryType;
  category: TimelineCategory;
  title: string;
  sub?: string;
  impact?: string;       // shown on expand: downstream effect
  xp?: number;
  netWorthDelta?: number;
  onStreak?: boolean;    // was user on a streak when this happened
  isPinned?: boolean;
  icon: string;
  daysAgo: number;       // used for "X days ago" display
}

export interface TimelineMonth {
  id: string;
  label: string;         // "MAY 2026"
  movesCount: number;
  xpEarned: number;
  netWorthGain: number;
  grade: 'S' | 'A' | 'B' | 'C';
  isBest?: boolean;
  entries: TimelineEntry[];
}

export const TIMELINE: TimelineMonth[] = [
  {
    id: 'm1',
    label: 'MAY 2026',
    movesCount: 4,
    xpEarned: 197,
    netWorthGain: 2800,
    grade: 'S',
    isBest: true,
    entries: [
      {
        id: 'e1',
        type: 'move',
        category: 'investing',
        title: 'Maxed employer 401(k) match',
        sub: 'Claiming the full $1,200/yr in free money.',
        impact: 'At 7% growth, this decision is worth ~$9,400 by age 45.',
        xp: 75,
        netWorthDelta: 400,
        onStreak: true,
        icon: '◆',
        daysAgo: 2,
      },
      {
        id: 'e2',
        type: 'move',
        category: 'savings',
        title: 'Set up auto-invest ($200/mo)',
        sub: '$200/month now building wealth without thinking.',
        impact: 'In 10 years at current rate: ~$34,000 just from this one move.',
        xp: 60,
        netWorthDelta: 200,
        onStreak: true,
        icon: '◈',
        daysAgo: 8,
      },
      {
        id: 'e3',
        type: 'badge',
        category: 'milestone',
        title: 'Earned "Consistent Builder" badge',
        sub: '21-day streak — top 8% of all VAULT users.',
        impact: 'Users with 21+ day streaks are 3x more likely to hit FI before 50.',
        xp: 50,
        onStreak: true,
        icon: '✦',
        daysAgo: 12,
      },
      {
        id: 'e4',
        type: 'move',
        category: 'debt',
        title: 'Paid extra $300 toward student loan',
        sub: 'Cutting into the principal, not just interest.',
        impact: 'Shaves ~4 months off your payoff date.',
        xp: 12,
        netWorthDelta: 300,
        icon: '◉',
        daysAgo: 19,
      },
    ],
  },
  {
    id: 'm2',
    label: 'APR 2026',
    movesCount: 3,
    xpEarned: 142,
    netWorthGain: 1950,
    grade: 'A',
    entries: [
      {
        id: 'e5',
        type: 'move',
        category: 'savings',
        title: 'Opened High-Yield Savings Account',
        sub: 'Now earning 5x the national average on idle cash.',
        impact: 'On your $8K emergency fund: ~$400/yr in interest vs $80 before.',
        xp: 47,
        netWorthDelta: 80,
        isPinned: true,
        icon: '◈',
        daysAgo: 35,
      },
      {
        id: 'e6',
        type: 'net_worth',
        category: 'milestone',
        title: 'Net worth crossed $40,000',
        sub: 'A milestone most people your age never reach.',
        impact: "You're in the top 31% for your age group.",
        onStreak: true,
        isPinned: true,
        icon: '◉',
        daysAgo: 41,
      },
      {
        id: 'e7',
        type: 'move',
        category: 'investing',
        title: 'Opened Roth IRA',
        sub: 'Tax-free growth for life. One of the best moves you can make.',
        impact: '$500 today in a Roth = ~$5,400 tax-free by retirement.',
        xp: 95,
        netWorthDelta: 500,
        icon: '◆',
        daysAgo: 48,
      },
    ],
  },
  {
    id: 'm3',
    label: 'MAR 2026',
    movesCount: 2,
    xpEarned: 87,
    netWorthGain: 1100,
    grade: 'B',
    entries: [
      {
        id: 'e8',
        type: 'move',
        category: 'savings',
        title: 'Built emergency fund to $5,000',
        sub: '2.5 months of expenses. Protection unlocked.',
        impact: 'You avoided the #1 reason people go into debt: unexpected expenses.',
        xp: 65,
        netWorthDelta: 1000,
        icon: '◈',
        daysAgo: 75,
      },
      {
        id: 'e9',
        type: 'badge',
        category: 'milestone',
        title: 'Completed onboarding · Gold tier unlocked',
        sub: 'Your wealth identity: Builder. Your cohort is waiting.',
        xp: 22,
        icon: '✦',
        daysAgo: 82,
      },
    ],
  },
  {
    id: 'm4',
    label: 'FEB 2026',
    movesCount: 2,
    xpEarned: 55,
    netWorthGain: 600,
    grade: 'B',
    entries: [
      {
        id: 'e10',
        type: 'move',
        category: 'income',
        title: 'Negotiated a raise (+$4,200/yr)',
        sub: 'The highest ROI financial move you can make.',
        impact: 'Over 5 years, that\'s $21,000+ in extra savings compounding.',
        xp: 45,
        netWorthDelta: 350,
        isPinned: true,
        icon: '◇',
        daysAgo: 110,
      },
      {
        id: 'e11',
        type: 'move',
        category: 'debt',
        title: 'Canceled 3 unused subscriptions',
        sub: '$47/mo freed up. Small but it adds up.',
        impact: '$47/mo invested over 10 years = ~$7,800.',
        xp: 10,
        netWorthDelta: 47,
        icon: '◉',
        daysAgo: 118,
      },
    ],
  },
  {
    id: 'm5',
    label: 'JAN 2026',
    movesCount: 1,
    xpEarned: 20,
    netWorthGain: 0,
    grade: 'C',
    entries: [
      {
        id: 'e12',
        type: 'joined',
        category: 'milestone',
        title: 'Joined VAULT',
        sub: 'Your financial biography starts here.',
        impact: 'Users who join VAULT save an average of $4,200 more in their first year.',
        icon: '✦',
        daysAgo: 140,
      },
    ],
  },
];

export const TIMELINE_TOTALS = {
  totalMoves: TIMELINE.reduce((s, m) => s + m.movesCount, 0),
  totalXp: TIMELINE.reduce((s, m) => s + m.xpEarned, 0),
  totalNetWorthGain: TIMELINE.reduce((s, m) => s + m.netWorthGain, 0),
  monthsActive: TIMELINE.length,
};

export const CATEGORY_COLORS: Record<TimelineCategory, string> = {
  savings:   '#C9A96E',
  investing: '#7EB8A4',
  debt:      '#C97A6E',
  income:    '#A4B87E',
  milestone: '#C9A96E',
};

export function daysAgoLabel(days: number): string {
  if (days < 1)   return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7)   return `${days}d ago`;
  if (days < 30)  return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export interface TimelineState {
  months: TimelineMonth[];
  totals: typeof TIMELINE_TOTALS;
  loading: boolean;
  hasRealData: boolean;
}

// ─── Plaid → timeline builders ────────────────────────────────────────────────

const NW_MILESTONES = [1_000_000, 500_000, 250_000, 100_000, 50_000, 25_000, 10_000];

function safeNum(n: any): number {
  return typeof n === 'number' && isFinite(n) ? n : 0;
}

function daysAgoFromDate(dateStr?: string): number {
  if (!dateStr) return 0;
  const t = new Date(dateStr).getTime();
  if (!isFinite(t)) return 0;
  return Math.max(0, Math.floor((Date.now() - t) / 86_400_000));
}

// Turn raw Plaid accounts + transactions into real biography entries.
function buildPlaidEntries(accounts: any[], transactions: any[]): TimelineEntry[] {
  const entries: TimelineEntry[] = [];

  const sum = (arr: any[]) =>
    Math.round(arr.reduce((s, a) => s + safeNum(a?.balances?.current), 0));

  const checking   = accounts.filter(a => a?.subtype === 'checking');
  const savings    = accounts.filter(a => ['savings', 'money market', 'cd'].includes(a?.subtype));
  const investment = accounts.filter(a => ['brokerage', '401k', 'ira', 'roth', '403b', '529'].includes(a?.subtype));
  const credit     = accounts.filter(a => a?.type === 'credit');

  const liquid     = sum(checking) + sum(savings);
  const invested   = sum(investment);
  const debt       = sum(credit);
  const assets     = liquid + invested;
  const netWorth   = assets - debt;

  // 1) Net worth — the headline entry, live as of now.
  entries.push({
    id: 'plaid-networth',
    type: 'net_worth',
    category: 'milestone',
    title: `Net worth: $${netWorth.toLocaleString()}`,
    sub: 'Live, synced from your connected accounts.',
    impact: `$${assets.toLocaleString()} in assets${debt > 0 ? ` · $${debt.toLocaleString()} in debt` : ''}. This updates automatically every time you open VAULT.`,
    isPinned: true,
    icon: '◉',
    daysAgo: 0,
  });

  // 2) Highest net-worth milestone crossed.
  const crossed = NW_MILESTONES.find(m => netWorth >= m);
  if (crossed) {
    entries.push({
      id: 'plaid-milestone',
      type: 'milestone',
      category: 'milestone',
      title: `Crossed $${crossed.toLocaleString()} net worth`,
      sub: 'A threshold most people your age never reach.',
      impact: 'Each milestone compounds faster than the last — the hardest dollars are the first ones.',
      icon: '✦',
      daysAgo: 0,
    });
  }

  // 3) Liquid cash position (powers the "10K Club" achievement).
  if (liquid > 0) {
    entries.push({
      id: 'plaid-liquid',
      type: 'move',
      category: 'savings',
      title: `$${liquid.toLocaleString()} in liquid cash`,
      sub: `${checking.length + savings.length} cash account${checking.length + savings.length === 1 ? '' : 's'} tracked.`,
      impact: liquid >= 10000
        ? "You're in the 10K Club — enough runway to absorb most emergencies without debt."
        : 'Building toward the 10K Club — your first major safety milestone.',
      icon: '◈',
      daysAgo: 0,
    });
  }

  // 4) Investments, if any.
  if (invested > 0) {
    entries.push({
      id: 'plaid-invested',
      type: 'move',
      category: 'investing',
      title: `$${invested.toLocaleString()} invested`,
      sub: `${investment.length} investment account${investment.length === 1 ? '' : 's'} working for you.`,
      impact: 'Invested dollars compound while you sleep — this is the engine of long-term wealth.',
      icon: '◆',
      daysAgo: 0,
    });
  }

  // 5) Account connection record.
  entries.push({
    id: 'plaid-connected',
    type: 'move',
    category: 'milestone',
    title: `Connected ${accounts.length} account${accounts.length === 1 ? '' : 's'}`,
    sub: 'Your biography is now backed by real data.',
    impact: 'Everything in VAULT — your score, trajectory, and cohort ranking — is now personalized to your actual finances.',
    icon: '◈',
    daysAgo: 0,
  });

  // 6) Recent income deposits (Plaid: money in = negative amount).
  const income = (transactions || [])
    .filter(t =>
      safeNum(t?.amount) < 0 &&
      ['Payroll', 'Deposit', 'Income', 'Transfer'].some(c =>
        (t?.category ?? []).some((tc: string) => typeof tc === 'string' && tc.includes(c))
      )
    )
    .sort((a, b) => Math.abs(safeNum(b.amount)) - Math.abs(safeNum(a.amount)))
    .slice(0, 3);

  income.forEach((t, i) => {
    const amt = Math.abs(Math.round(safeNum(t.amount)));
    entries.push({
      id: `plaid-income-${i}`,
      type: 'move',
      category: 'income',
      title: `Income: +$${amt.toLocaleString()}`,
      sub: t?.name ? String(t.name).slice(0, 48) : 'Deposit received',
      impact: 'Income detected automatically — VAULT uses this to estimate your savings rate and FI timeline.',
      icon: '◇',
      daysAgo: daysAgoFromDate(t?.date),
    });
  });

  return entries;
}

// Group a flat list of entries into month blocks, newest first.
function groupIntoMonths(entries: TimelineEntry[]): TimelineMonth[] {
  const buckets = new Map<number, { label: string; entries: TimelineEntry[] }>();

  for (const e of entries) {
    const d = new Date(Date.now() - e.daysAgo * 86_400_000);
    const key = d.getFullYear() * 12 + d.getMonth();
    const label = d.toLocaleString('default', { month: 'short', year: 'numeric' }).toUpperCase();
    if (!buckets.has(key)) buckets.set(key, { label, entries: [] });
    buckets.get(key)!.entries.push(e);
  }

  const keys = [...buckets.keys()].sort((a, b) => b - a); // newest month first
  let bestKey = -1;
  let bestScore = -1;

  const months: TimelineMonth[] = keys.map(key => {
    const { label, entries: monthEntries } = buckets.get(key)!;
    monthEntries.sort((a, b) => a.daysAgo - b.daysAgo); // newest event first
    const movesCount = monthEntries.filter(e => e.type === 'move').length;
    const xpEarned = monthEntries.reduce((s, e) => s + (e.xp ?? 0), 0);
    const netWorthGain = monthEntries.reduce((s, e) => s + (e.netWorthDelta ?? 0), 0);
    const count = monthEntries.length;
    const grade: TimelineMonth['grade'] = count >= 5 ? 'S' : count >= 4 ? 'A' : count >= 2 ? 'B' : 'C';
    if (count > bestScore) { bestScore = count; bestKey = key; }
    return { id: `m-${key}`, label, movesCount, xpEarned, netWorthGain, grade, entries: monthEntries };
  });

  return months.map(m => (m.id === `m-${bestKey}` ? { ...m, isBest: true } : m));
}

// Returns the user's real financial biography. When a bank is connected, it is
// built from live Plaid accounts + transactions; otherwise it's just the
// "Joined VAULT" entry (which keeps FinancialTimeline in its sample/empty state).
export function useTimeline(plaidConnected?: boolean): TimelineState {
  const [state, setState] = useState<TimelineState>({
    months: [],
    totals: { totalMoves: 0, totalXp: 0, totalNetWorthGain: 0, monthsActive: 0 },
    loading: true,
    hasRealData: false,
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || cancelled) {
          setState(s => ({ ...s, loading: false }));
          return;
        }

        // Build a "joined" entry from real auth timestamp.
        const joinedAt = user.created_at ? new Date(user.created_at) : new Date();
        const joinedDaysAgo = Math.floor((Date.now() - joinedAt.getTime()) / 86_400_000);

        const joinedEntry: TimelineEntry = {
          id: 'real-join',
          type: 'joined',
          category: 'milestone',
          title: 'Joined VAULT',
          sub: 'Your financial biography starts here.',
          impact: 'The master begins with nothing but attention. Every move from here builds your record.',
          icon: '✦',
          daysAgo: joinedDaysAgo,
        };

        // Pull live Plaid data (never throws — bad/empty data just yields no entries).
        let plaidEntries: TimelineEntry[] = [];
        try {
          const { data: items } = await supabase
            .from('plaid_items')
            .select('accounts, transactions')
            .eq('user_id', user.id);

          const accounts = dedupeAccounts((items ?? []).flatMap((it: any) => it.accounts ?? []));
          const transactions = dedupeTransactions((items ?? []).flatMap((it: any) => it.transactions ?? []));
          if (accounts.length > 0) {
            plaidEntries = buildPlaidEntries(accounts, transactions);
          }
        } catch {
          // ignore — fall back to joined-only timeline
        }

        if (cancelled) return;

        const allEntries = [...plaidEntries, joinedEntry];
        const months = groupIntoMonths(allEntries);

        // Net worth display: pull the live figure from the net_worth entry.
        const nwEntry = plaidEntries.find(e => e.type === 'net_worth');
        const netWorthTotal = nwEntry
          ? safeNum(parseInt(String(nwEntry.title).replace(/[^0-9-]/g, ''), 10))
          : 0;

        const totals = {
          totalMoves: allEntries.filter(e => e.type === 'move').length,
          totalXp: allEntries.reduce((s, e) => s + (e.xp ?? 0), 0),
          totalNetWorthGain: netWorthTotal,
          monthsActive: months.length,
        };

        setState({ months, totals, loading: false, hasRealData: true });
      } catch {
        if (!cancelled) setState(s => ({ ...s, loading: false }));
      }
    }

    load();
    return () => { cancelled = true; };
  }, [plaidConnected]);

  return state;
}
