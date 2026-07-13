// Pure interpretation of a RevenueCat webhook event — no Deno imports so it is
// unit-testable (tests/revenuecat-webhook.test.ts). Decides, from a single
// event, whether the member's `premium` entitlement should be active, and to
// which app user it applies. The edge function is the ONLY writer of
// profiles.is_premium (qa/FINANCIAL_SPEC.md §12, D1).

// The entitlement identifier configured in RevenueCat — must match the client
// check `info.entitlements.active['premium']` in src/services/premium.ts.
export const PREMIUM_ENTITLEMENT = 'premium';

// Events that always mean "no longer entitled".
const DEACTIVATING = new Set(['EXPIRATION', 'SUBSCRIPTION_PAUSED']);
// Events that (for the premium entitlement) mean "entitled".
const ACTIVATING = new Set([
  'INITIAL_PURCHASE',
  'RENEWAL',
  'UNCANCELLATION',
  'PRODUCT_CHANGE',
  'NON_RENEWING_PURCHASE',
]);
// CANCELLATION = auto-renew turned off; the member stays entitled until a later
// EXPIRATION event. TRANSFER / BILLING_ISSUE / TEST don't change entitlement here.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface WebhookDecision {
  /** null when the event is not actionable (no mappable user, or a no-op type). */
  userId: string | null;
  /** null when the event does not change premium state (e.g. CANCELLATION). */
  active: boolean | null;
  type: string;
  reason: string;
}

function entitlementIds(event: any): string[] {
  if (Array.isArray(event?.entitlement_ids)) return event.entitlement_ids.filter((x: any) => typeof x === 'string');
  if (typeof event?.entitlement_id === 'string') return [event.entitlement_id];
  return [];
}

/** RevenueCat app_user_id is the Supabase user id (client calls logIn(user.id)). */
function appUserId(event: any): string | null {
  const id = event?.app_user_id;
  if (typeof id === 'string' && UUID_RE.test(id)) return id;
  // Anonymous RC ids ($RCAnonymousID:…) can't map to a profile — ignore.
  return null;
}

export function decideFromEvent(body: any): WebhookDecision {
  const event = body?.event ?? {};
  const type = typeof event.type === 'string' ? event.type : 'UNKNOWN';
  const userId = appUserId(event);

  if (!userId) {
    return { userId: null, active: null, type, reason: 'no mappable app_user_id' };
  }

  // Only react to events touching the premium entitlement (when the event
  // scopes entitlements at all; some event types omit the field).
  const ents = entitlementIds(event);
  const touchesPremium = ents.length === 0 || ents.includes(PREMIUM_ENTITLEMENT);
  if (!touchesPremium) {
    return { userId, active: null, type, reason: 'event not for premium entitlement' };
  }

  if (DEACTIVATING.has(type)) {
    return { userId, active: false, type, reason: 'deactivating event' };
  }
  if (ACTIVATING.has(type)) {
    // If the event carries an expiration, honor it (an already-expired renewal
    // must not grant access); otherwise trust the activating type.
    const exp = Number(event.expiration_at_ms);
    if (Number.isFinite(exp) && exp > 0 && exp <= Date.now()) {
      return { userId, active: false, type, reason: 'activating event but already expired' };
    }
    return { userId, active: true, type, reason: 'activating event' };
  }

  return { userId, active: null, type, reason: 'non-entitlement-changing event' };
}
