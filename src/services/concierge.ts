import { supabase } from './supabase';
import { dedupeAccounts, categorizeAccounts, sumBalances } from './plaidMath';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://gvdfypehwmemootjizmd.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? 'sb_publishable_tHoiSHF-49L1_p0OLRPeKw_5mfSi0fs';

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface UserContext {
  name: string;
  tier: string;
  score: number;
  percentile: number;
  plaidConnected: boolean;
  totalChecking?: number;
  totalSavings?: number;
  totalInvesting?: number;
  totalCreditDebt?: number;
  creditUtilization?: number;
  accountCount?: number;
}

async function fetchUserContext(): Promise<UserContext | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const [{ data: profile }, { data: plaidItems }] = await Promise.all([
      supabase.from('profiles').select('name, tier, score, percentile').eq('id', user.id).single(),
      supabase.from('plaid_items').select('accounts').eq('user_id', user.id),
    ]);

    const base: UserContext = {
      name: profile?.name ?? 'Member',
      tier: profile?.tier ?? 'BRONZE',
      score: profile?.score ?? 0,
      percentile: profile?.percentile ?? 0,
      plaidConnected: !!(plaidItems && plaidItems.length > 0),
    };

    if (!base.plaidConnected) return base;

    // Shared canonical math (plaidMath.ts) — same categorization + dedupe the
    // score uses, so the AI advisor reasons from the same numbers as the app.
    const allAccounts = dedupeAccounts((plaidItems ?? []).flatMap((item: any) => item.accounts ?? []));
    const sum = (arr: any[], key: 'current' | 'limit') => Math.round(sumBalances(arr, key));

    const { checking, savings, investment, credit } = categorizeAccounts(allAccounts);

    const totalCreditDebt  = sum(credit, 'current');
    const totalCreditLimit = sum(credit, 'limit');

    return {
      ...base,
      totalChecking:    sum(checking, 'current'),
      totalSavings:     sum(savings, 'current'),
      totalInvesting:   sum(investment, 'current'),
      totalCreditDebt,
      creditUtilization: totalCreditLimit > 0 ? Math.round((totalCreditDebt / totalCreditLimit) * 100) : 0,
      accountCount: allAccounts.length,
    };
  } catch {
    return null;
  }
}

export async function askConcierge(
  messages: ConversationMessage[],
  onChunk: (text: string) => void,
): Promise<void> {
  const [userContext, { data: { session } }] = await Promise.all([
    fetchUserContext(),
    supabase.auth.getSession(),
  ]);

  const authToken = session?.access_token ?? SUPABASE_ANON_KEY;

  const response = await fetch(`${SUPABASE_URL}/functions/v1/concierge`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
      'apikey': SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ messages, userContext }),
  });

  if (!response.ok) throw new Error(`Server error: ${response.status}`);

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    onChunk(decoder.decode(value, { stream: true }));
  }
}
