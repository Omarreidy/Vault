import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  functionAuthHeaders, callFunction,
  AuthExpiredError, NetworkError, FunctionError,
} from '../src/services/supabase';
import { researchErrorMessage } from '../src/services/companyResearch';

// Regression tests for the "search it three times before it works" bug.
//
// Access tokens live 60 minutes. React Native suspends the refresh timer when
// the app backgrounds, so a returning member arrived with a dead token, every
// edge function answered 401, and the UI blamed the ticker. These lock in the
// three behaviours that fix it: refresh before expiry, replay once on 401, and
// never attribute an infrastructure failure to the member's input.

const ANON = 'sb_publishable_tHoiSHF-49L1_p0OLRPeKw_5mfSi0fs';
const sec = (ms: number) => Math.floor(ms / 1000);

function session(expiresInMs: number, token = 'fresh-token') {
  return { access_token: token, expires_at: sec(Date.now() + expiresInMs) };
}

/** Installs an auth mock; returns a counter of how many refreshes were requested. */
function mockAuth(opts: { session: any; refreshTo?: any; refreshFails?: boolean }) {
  const calls = { refreshes: 0 };
  let current = opts.session;
  globalThis.__supabaseMock = {
    auth: {
      getUser: async () => ({ data: { user: { id: 'u1' } }, error: null }),
      getSession: async () => ({ data: { session: current }, error: null }),
      refreshSession: async () => {
        calls.refreshes++;
        if (opts.refreshFails) return { data: { session: null }, error: new Error('refresh failed') };
        current = opts.refreshTo ?? session(3600_000, 'refreshed-token');
        return { data: { session: current }, error: null };
      },
      startAutoRefresh: async () => {},
      stopAutoRefresh: async () => {},
    },
    from: () => ({}),
    rpc: async () => ({ data: null, error: null }),
  } as any;
  return calls;
}

/** Queues responses; each fetch shifts one. Records the Authorization sent. */
function mockFetch(responses: Array<{ status: number; body?: any } | 'throw'>) {
  const sent: string[] = [];
  (globalThis as any).fetch = async (_url: string, init: any) => {
    sent.push(init?.headers?.Authorization ?? '');
    const next = responses.shift();
    if (!next || next === 'throw') throw new Error('Network request failed');
    return {
      ok: next.status >= 200 && next.status < 300,
      status: next.status,
      json: async () => next.body ?? {},
    } as any;
  };
  return sent;
}

// ── functionAuthHeaders ──────────────────────────────────────────────────────

test('a comfortably fresh token is sent as-is, without a refresh round trip', async () => {
  const calls = mockAuth({ session: session(50 * 60_000) });
  const headers = await functionAuthHeaders();
  assert.equal(headers.Authorization, 'Bearer fresh-token');
  assert.equal(calls.refreshes, 0);
});

test('a token inside the expiry skew is refreshed before it is used', async () => {
  // 2 minutes left: still technically valid, but likely to die mid-request.
  const calls = mockAuth({ session: session(2 * 60_000) });
  const headers = await functionAuthHeaders();
  assert.equal(calls.refreshes, 1);
  assert.equal(headers.Authorization, 'Bearer refreshed-token');
});

test('an already-expired token is refreshed rather than sent to certain rejection', async () => {
  const calls = mockAuth({ session: session(-10 * 60_000, 'dead-token') });
  const headers = await functionAuthHeaders();
  assert.equal(calls.refreshes, 1);
  assert.equal(headers.Authorization, 'Bearer refreshed-token');
});

test('a failed refresh still sends the old token so the 401 retry can take over', async () => {
  const calls = mockAuth({ session: session(-1000, 'stale-token'), refreshFails: true });
  const headers = await functionAuthHeaders();
  assert.equal(calls.refreshes, 1);
  assert.equal(headers.Authorization, 'Bearer stale-token');
});

test('no session at all falls back to the anon key', async () => {
  mockAuth({ session: null });
  const headers = await functionAuthHeaders();
  assert.equal(headers.Authorization, `Bearer ${ANON}`);
  assert.equal(headers.apikey, ANON);
});

// ── callFunction: the 401 replay ─────────────────────────────────────────────

test('a 401 is refreshed and replayed once, and the caller never sees an error', async () => {
  const calls = mockAuth({ session: session(50 * 60_000, 'expired-server-side') });
  const sent = mockFetch([
    { status: 401 },
    { status: 200, body: { ticker: 'AAPL', verdict: 'BUY' } },
  ]);

  const data = await callFunction('company-research', { body: { ticker: 'AAPL' } });

  assert.equal(data.verdict, 'BUY', 'the retry result is returned transparently');
  assert.equal(calls.refreshes, 1, 'exactly one refresh');
  assert.equal(sent.length, 2, 'exactly one replay — not a retry storm');
  assert.equal(sent[0], 'Bearer expired-server-side');
  assert.equal(sent[1], 'Bearer refreshed-token', 'the replay uses the NEW token');
});

test('a 401 that survives the replay surfaces as AuthExpiredError, not a ticker problem', async () => {
  mockAuth({ session: session(50 * 60_000) });
  mockFetch([{ status: 401 }, { status: 401 }]);
  await assert.rejects(
    () => callFunction('company-research', { body: { ticker: 'AAPL' } }),
    (err: Error) => err instanceof AuthExpiredError,
  );
});

test('a 401 with an unrefreshable session fails fast without a pointless replay', async () => {
  const calls = mockAuth({ session: session(50 * 60_000), refreshFails: true });
  const sent = mockFetch([{ status: 401 }, { status: 200, body: {} }]);
  await assert.rejects(
    () => callFunction('company-research', { body: { ticker: 'AAPL' } }),
    (err: Error) => err instanceof AuthExpiredError,
  );
  assert.equal(sent.length, 1, 'no replay when there is no new token to replay with');
  assert.equal(calls.refreshes, 1);
});

test('a successful call never triggers a refresh or a second request', async () => {
  const calls = mockAuth({ session: session(50 * 60_000) });
  const sent = mockFetch([{ status: 200, body: { ok: true } }]);
  await callFunction('market-data', { method: 'GET' });
  assert.equal(sent.length, 1);
  assert.equal(calls.refreshes, 0);
});

// ── callFunction: other failures ─────────────────────────────────────────────

test('a transport failure is a NetworkError, not an auth or input error', async () => {
  mockAuth({ session: session(50 * 60_000) });
  mockFetch(['throw']);
  await assert.rejects(
    () => callFunction('company-research', { body: { ticker: 'AAPL' } }),
    (err: Error) => err instanceof NetworkError,
  );
});

test('a request that outlives its timeout settles instead of hanging forever', async () => {
  mockAuth({ session: session(50 * 60_000) });
  // Never resolves on its own; only the AbortController can end this.
  (globalThis as any).fetch = (_u: string, init: any) =>
    new Promise((_res, rej) => {
      init.signal.addEventListener('abort', () => rej(Object.assign(new Error('Aborted'), { name: 'AbortError' })));
    });

  const started = Date.now();
  await assert.rejects(
    () => callFunction('company-research', { body: { ticker: 'AAPL' }, timeoutMs: 120 }),
    (err: Error) => err instanceof NetworkError,
  );
  assert.ok(Date.now() - started < 3000, 'settled promptly rather than hanging');
});

test('a server error message is preserved rather than replaced with a status code', async () => {
  mockAuth({ session: session(50 * 60_000) });
  mockFetch([{ status: 400, body: { error: 'invalid ticker' } }]);
  await assert.rejects(
    () => callFunction('company-research', { body: { ticker: '!!' } }),
    (err: FunctionError) => err instanceof FunctionError && err.status === 400 && err.message === 'invalid ticker',
  );
});

test('a 200 carrying an error field is still treated as a failure', async () => {
  mockAuth({ session: session(50 * 60_000) });
  mockFetch([{ status: 200, body: { error: 'Research unavailable' } }]);
  await assert.rejects(
    () => callFunction('company-research', { body: { ticker: 'AAPL' } }),
    (err: Error) => err instanceof FunctionError && err.message === 'Research unavailable',
  );
});

// ── The message shown to the member ──────────────────────────────────────────

test('only a real 400 blames the symbol — every other failure names its own cause', () => {
  const blamesTicker = (msg: string) => /symbol|ticker/i.test(msg);

  assert.ok(!blamesTicker(researchErrorMessage(new AuthExpiredError(), 'AAPL')));
  assert.ok(!blamesTicker(researchErrorMessage(new NetworkError(), 'AAPL')));
  assert.ok(!blamesTicker(researchErrorMessage(new FunctionError('boom', 500), 'AAPL')));
  assert.ok(!blamesTicker(researchErrorMessage(new FunctionError('rate', 429), 'AAPL')));

  // The one case where the input genuinely is the problem.
  assert.ok(blamesTicker(researchErrorMessage(new FunctionError('invalid ticker', 400), 'ZZ!!')));
});

test('each failure gets a distinct, actionable message', () => {
  const auth = researchErrorMessage(new AuthExpiredError(), 'AAPL');
  const net  = researchErrorMessage(new NetworkError(), 'AAPL');
  const rate = researchErrorMessage(new FunctionError('rate', 429), 'AAPL');
  const down = researchErrorMessage(new FunctionError('boom', 500), 'AAPL');

  assert.match(auth, /sign in/i);
  assert.match(net, /connection/i);
  assert.match(rate, /wait/i);
  assert.match(down, /unavailable/i);
  assert.equal(new Set([auth, net, rate, down]).size, 4, 'no two causes share a message');
});

test('the retired copy that blamed the ticker for everything is gone for good', () => {
  const everyCause = [
    new AuthExpiredError(),
    new NetworkError(),
    new FunctionError('boom', 500),
    new FunctionError('rate', 429),
    new Error('unknown'),
  ];
  for (const err of everyCause) {
    assert.doesNotMatch(
      researchErrorMessage(err, 'AAPL'),
      /Check the ticker/i,
      'an infrastructure failure must never be reported as bad input',
    );
  }
});
