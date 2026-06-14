import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';

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
  refresh: () => void;
}

const PlaidContext = createContext<PlaidContextType>({
  plaidConnected: false,
  plaidSummary: null,
  refresh: () => {},
});

export function PlaidProvider({ children }: { children: React.ReactNode }) {
  const [plaidConnected, setPlaidConnected] = useState(false);
  const [plaidSummary, setPlaidSummary] = useState<PlaidSummary | null>(null);

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

  useEffect(() => { load(); }, [load]);

  return (
    <PlaidContext.Provider value={{ plaidConnected, plaidSummary, refresh: load }}>
      {children}
    </PlaidContext.Provider>
  );
}

export function usePlaid() {
  return useContext(PlaidContext);
}
