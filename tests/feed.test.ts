/**
 * Feed composition: the opening slot must always be a decision, not a quiz.
 * Covers personalized ordering, the connect-to-unlock card placement, beliefs
 * demotion, dedupe against base items, determinism, and degenerate inputs.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildFeed, composeFeed, FeedItem, CONNECT_CARD_ID, BELIEFS_ID, BRIEF_ID } from '../src/services/feed';
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
