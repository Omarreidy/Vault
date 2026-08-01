import { supabase, functionAuthHeaders, refreshSessionToken, AuthExpiredError, currentUserId } from './supabase';
import { dedupeAccounts, categorizeAccounts, sumBalances } from './plaidMath';
import { getPreferredLanguage } from './locale';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://gvdfypehwmemootjizmd.supabase.co';

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
  /** Settings → Language: the concierge answers in this language. */
  language?: string;
  totalChecking?: number;
  totalSavings?: number;
  totalInvesting?: number;
  totalCreditDebt?: number;
  creditUtilization?: number;
  accountCount?: number;
}

async function fetchUserContext(): Promise<UserContext | null> {
  try {
    const userId = await currentUserId();
    if (!userId) return null;

    const [{ data: profile }, { data: plaidItems }] = await Promise.all([
      supabase.from('profiles').select('name, tier, score, percentile').eq('id', userId).single(),
      supabase.from('plaid_items').select('accounts').eq('user_id', userId),
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
  const [userContext, language] = await Promise.all([
    fetchUserContext(),
    getPreferredLanguage(),
  ]);
  if (userContext) userContext.language = language;

  // This endpoint streams, so it can't go through callFunction (which parses a
  // whole JSON body). It still needs the same expired-token handling: build the
  // headers through functionAuthHeaders so a stale token is refreshed up front,
  // then refresh-and-replay once if the server still says 401.
  const send = async () => fetch(`${SUPABASE_URL}/functions/v1/concierge`, {
    method: 'POST',
    headers: await functionAuthHeaders(),
    body: JSON.stringify({ messages, userContext }),
  });

  let response = await send();
  if (response.status === 401) {
    if (!(await refreshSessionToken())) throw new AuthExpiredError();
    response = await send();
    if (response.status === 401) throw new AuthExpiredError();
  }

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
