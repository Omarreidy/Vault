/**
 * Server push dispatcher: the pure rules in push-dispatch/logic.ts (timezone
 * math, quiet hours, pause, frequency caps, learned send windows, tier
 * progression, dedupe keys, receipt classification) and the grounded copy
 * templates — including the contract that every server payload deep-links to
 * a screen the client routing table actually knows.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  localHour, inQuietHours, isPaused, bestSendHour, withinSendWindow,
  underDailyCap, categoryEnabled, canSendNow, shouldNotifyTier,
  isoWeek, monthKey, dedupeKeyFor, pickVariant, classifyReceipt, chunk,
  DEFAULT_SERVER_PREFS,
} from '../supabase/functions/push-dispatch/logic';
import { buildCopy, variantCount, COPY_CATEGORIES } from '../supabase/functions/push-dispatch/copy';
import { routeForNotification } from '../src/services/notificationRouting';

// ── timezone math ────────────────────────────────────────────────────────────

test('localHour converts to the member timezone; garbage falls back to ET', () => {
  const noonUtc = new Date('2026-07-18T12:00:00Z');
  assert.equal(localHour(noonUtc, 'UTC'), 12);
  assert.equal(localHour(noonUtc, 'America/New_York'), 8);  // EDT = UTC-4
  assert.equal(localHour(noonUtc, 'Europe/Berlin'), 14);    // CEST = UTC+2
  assert.equal(localHour(noonUtc, null), 8);                // default ET
  assert.equal(localHour(noonUtc, 'Not/AZone'), 8);         // bad zone → ET
});

test('quiet hours wrap midnight and can be disabled', () => {
  assert.equal(inQuietHours(23, 22, 8), true);
  assert.equal(inQuietHours(3, 22, 8), true);
  assert.equal(inQuietHours(12, 22, 8), false);
  assert.equal(inQuietHours(8, 22, 8), false);   // end is exclusive
  assert.equal(inQuietHours(13, 12, 14), true);  // non-wrapping window
  assert.equal(inQuietHours(5, 9, 9), false);    // start===end disables
});

test('pause respects the instant and ignores garbage', () => {
  const now = new Date('2026-07-18T12:00:00Z');
  assert.equal(isPaused(null, now), false);
  assert.equal(isPaused('2099-01-01T00:00:00Z', now), true);
  assert.equal(isPaused('2026-01-01T00:00:00Z', now), false); // expired
  assert.equal(isPaused('not a date', now), false);
});

// ── learned timing ───────────────────────────────────────────────────────────

test('bestSendHour: mode of real activity, 18 with no data, lower hour on tie', () => {
  assert.equal(bestSendHour([]), 18);
  assert.equal(bestSendHour([9, 21, 21, 21, 9]), 21);
  assert.equal(bestSendHour([7, 19]), 7); // tie → earlier hour
});

test('send window is ±1 hour and wraps midnight', () => {
  assert.equal(withinSendWindow(20, 21), true);
  assert.equal(withinSendWindow(22, 21), true);
  assert.equal(withinSendWindow(19, 21), false);
  assert.equal(withinSendWindow(23, 0), true); // wrap
  assert.equal(withinSendWindow(1, 0), true);
});

test('daily cap: at most one server push per ~day', () => {
  const now = new Date('2026-07-18T12:00:00Z');
  assert.equal(underDailyCap(null, now), true);
  assert.equal(underDailyCap('2026-07-18T02:00:00Z', now), false); // 10h ago
  assert.equal(underDailyCap('2026-07-17T10:00:00Z', now), true);  // 26h ago
});

// ── the composite gate ───────────────────────────────────────────────────────

const eligibleGate = () => ({
  category: 'dormant_7',
  now: new Date('2026-07-18T22:00:00Z'), // 18:00 in New York
  timezone: 'America/New_York',
  serverPrefs: { ...DEFAULT_SERVER_PREFS },
  lastSentAtIso: null,
  eventLocalHours: [], // no data → best hour 18 → in window
});

test('canSendNow: fully eligible member passes', () => {
  assert.equal(canSendNow(eligibleGate()), true);
});

test('canSendNow: each gate blocks on its own', () => {
  assert.equal(canSendNow({
    ...eligibleGate(),
    serverPrefs: { ...DEFAULT_SERVER_PREFS, paused_until: '2099-01-01T00:00:00Z' },
  }), false, 'paused');

  assert.equal(canSendNow({
    ...eligibleGate(),
    serverPrefs: { ...DEFAULT_SERVER_PREFS, prefs: { moves: false } },
  }), false, 'category toggle off');

  assert.equal(canSendNow({
    ...eligibleGate(),
    serverPrefs: { ...DEFAULT_SERVER_PREFS, quiet_start: 17, quiet_end: 20 },
  }), false, 'quiet hours');

  assert.equal(canSendNow({
    ...eligibleGate(),
    lastSentAtIso: '2026-07-18T20:00:00Z',
  }), false, 'daily cap');

  assert.equal(canSendNow({
    ...eligibleGate(),
    eventLocalHours: [8, 8, 8], // morning person; it's 18:00 local
  }), false, 'outside learned window');
});

test('premium_welcome ignores category toggles but still honors pause', () => {
  assert.equal(categoryEnabled('premium_welcome', { moves: false, score: false }), true);
  assert.equal(canSendNow({
    ...eligibleGate(),
    category: 'premium_welcome',
    serverPrefs: { ...DEFAULT_SERVER_PREFS, paused_until: '2099-01-01T00:00:00Z' },
  }), false);
});

// ── tier progression ─────────────────────────────────────────────────────────

test('tier notifications: only genuine upward movement, never twice, never down', () => {
  assert.equal(shouldNotifyTier('SILVER', []), true);
  assert.equal(shouldNotifyTier('GOLD', ['SILVER']), true);
  assert.equal(shouldNotifyTier('GOLD', ['GOLD']), false);
  assert.equal(shouldNotifyTier('SILVER', ['GOLD']), false); // downgrade — silent
  assert.equal(shouldNotifyTier('BRONZE', []), false);       // baseline tier
  assert.equal(shouldNotifyTier('MYSTERY', []), false);      // unknown tier
});

// ── dedupe + variants ────────────────────────────────────────────────────────

test('dedupe keys pin each category to its period or milestone', () => {
  const d = new Date('2026-07-18T12:00:00Z'); // ISO week 29
  assert.equal(isoWeek(d), '2026-W29');
  assert.equal(monthKey(d), '2026-07');
  assert.equal(dedupeKeyFor('dormant_7', d), 'dormant7:2026-W29');
  assert.equal(dedupeKeyFor('dormant_30', d), 'dormant30:2026-07');
  assert.equal(dedupeKeyFor('tier_up', d, 'GOLD'), 'tier:GOLD');
  assert.equal(dedupeKeyFor('premium_welcome', d), 'premium_welcome');
});

test('variant pick is deterministic per (user, period) and rotates across periods', () => {
  const a = pickVariant('user-1', '2026-W29', 3);
  assert.equal(pickVariant('user-1', '2026-W29', 3), a, 'stable for retries');
  assert.ok(a >= 0 && a < 3);
  const across = new Set(
    ['W29', 'W30', 'W31', 'W32', 'W33', 'W34'].map(w => pickVariant('user-1', w, 3)),
  );
  assert.ok(across.size > 1, 'wording rotates across periods');
});

// ── receipts ─────────────────────────────────────────────────────────────────

test('receipt classification: delivered, token pruning, retry then dead-letter', () => {
  assert.equal(classifyReceipt({ status: 'ok' }, 1), 'delivered');
  assert.equal(classifyReceipt({ status: 'error', details: { error: 'DeviceNotRegistered' } }, 1), 'device_gone');
  assert.equal(classifyReceipt({ status: 'error', details: { error: 'MessageRateExceeded' } }, 1), 'retry');
  assert.equal(classifyReceipt({ status: 'error', details: { error: 'MessageRateExceeded' } }, 3), 'dead');
  assert.equal(classifyReceipt(undefined, 1), 'retry');
  assert.equal(classifyReceipt(undefined, 3), 'dead');
});

test('chunking splits Expo batches correctly', () => {
  assert.deepEqual(chunk([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
  assert.deepEqual(chunk([], 100), []);
});

// ── copy: grounded, varied, and correctly deep-linked ────────────────────────

test('every category/variant produces real copy that deep-links to a known screen', () => {
  const screens: Record<string, string> = {
    dormant_7: 'Feed', dormant_30: 'Feed', tier_up: 'Vault', premium_welcome: 'Profile',
  };
  for (const category of COPY_CATEGORIES) {
    for (let v = 0; v < variantCount(category); v++) {
      const copy = buildCopy(category, v, { tier: 'GOLD', score: 612 });
      assert.ok(copy, `${category} v${v} builds`);
      assert.ok(copy!.title.length > 0 && copy!.title.length <= 40, `${category} v${v} title length`);
      assert.ok(copy!.body.length > 0 && copy!.body.length <= 140, `${category} v${v} body length`);
      // The contract: the client's routing table must resolve this payload.
      assert.equal(routeForNotification(copy!.data), screens[category], `${category} v${v} deep-link`);
    }
  }
});

test('tier copy uses the real tier and score — and no template uses dark patterns', () => {
  const copy = buildCopy('tier_up', 0, { tier: 'PLATINUM', score: 745 });
  assert.match(copy!.title, /PLATINUM/);
  assert.match(copy!.body, /745/);

  const noScore = buildCopy('tier_up', 0, { tier: 'PLATINUM' });
  assert.doesNotMatch(noScore!.body, /\d{3}/, 'no invented score');

  const banned = /last chance|act now|don't miss|hurry|expires|only today|final warning/i;
  for (const category of COPY_CATEGORIES) {
    for (let v = 0; v < variantCount(category); v++) {
      const c = buildCopy(category, v, { tier: 'GOLD', score: 612 })!;
      assert.doesNotMatch(`${c.title} ${c.body}`, banned, `${category} v${v} is honest`);
    }
  }
});

test('unknown category or empty variants return null instead of inventing', () => {
  assert.equal(buildCopy('made_up_category', 0, {}), null);
});
