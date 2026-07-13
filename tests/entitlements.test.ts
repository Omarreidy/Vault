/**
 * Premium entitlement read (src/services/premium.ts). As of the D1 fix,
 * `profiles.is_premium` is a guarded column written ONLY by the RevenueCat
 * webhook edge function; the client no longer mirrors RevenueCat into it, it
 * just reads the server truth. These verify the authoritative-read contract:
 * web no-op, signed-out → null, DB truth returned, and a just-completed
 * purchase (webhook lands mid-poll) is picked up without an app restart.
 * (The webhook's own decision logic is covered in revenuecat-webhook.test.ts;
 * the column guard itself is enforced by the DB migration.)
 */
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { syncPremiumStatus } from '../src/services/premium';

function installProfileMock(rows: (boolean | null)[] | boolean | null, signedIn = true) {
  const sequence = Array.isArray(rows) ? [...rows] : [rows];
  const reads: number[] = [];
  let i = 0;
  (globalThis as any).__supabaseMock = {
    auth: {
      getUser: async () => ({ data: { user: signedIn ? { id: 'user-1' } : null }, error: null }),
      getSession: async () => ({ data: { session: null }, error: null }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => {
            reads.push(Date.now());
            const val = sequence[Math.min(i, sequence.length - 1)];
            i++;
            return { data: val === null ? null : { is_premium: val }, error: null };
          },
        }),
      }),
    }),
    rpc: async () => ({ data: null, error: null }),
  };
  return { reads: () => reads.length };
}

beforeEach(() => {
  (globalThis as any).__platformOS = 'ios';
});

test('web platform is a no-op (no native purchases there)', async () => {
  (globalThis as any).__platformOS = 'web';
  const m = installProfileMock(true);
  assert.equal(await syncPremiumStatus(), null);
  assert.equal(m.reads(), 0);
});

test('signed-out user → null, no profile read', async () => {
  const m = installProfileMock(true, false);
  assert.equal(await syncPremiumStatus(), null);
  assert.equal(m.reads(), 0);
});

test('active entitlement in profiles → true on the first read', async () => {
  const m = installProfileMock(true);
  assert.equal(await syncPremiumStatus({ attempts: 4, delayMs: 0 }), true);
  assert.equal(m.reads(), 1); // short-circuits, no extra polling
});

test('no entitlement → false after exhausting the poll', async () => {
  const m = installProfileMock(false);
  assert.equal(await syncPremiumStatus({ attempts: 3, delayMs: 0 }), false);
  assert.equal(m.reads(), 3);
});

test('just-purchased: webhook lands mid-poll → picked up without a restart', async () => {
  // First two reads see the webhook has not landed; the third sees is_premium.
  const m = installProfileMock([false, false, true]);
  assert.equal(await syncPremiumStatus({ attempts: 5, delayMs: 0 }), true);
  assert.equal(m.reads(), 3); // stopped as soon as it flipped true
});

test('DB unreachable → null (never a fabricated entitlement)', async () => {
  (globalThis as any).__supabaseMock = {
    auth: { getUser: async () => ({ data: { user: { id: 'u' } }, error: null }) },
    from: () => ({ select: () => ({ eq: () => ({ single: async () => { throw new Error('down'); } }) }) }),
    rpc: async () => ({ data: null, error: null }),
  };
  assert.equal(await syncPremiumStatus({ attempts: 2, delayMs: 0 }), null);
});

test('null profile row (no profile yet) → false, never true', async () => {
  installProfileMock(null);
  assert.equal(await syncPremiumStatus({ attempts: 2, delayMs: 0 }), false);
});
