/**
 * Analytics: event payload shape, naming discipline, and the hard guarantee
 * that tracking never throws — offline, signed out, or missing table.
 */
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { EVENTS, buildEvent, getSessionId, track } from '../src/services/analytics';

declare global {
  // eslint-disable-next-line no-var
  var __supabaseMock: any;
}

const resetMock = () => {
  globalThis.__supabaseMock = {
    auth: {
      getUser: async () => ({ data: { user: { id: 'user-1' } }, error: null }),
      getSession: async () => ({ data: { session: null }, error: null }),
    },
    from: () => ({ insert: async (row: any) => { inserted.push(row); return { data: null, error: null }; } }),
    rpc: async () => ({ data: null, error: null }),
  };
};

let inserted: any[] = [];
beforeEach(() => { inserted = []; resetMock(); });

test('event names are unique snake_case', () => {
  const names = Object.values(EVENTS);
  assert.equal(new Set(names).size, names.length);
  for (const n of names) assert.match(n, /^[a-z][a-z0-9_]*$/);
});

test('buildEvent produces a complete, serializable row', () => {
  const now = new Date('2026-07-12T15:00:00Z');
  const row = buildEvent(EVENTS.MOVE_ACTED, { move_id: 'm1', index: 0 }, 'user-1', 'sess-1', now);
  assert.deepEqual(row, {
    user_id: 'user-1',
    session_id: 'sess-1',
    event: 'move_acted',
    props: { move_id: 'm1', index: 0 },
    platform: 'ios',
    client_ts: '2026-07-12T15:00:00.000Z',
  });
  assert.doesNotThrow(() => JSON.stringify(row));
});

test('buildEvent defaults: anonymous user, session id from launch', () => {
  const row = buildEvent(EVENTS.FEED_COMPOSED);
  assert.equal(row.user_id, null);
  assert.equal(row.session_id, getSessionId());
  assert.deepEqual(row.props, {});
});

test('track inserts the signed-in user id', async () => {
  await track(EVENTS.CONNECT_CARD_CTA, { index: 1 });
  assert.equal(inserted.length, 1);
  assert.equal(inserted[0].user_id, 'user-1');
  assert.equal(inserted[0].event, 'connect_card_cta_tapped');
  assert.deepEqual(inserted[0].props, { index: 1 });
});

test('track never throws when the insert fails (missing table, offline)', async () => {
  globalThis.__supabaseMock.from = () => ({ insert: async () => { throw new Error('relation does not exist'); } });
  await assert.doesNotReject(track(EVENTS.MOVE_SKIPPED));
});

test('track never throws when auth itself rejects', async () => {
  globalThis.__supabaseMock.auth.getUser = async () => { throw new Error('network down'); };
  await assert.doesNotReject(track(EVENTS.PLAID_LINK_SUCCEEDED));
});

test('track tolerates a signed-out user', async () => {
  globalThis.__supabaseMock.auth.getUser = async () => ({ data: { user: null }, error: null });
  await track(EVENTS.CONNECT_CARD_VIEWED);
  assert.equal(inserted[0].user_id, null);
});
