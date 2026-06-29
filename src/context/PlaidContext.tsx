import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { supabase } from '../services/supabase';

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
  plaidSummary: PlaidSummary | null;
  refresh: () => Promise<void>;       // read stored snapshot
  hardRefresh: () => Promise<void>;   // re-pull from Plaid, then read
}

const PlaidContext = createContext<PlaidContextType>({
  plaidConnected: false,
  plaidSummary: null,
  refresh: async () => {},
  hardRefresh: async () => {},
});

export function PlaidProvider({ children }: { children: React.ReactNode }) {
  const [plaidConnected, setPlaidConnected] = useState(false);
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

      const allAccounts = plaidItems.flatMap((item: any) => item.accounts ?? []);
      const allTx       = plaidItems.flatMap((item: any) => item.transactions ?? []);

      const checking   = allAccounts.filter((a: any) => a.subtype === 'checking');
      const savings    = allAccounts.filter((a: any) => ['savings', 'money market', 'cd'].includes(a.subtype));
      const investment = allAccounts.filter((a: any) => ['brokerage', '401k', 'ira', 'roth', '403b', '529'].includes(a.subtype));
      const credit     = allAccounts.filter((a: any) => a.type === 'credit');

      const sum = (arr: any[], key: string) =>
        Math.round(arr.reduce((s: number, a: any) => s + (a.balances?.[key] ?? 0), 0));

      const incomeTx = allTx.filter((t: any) =>
        t.amount < 0 &&
        ['Payroll', 'Deposit', 'Income'].some(c =>
          (t.category ?? []).some((tc: string) => tc.includes(c))
        )
      );
      const estimatedMonthlyIncome = incomeTx.length > 0
        ? Math.abs(incomeTx.reduce((s: number, t: any) => s + t.amount, 0))
        : 0;

      const spendTx = allTx.filter((t: any) => t.amount > 0);
      const monthlySpend = Math.round(spendTx.reduce((s: number, t: any) => s + t.amount, 0));

      setPlaidConnected(true);
      setPlaidSummary({
        checking: sum(checking, 'current'),
        savings: sum(savings, 'current'),
        investments: sum(investment, 'current'),
        creditDebt: sum(credit, 'current'),
        creditLimit: sum(credit, 'limit'),
        estimatedMonthlyIncome,
        monthlySpend,
        accountCount: allAccounts.length,
      });
    } catch {
      // silent — don't crash if offline
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

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
      };

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
    <PlaidContext.Provider value={{ plaidConnected, plaidSummary, refresh: load, hardRefresh }}>
      {children}
    </PlaidContext.Provider>
  );
}

export function usePlaid() {
  return useContext(PlaidContext);
}
