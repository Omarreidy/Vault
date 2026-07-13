import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { supabase, functionAuthHeaders } from '../services/supabase';
import {
  dedupeAccounts,
  dedupeTransactions,
  categorizeAccounts,
  sumBalances,
  estimateMonthlyIncome,
  sumSpend,
} from '../services/plaidMath';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://gvdfypehwmemootjizmd.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? 'sb_publishable_tHoiSHF-49L1_p0OLRPeKw_5mfSi0fs';

// Don't re-pull from Plaid more often than this — protects the backend + Plaid
// rate limits when many users foreground the app repeatedly.
const MIN_REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export interface PlaidSummary {
  checking: number;
  savings: number;
  investments: number;
  creditDebt: number;
  creditLimit: number;
  estimatedMonthlyIncome: number;
  monthlySpend: number;
  accountCount: number;
}

interface PlaidContextType {
  plaidConnected: boolean;
  // False until the first load completes — consumers that branch on
  // plaidConnected (e.g. the feed's connect-to-unlock card) should wait for
  // this so a connected user never flashes the disconnected experience.
  plaidReady: boolean;
  plaidSummary: PlaidSummary | null;
  refresh: () => Promise<void>;       // read stored snapshot
  hardRefresh: () => Promise<void>;   // re-pull from Plaid, then read
}

const PlaidContext = createContext<PlaidContextType>({
  plaidConnected: false,
  plaidReady: false,
  plaidSummary: null,
  refresh: async () => {},
  hardRefresh: async () => {},
});

export function PlaidProvider({ children }: { children: React.ReactNode }) {
  const [plaidConnected, setPlaidConnected] = useState(false);
  const [plaidReady, setPlaidReady] = useState(false);
  const [plaidSummary, setPlaidSummary] = useState<PlaidSummary | null>(null);
  const lastHardRefresh = useRef(0);
  const refreshing = useRef(false);

  const load = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: plaidItems } = await supabase
        .from('plaid_items')
        .select('accounts, transactions')
        .eq('user_id', user.id);

      if (!plaidItems || plaidItems.length === 0) {
        setPlaidConnected(false);
        setPlaidSummary(null);
        return;
      }

      // Shared canonical math (plaidMath.ts): dedupes re-linked accounts and
      // pending/posted transaction pairs before summing.
      const allAccounts = dedupeAccounts(plaidItems.flatMap((item: any) => item.accounts ?? []));
      const allTx       = dedupeTransactions(plaidItems.flatMap((item: any) => item.transactions ?? []));

      const { checking, savings, investment, credit } = categorizeAccounts(allAccounts);

      setPlaidConnected(true);
      setPlaidSummary({
        checking: Math.round(sumBalances(checking, 'current')),
        savings: Math.round(sumBalances(savings, 'current')),
        investments: Math.round(sumBalances(investment, 'current')),
        creditDebt: Math.round(sumBalances(credit, 'current')),
        creditLimit: Math.round(sumBalances(credit, 'limit')),
        estimatedMonthlyIncome: estimateMonthlyIncome(allTx),
        monthlySpend: Math.round(sumSpend(allTx)),
        accountCount: allAccounts.length,
      });
    } catch {
      // silent — don't crash if offline
    } finally {
      setPlaidReady(true);
    }
  }, []);

  // Re-pull fresh data from Plaid (server-side), recompute the score, then reload
  // the local snapshot. Guarded so concurrent/rapid calls collapse into one.
  const hardRefresh = useCallback(async () => {
    if (refreshing.current) return;
    refreshing.current = true;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const headers = await functionAuthHeaders();

      // 1) Pull fresh balances/transactions into our store.
      await fetch(`${SUPABASE_URL}/functions/v1/plaid-refresh`, {
        method: 'POST', headers, body: JSON.stringify({ user_id: user.id }),
      }).catch(() => {});

      // 2) Recompute the score from the fresh data (fire-and-forget; non-fatal).
      fetch(`${SUPABASE_URL}/functions/v1/calculate-score`, {
        method: 'POST', headers, body: JSON.stringify({ user_id: user.id }),
      }).catch(() => {});

      lastHardRefresh.current = Date.now();
    } catch {
      // silent
    } finally {
      refreshing.current = false;
      await load();
    }
  }, [load]);

  // Initial load.
  useEffect(() => { load(); }, [load]);

  // Auto-refresh when the app returns to the foreground (time-guarded).
  useEffect(() => {
    const onChange = (state: AppStateStatus) => {
      if (state === 'active' && Date.now() - lastHardRefresh.current > MIN_REFRESH_INTERVAL_MS) {
        hardRefresh();
      }
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, [hardRefresh]);

  return (
    <PlaidContext.Provider value={{ plaidConnected, plaidReady, plaidSummary, refresh: load, hardRefresh }}>
      {children}
    </PlaidContext.Provider>
  );
}

export function usePlaid() {
  return useContext(PlaidContext);
}
