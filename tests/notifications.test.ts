/**
 * Notification system, client layer: preference parsing, deep-link routing
 * (push payloads and in-app cards), grounded copy generation (the no-fake-data
 * rule applies to notifications too), preference gating, and the daily
 * generate/dismiss/read lifecycle.
 */
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseNotifPrefs, DEFAULT_NOTIF_PREFS, NOTIF_PREFS_KEY,
} from '../src/services/notificationPrefs';
import { routeForNotification, routeForNotifType } from '../src/services/notificationRouting';
import {
  buildFreshNotifications, loadNotifications, dismissNotification,
  markNotificationRead, getUnreadCount, NotifType,
} from '../src/services/notifications';

const store = (globalThis as any).__asyncStore as Map<string, string>;

// Streak storage uses DEVICE-local calendar days (see streak.ts); tests run
// under TZ=America/New_York, so build the same local date string.
function localToday(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

function seedStreak(days: number): void {
  store.set('@vault_last_open_date', localToday());
  store.set('@vault_streak_days', String(days));
}

function seedScore(score: number, percentile?: number): void {
  store.set('@vault_onboarding_result', JSON.stringify(
    percentile === undefined ? { score } : { score, percentile },
  ));
}

beforeEach(() => store.clear());

// ── preference parsing ───────────────────────────────────────────────────────

test('notif prefs: null, corrupt, and non-object payloads degrade to defaults', () => {
  assert.deepEqual(parseNotifPrefs(null), DEFAULT_NOTIF_PREFS);
  assert.deepEqual(parseNotifPrefs('{{{'), DEFAULT_NOTIF_PREFS);
  assert.deepEqual(parseNotifPrefs('42'), DEFAULT_NOTIF_PREFS);
  assert.deepEqual(parseNotifPrefs('null'), DEFAULT_NOTIF_PREFS);
});

test('notif prefs: partial stored shape merges over defaults', () => {
  const p = parseNotifPrefs(JSON.stringify({ weekly: false }));
  assert.equal(p.weekly, false);
  assert.equal(p.moves, true);
  assert.equal(p.insight, false); // insight defaults off
});

// ── push payload routing ─────────────────────────────────────────────────────

test('push routing: every scheduled payload lands on its screen', () => {
  assert.equal(routeForNotification({ screen: 'daily_reminder' }), 'Feed');
  assert.equal(routeForNotification({ screen: 'weekly_recap' }), 'Vault');
  assert.equal(routeForNotification({ screen: 'score' }), 'Vault');
  assert.equal(routeForNotification({ screen: 'insights' }), 'Insights');
});

test('push routing: literal tab names pass through (server sends)', () => {
  assert.equal(routeForNotification({ screen: 'Future' }), 'Future');
  assert.equal(routeForNotification({ screen: 'Profile' }), 'Profile');
});

test('push routing: malformed payloads never crash and land on Feed', () => {
  assert.equal(routeForNotification(undefined), 'Feed');
  assert.equal(routeForNotification(null), 'Feed');
  assert.equal(routeForNotification({}), 'Feed');
  assert.equal(routeForNotification({ screen: 7 }), 'Feed');
  assert.equal(routeForNotification({ screen: 'not_a_route' }), 'Feed');
  assert.equal(routeForNotification('garbage'), 'Feed');
});

// ── in-app card routing ──────────────────────────────────────────────────────

test('card routing: each notification type opens where its story lives', () => {
  const expected: Record<NotifType, string> = {
    score_up: 'Vault', score_down: 'Vault', tier_progress: 'Vault',
    goal_milestone: 'Vault', challenge_complete: 'Vault',
    streak: 'Feed', new_moves: 'Feed', win: 'Feed',
    insight: 'Insights',
  };
  for (const [type, tab] of Object.entries(expected)) {
    assert.equal(routeForNotifType(type as NotifType), tab, `type ${type}`);
  }
});

// ── grounded copy ────────────────────────────────────────────────────────────

test('cards are grounded: real streak, real percentile, no invented claims', async () => {
  seedStreak(7);
  seedScore(620, 78);

  const notifs = await buildFreshNotifications();
  const all = notifs.map(n => `${n.title} ${n.body}`).join(' | ');

  const streakCard = notifs.find(n => n.type === 'streak');
  assert.ok(streakCard, 'streak card present');
  assert.match(streakCard!.title, /7/);

  const scoreCard = notifs.find(n => n.type === 'score_up');
  assert.ok(scoreCard, 'score card present');
  assert.match(scoreCard!.body, /78th percentile/);

  // The pre-fix fabrications must never come back.
  assert.doesNotMatch(all, /\$1,200/);
  assert.doesNotMatch(all, /roughly \d+ day/);
  assert.doesNotMatch(all, /top habit tier/);
});

test('percentile is omitted when the score engine did not compute one', async () => {
  seedScore(300);
  const notifs = await buildFreshNotifications();
  const scoreCard = notifs.find(n => n.type === 'score_up');
  assert.ok(scoreCard, 'score card present');
  assert.doesNotMatch(scoreCard!.body, /percentile/);
});

test('card timestamps are the real generation time, not synthetic offsets', async () => {
  seedStreak(3);
  const before = Date.now();
  const notifs = await buildFreshNotifications();
  for (const n of notifs) {
    assert.ok(n.timestamp.getTime() >= before - 1000, `${n.id} not backdated`);
    assert.ok(n.timestamp.getTime() <= Date.now() + 1000, `${n.id} not future-dated`);
  }
});

// ── preference gating ────────────────────────────────────────────────────────

test('toggles gate their categories — no card sneaks past an off switch', async () => {
  seedStreak(5);
  seedScore(620, 78);
  store.set(NOTIF_PREFS_KEY, JSON.stringify({
    moves: false, streak: false, score: false, weekly: false, insight: false,
  }));

  const notifs = await buildFreshNotifications();
  assert.deepEqual(notifs, [], 'every gated category suppressed');
});

test('brand-new user gets welcome + moves even with insight defaulted off', async () => {
  const notifs = await buildFreshNotifications();
  assert.ok(notifs.some(n => n.id.startsWith('welcome_')), 'welcome present');
  assert.ok(notifs.some(n => n.type === 'new_moves'), 'moves present');
});

// ── daily lifecycle ──────────────────────────────────────────────────────────

test('same-day reload serves the persisted list; dismissal is permanent', async () => {
  seedStreak(4);
  const first = await loadNotifications();
  assert.ok(first.length >= 2);

  const victim = first[0];
  await dismissNotification(victim.id);

  const second = await loadNotifications();
  assert.ok(!second.some(n => n.id === victim.id), 'dismissed card gone');
  assert.equal(second.length, first.length - 1);
});

test('read state persists and unread count tracks it', async () => {
  seedStreak(4);
  const notifs = await loadNotifications();
  const start = await getUnreadCount();
  assert.equal(start, notifs.length);

  await markNotificationRead(notifs[0].id);
  assert.equal(await getUnreadCount(), start - 1);
});
