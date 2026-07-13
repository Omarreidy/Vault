/**
 * RevenueCat webhook decision logic (supabase/functions/revenuecat-webhook/parse.ts).
 * The webhook is the ONLY writer of profiles.is_premium (D1); these pin how each
 * event type maps to an entitlement state and which events are ignored.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decideFromEvent, PREMIUM_ENTITLEMENT } from '../supabase/functions/revenuecat-webhook/parse';

const UID = '5fefe3de-003b-4c2b-92eb-b3f25c8aeb17';
const ev = (over: any = {}) => ({ event: { app_user_id: UID, entitlement_ids: [PREMIUM_ENTITLEMENT], ...over } });

test('purchase / renewal / uncancellation / product change activate premium', () => {
  for (const type of ['INITIAL_PURCHASE', 'RENEWAL', 'UNCANCELLATION', 'PRODUCT_CHANGE', 'NON_RENEWING_PURCHASE']) {
    const d = decideFromEvent(ev({ type }));
    assert.equal(d.userId, UID);
    assert.equal(d.active, true, `${type} → active`);
  }
});

test('expiration and pause deactivate premium', () => {
  assert.equal(decideFromEvent(ev({ type: 'EXPIRATION' })).active, false);
  assert.equal(decideFromEvent(ev({ type: 'SUBSCRIPTION_PAUSED' })).active, false);
});

test('cancellation does NOT change state (still entitled until expiry)', () => {
  const d = decideFromEvent(ev({ type: 'CANCELLATION' }));
  assert.equal(d.userId, UID);
  assert.equal(d.active, null); // no write — a later EXPIRATION flips it
});

test('an activating event that already expired does not grant access', () => {
  const d = decideFromEvent(ev({ type: 'RENEWAL', expiration_at_ms: Date.now() - 1000 }));
  assert.equal(d.active, false);
  const future = decideFromEvent(ev({ type: 'RENEWAL', expiration_at_ms: Date.now() + 86_400_000 }));
  assert.equal(future.active, true);
});

test('events for a different entitlement are ignored', () => {
  const d = decideFromEvent(ev({ type: 'INITIAL_PURCHASE', entitlement_ids: ['some_other_tier'] }));
  assert.equal(d.active, null);
  assert.equal(d.reason, 'event not for premium entitlement');
});

test('legacy single entitlement_id field is honored', () => {
  const d = decideFromEvent({ event: { app_user_id: UID, type: 'INITIAL_PURCHASE', entitlement_id: PREMIUM_ENTITLEMENT } });
  assert.equal(d.active, true);
});

test('events with no entitlement scope still apply to premium (expiration safety)', () => {
  const d = decideFromEvent({ event: { app_user_id: UID, type: 'EXPIRATION' } });
  assert.equal(d.active, false);
});

test('anonymous / non-UUID app_user_id is not actionable', () => {
  assert.equal(decideFromEvent(ev({ app_user_id: '$RCAnonymousID:abc123' })).userId, null);
  assert.equal(decideFromEvent(ev({ app_user_id: undefined })).userId, null);
  assert.equal(decideFromEvent({}).userId, null);
});

test('unknown / test / billing-issue events are no-ops', () => {
  assert.equal(decideFromEvent(ev({ type: 'TEST' })).active, null);
  assert.equal(decideFromEvent(ev({ type: 'BILLING_ISSUE' })).active, null);
  assert.equal(decideFromEvent(ev({ type: 'TRANSFER' })).active, null);
});
