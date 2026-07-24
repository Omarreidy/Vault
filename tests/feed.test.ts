/**
 * Feed composition: the opening slot must always be a decision, not a quiz.
 * Covers personalized ordering, the connect-to-unlock card placement, beliefs
 * demotion, dedupe against base items, determinism, and degenerate inputs.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildFeed, composeFeed, FeedItem, CONNECT_CARD_ID, BELIEFS_ID, BRIEF_ID,
  daySeedFromDate, todaySeed,
} from '../src/services/feed';
import { WealthMove } from '../src/types';

const move = (id: string, impactValue: number): WealthMove => ({
  id,
  title: `Move ${id}`,
  description: 'desc',
  impact: `+$${impactValue}/yr`,
  impactValue,
  category: 'savings',
  effort: 'quick',
  actionLabel: 'Do it',
});

const insight = (id: string) => ({
  id,
  headline: `Insight ${id}`,
  body: 'body',
  impact: 'impact',
  impactType: 'positive' as const,
  tag: 'MACRO',
  timeAgo: '1h',
  saved: false,
});

const MOVES = [move('m1', 100), move('m2', 200), move('m3', 300), move('m4', 400)];
const INSIGHTS = [insight('i1'), insight('i2'), insight('i3')] as any[];
const SEED = 20260712;

const base = () => buildFeed(MOVES, INSIGHTS, [], SEED);

test('buildFeed opens with the beliefs audit (the problem being fixed)', () => {
  assert.equal(base()[0].type, 'beliefs');
});

test('the daily brief always opens the feed', () => {
  for (const [personalized, connected] of [
    [null, false], [null, true], [[move('p1', 10)], true], [[move('p1', 10)], false],
  ] as const) {
    const feed = composeFeed(base(), personalized as WealthMove[] | null, connected);
    assert.equal(feed[0].id, BRIEF_ID, `brief first for connected=${connected}`);
    assert.equal(feed.filter(i => i.type === 'brief').length, 1, 'brief appears exactly once');
  }
});

test('personalized + connected: highest-impact personalized move follows the brief', () => {
  const personalized = [move('p-low', 50), move('p-high', 900)];
  const feed = composeFeed(base(), personalized, true);

  assert.equal(feed[1].id, 'move-p-high');
  assert.equal(feed[2].id, 'move-p-low');
  assert.equal((feed[1].data as WealthMove).personalized, true);
  assert.ok(!feed.some(i => i.type === 'connect'), 'no connect card when connected');
});

test('not connected: connect card sits after the brief and one real move', () => {
  const feed = composeFeed(base(), null, false);

  assert.equal(feed[0].id, BRIEF_ID);
  assert.equal(feed[1].type, 'move', 'second card is a real move');
  assert.equal(feed[2].id, CONNECT_CARD_ID);
  assert.equal(feed.filter(i => i.type === 'connect').length, 1, 'exactly one connect card');
});

test('beliefs audit stays in the feed but never near the front', () => {
  for (const [personalized, connected] of [
    [null, false], [null, true], [[move('p1', 10)], true], [[move('p1', 10)], false],
  ] as const) {
    const feed = composeFeed(base(), personalized as WealthMove[] | null, connected);
    const idx = feed.findIndex(i => i.id === BELIEFS_ID);
    assert.ok(idx > 2, `beliefs at ${idx} for connected=${connected}`);
    assert.equal(feed.filter(i => i.type === 'beliefs').length, 1, 'beliefs appears exactly once');
  }
});

test('recomposing an already-composed feed never duplicates ritual cards', () => {
  const once = composeFeed(base(), null, false);
  const twice = composeFeed(once, null, false);
  assert.equal(twice.filter(i => i.type === 'brief').length, 1);
  assert.equal(twice.filter(i => i.type === 'connect').length, 1);
});

test('personalized moves that collide with base ids are not duplicated', () => {
  const feed = composeFeed(base(), [move('m1', 999)], true);
  const ids = feed.map(i => i.id);
  assert.equal(new Set(ids).size, ids.length, 'no duplicate ids');
  // The personalized copy wins the front slot (right after the brief).
  assert.equal(feed[1].id, 'move-m1');
  assert.equal((feed[1].data as WealthMove).personalized, true);
});

test('personalized moves are capped at 5', () => {
  const many = Array.from({ length: 9 }, (_, i) => move(`p${i}`, i));
  const feed = composeFeed(base(), many, true);
  const personalized = feed.filter(i => (i.data as WealthMove | null)?.personalized);
  assert.equal(personalized.length, 5);
});

test('composeFeed is deterministic and does not mutate its inputs', () => {
  const b = base();
  const snapshot = JSON.stringify(b);
  const a1 = composeFeed(b, [move('p1', 10)], false).map(i => i.id);
  const a2 = composeFeed(b, [move('p1', 10)], false).map(i => i.id);
  assert.deepEqual(a1, a2);
  assert.equal(JSON.stringify(b), snapshot, 'base feed unchanged');
});

test('empty base feed still yields the brief and a connect card when not connected', () => {
  const feed = composeFeed([] as FeedItem[], null, false);
  assert.deepEqual(feed.map(i => i.type), ['brief', 'connect']);
});

test('all base content survives composition (nothing silently dropped)', () => {
  const b = base();
  const feed = composeFeed(b, null, true);
  const baseIds = new Set(b.map(i => i.id));
  const outIds = new Set(feed.map(i => i.id));
  for (const id of baseIds) assert.ok(outIds.has(id), `lost base item ${id}`);
});

// ── Daily rotation (connected users must not be frozen on a fixed order) ──────

const CONNECTED = [
  move('p-a', 500), move('p-b', 400), move('p-c', 300), move('p-d', 200), move('p-e', 100),
];
const personalizedOrder = (feed: FeedItem[]) =>
  feed.filter(i => (i.data as WealthMove | null)?.personalized).map(i => i.id);

test('rotation #1: same local day → identical personalized order (stable within a day)', () => {
  const seed = daySeedFromDate(new Date(2026, 6, 20));
  const a = personalizedOrder(composeFeed(buildFeed(MOVES, INSIGHTS, [], seed), CONNECTED, true, seed));
  const b = personalizedOrder(composeFeed(buildFeed(MOVES, INSIGHTS, [], seed), CONNECTED, true, seed));
  assert.deepEqual(a, b, 'reopening the same day must not reorder');
});

test('rotation #2: a later local day changes the eligible order', () => {
  const seeds = [0, 1, 2, 3, 4, 5, 6].map(d => daySeedFromDate(new Date(2026, 6, 20 + d)));
  const orders = seeds.map(s =>
    personalizedOrder(composeFeed(buildFeed(MOVES, INSIGHTS, [], s), CONNECTED, true, s)).join(','));
  assert.ok(new Set(orders).size > 1, 'order must change across days, not stay frozen');
});

test('rotation #3: connected state does not permanently freeze the order', () => {
  const s1 = daySeedFromDate(new Date(2026, 6, 20));
  const s2 = daySeedFromDate(new Date(2026, 6, 27));
  const o1 = personalizedOrder(composeFeed(buildFeed(MOVES, INSIGHTS, [], s1), CONNECTED, true, s1));
  const o2 = personalizedOrder(composeFeed(buildFeed(MOVES, INSIGHTS, [], s2), CONNECTED, true, s2));
  assert.notDeepEqual(o1, o2, 'a connected user must see rotation across weeks');
});

test('rotation #4: priority still wins — highest-impact move is pinned #1 every day', () => {
  for (let d = 0; d < 14; d++) {
    const seed = daySeedFromDate(new Date(2026, 6, 20 + d));
    const feed = composeFeed(buildFeed(MOVES, INSIGHTS, [], seed), CONNECTED, true, seed);
    const order = personalizedOrder(feed);
    assert.equal(order[0], 'move-p-a', `highest impact must lead on day offset ${d}`);
    // Personalized (real) moves always rank above generic filler.
    const firstGeneric = feed.findIndex(i => !(i.data as WealthMove | null)?.personalized && i.type === 'move');
    const lastPersonalized = feed.map(i => !!(i.data as WealthMove | null)?.personalized).lastIndexOf(true);
    assert.ok(lastPersonalized < firstGeneric || firstGeneric === -1, 'personalized must outrank generic');
  }
});

test('rotation #5: day key is LOCAL and respects same-day / next-day boundaries', () => {
  // Late-evening local time that is already the NEXT day in UTC (TZ=America/New_York).
  const lateLocal = new Date(2026, 6, 20, 23, 0); // 11pm local, 03:00 UTC Jul 21
  const earlyNext = new Date(2026, 6, 21, 0, 30); // 12:30am local next day
  assert.equal(daySeedFromDate(lateLocal), 20260720, 'local day, not UTC');
  assert.equal(daySeedFromDate(earlyNext), 20260721, 'crossing local midnight advances the key');
  assert.notEqual(daySeedFromDate(lateLocal), daySeedFromDate(earlyNext));
  // Same local day at different hours → same key (stable all day).
  assert.equal(
    daySeedFromDate(new Date(2026, 6, 20, 8, 0)),
    daySeedFromDate(new Date(2026, 6, 20, 20, 0)),
  );
  assert.equal(typeof todaySeed(), 'number');
});

test('rotation: few personalized moves (≤2) keep strict impact order (no forced novelty)', () => {
  const two = [move('p-low', 50), move('p-high', 900)];
  for (let d = 0; d < 5; d++) {
    const seed = daySeedFromDate(new Date(2026, 6, 20 + d));
    const order = personalizedOrder(composeFeed(buildFeed(MOVES, INSIGHTS, [], seed), two, true, seed));
    assert.deepEqual(order, ['move-p-high', 'move-p-low'], 'no low-quality shuffling with only 2 moves');
  }
});
