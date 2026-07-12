/**
 * Premium entitlement sync (RevenueCat → profiles.is_premium):
 * paid user with a delayed/unreachable billing backend is never silently
 * downgraded; the flag only changes when the entitlement actually differs;
 * web is a no-op. (The server-side gap — the column being client-writable —
 * is documented as D1 in qa/FINANCIAL_SPEC.md.)
 */
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { syncPremiumStatus } from '../src/services/premium';

type Row = { is_premium: boolean };

function installProfileMock(row: Row | null) {
  const calls: any[] = [];
  (globalThis as any).__supabaseMock = {
    auth: {
      getUser: async () => ({ data: { user: row ? { id: 'user-1' } : null }, error: null }),
      getSession: async () => ({ data: { session: null }, error: null }),
    },
    from: (table: string) => ({
      select: () => ({ eq: () => ({ single: async () => ({ data: row, error: null }) }) }),
      update: (payload: any) => {
        calls.push({ table, payload });
        return { eq: async () => ({ data: null, error: null }) };
      },
    }),
    rpc: async () => ({ data: null, error: null }),
  };
  return calls;
}

beforeEach(() => {
  (globalThis as any).__platformOS = 'ios';
  (globalThis as any).__purchasesMock = null;
});

test('web platform is a no-op (no RevenueCat there)', async () => {
  (globalThis as any).__platformOS = 'web';
  const calls = installProfileMock({ is_premium: false });
  assert.equal(await syncPremiumStatus(), null);
  assert.equal(calls.length, 0);
});

test('newly active entitlement persists is_premium=true with premium_since', async () => {
  (globalThis as any).__purchasesMock = { customerInfo: { entitlements: { active: { premium: {} } } } };
  const calls = installProfileMock({ is_premium: false });
  assert.equal(await syncPremiumStatus(), true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].payload.is_premium, true);
  assert.ok(calls[0].payload.premium_since, 'premium_since stamped on upgrade');
});

test('idempotent: matching flag writes nothing (repeated launches, two sessions)', async () => {
  (globalThis as any).__purchasesMock = { customerInfo: { entitlements: { active: { premium: {} } } } };
  const calls = installProfileMock({ is_premium: true });
  assert.equal(await syncPremiumStatus(), true);
  assert.equal(await syncPremiumStatus(), true);
  assert.equal(calls.length, 0);
});

test('paid user with RevenueCat unreachable (billing event delayed/offline) keeps premium', async () => {
  (globalThis as any).__purchasesMock = { error: new Error('network down') };
  const calls = installProfileMock({ is_premium: true });
  assert.equal(await syncPremiumStatus(), null); // unknown — never guessed
  assert.equal(calls.length, 0);                 // and never written
});

test('expired entitlement clears the flag without stamping premium_since', async () => {
  (globalThis as any).__purchasesMock = { customerInfo: { entitlements: { active: {} } } };
  const calls = installProfileMock({ is_premium: true });
  assert.equal(await syncPremiumStatus(), false);
  assert.equal(calls[0].payload.is_premium, false);
  assert.equal('premium_since' in calls[0].payload, false);
});

test('signed-out user: entitlement reported, no profile write attempted', async () => {
  (globalThis as any).__purchasesMock = { customerInfo: { entitlements: { active: { premium: {} } } } };
  const calls = installProfileMock(null);
  assert.equal(await syncPremiumStatus(), true);
  assert.equal(calls.length, 0);
});
