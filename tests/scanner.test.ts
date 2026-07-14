/**
 * Scanner failure-mode hardening: the server-side provider chain
 * (retry-with-backoff, cross-provider fallback, time budget), structured
 * telemetry, and the client's failure taxonomy — every distinct reason
 * (offline, auth, rate-limited, image too large, image unreadable, all
 * providers down) must surface as itself, never as a generic error or a
 * fake verdict. Malformed-model-output validation lives in ai.test.ts.
 */
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  runProviderChain, classifyFailure, isRetryable, AllProvidersFailedError,
  type Provider,
} from '../supabase/functions/financial-scanner/chain';
import { emitScanTelemetry } from '../supabase/functions/financial-scanner/telemetry';
import {
  scanDocument, ScanError, SCAN_ERROR_COPY, type ScanFailureReason,
} from '../src/services/financialScanner';

const noSleep = async () => {};
const httpError = (status: number, message = `http ${status}`) =>
  Object.assign(new Error(message), { status });

function provider(name: string, calls: Array<Error | string>): Provider<string> & { callCount: number } {
  const p = {
    name,
    callCount: 0,
    call: async () => {
      const next = calls[Math.min(p.callCount, calls.length - 1)];
      p.callCount++;
      if (next instanceof Error) throw next;
      return next;
    },
  };
  return p;
}

// ── failure classification ───────────────────────────────────────────────────

test('provider errors classify by status and shape, and retryability follows', () => {
  assert.equal(classifyFailure(httpError(429)), 'rate_limited');
  assert.equal(classifyFailure(httpError(529)), 'overloaded');
  assert.equal(classifyFailure(httpError(500)), 'server_error');
  assert.equal(classifyFailure(httpError(503)), 'server_error');
  assert.equal(classifyFailure(httpError(401)), 'auth');
  assert.equal(classifyFailure(httpError(400)), 'bad_request');
  assert.equal(classifyFailure(new TypeError('network request failed')), 'network');
  assert.equal(classifyFailure(Object.assign(new Error('x'), { name: 'AbortError' })), 'timeout');
  assert.equal(classifyFailure(new Error('Request timed out.')), 'timeout');
  assert.equal(classifyFailure(new Error('Overloaded')), 'overloaded');
  assert.equal(classifyFailure(new Error('???')), 'unknown');

  // deterministic rejections skip retries; everything else gets another shot
  assert.equal(isRetryable('auth'), false);
  assert.equal(isRetryable('bad_request'), false);
  for (const k of ['timeout', 'rate_limited', 'overloaded', 'server_error', 'network', 'unknown'] as const) {
    assert.equal(isRetryable(k), true, k);
  }
});

// ── provider chain: retry + fallback ─────────────────────────────────────────

test('healthy primary: one call, no failures recorded', async () => {
  const primary = provider('a', ['{"verdict":"ASSET"}']);
  const fallback = provider('b', ['never']);
  const r = await runProviderChain([primary, fallback], { sleep: noSleep });
  assert.equal(r.result, '{"verdict":"ASSET"}');
  assert.equal(r.provider, 'a');
  assert.equal(r.attempts, 1);
  assert.deepEqual(r.failures, []);
  assert.equal(fallback.callCount, 0);
});

test('transient 500 then success: retried with backoff on the same provider', async () => {
  const delays: number[] = [];
  const primary = provider('a', [httpError(500), 'ok']);
  const r = await runProviderChain([primary], {
    baseDelayMs: 50,
    sleep: async (ms) => { delays.push(ms); },
  });
  assert.equal(r.result, 'ok');
  assert.equal(r.attempts, 2);
  assert.equal(r.failures.length, 1);
  assert.equal(r.failures[0].kind, 'server_error');
  assert.equal(delays.length, 1);
  assert.ok(delays[0] >= 50 && delays[0] < 200, `backoff delay ${delays[0]}`);
});

test('provider rate limit (429) is treated as transient and retried', async () => {
  const primary = provider('a', [httpError(429), 'ok']);
  const r = await runProviderChain([primary], { sleep: noSleep });
  assert.equal(r.result, 'ok');
  assert.equal(r.failures[0].kind, 'rate_limited');
});

test('non-retryable auth failure moves straight to the fallback provider', async () => {
  const primary = provider('a', [httpError(401, 'invalid x-api-key')]);
  const fallback = provider('b', ['ok']);
  const r = await runProviderChain([primary, fallback], { sleep: noSleep });
  assert.equal(r.result, 'ok');
  assert.equal(r.provider, 'b');
  assert.equal(primary.callCount, 1, 'no pointless retry of a rejected key');
  assert.equal(r.failures[0].kind, 'auth');
});

test('primary provider fully down → fallback succeeds (single-vendor outage survived)', async () => {
  const primary = provider('a', [httpError(529, 'overloaded'), httpError(529, 'overloaded')]);
  const fallback = provider('b', ['{"verdict":"LIABILITY"}']);
  const r = await runProviderChain([primary, fallback], { sleep: noSleep });
  assert.equal(r.provider, 'b');
  assert.equal(r.attempts, 3);
  assert.equal(r.failures.length, 2);
  assert.ok(r.failures.every(f => f.provider === 'a' && f.kind === 'overloaded'));
});

test('all providers down → AllProvidersFailedError carrying the real per-attempt reasons', async () => {
  const a = provider('anthropic', [httpError(500)]);
  const b = provider('openai', [new TypeError('fetch failed')]);
  await assert.rejects(
    runProviderChain([a, b], { sleep: noSleep }),
    (err: AllProvidersFailedError) => {
      assert.equal(err.name, 'AllProvidersFailedError');
      assert.equal(err.failures.length, 4); // 2 attempts × 2 providers
      assert.equal(err.failures[0].kind, 'server_error');
      assert.equal(err.failures[2].kind, 'network');
      assert.ok(err.message.includes('anthropic') && err.message.includes('openai'));
      return true;
    },
  );
});

test('hung provider call is cut off by the per-attempt timeout', async () => {
  const hung: Provider<string> = { name: 'a', call: () => new Promise(() => {}) };
  await assert.rejects(
    runProviderChain([hung], { attemptTimeoutMs: 20, maxAttemptsPerProvider: 1, sleep: noSleep }),
    (err: AllProvidersFailedError) => {
      assert.equal(err.failures[0].kind, 'timeout');
      return true;
    },
  );
});

test('chain stops when the total time budget is exhausted instead of running forever', async () => {
  const primary = provider('a', ['should never be reached']);
  let calls = 0;
  const now = () => (calls++ === 0 ? 0 : 100_000); // started at 0; every later check is past budget
  await assert.rejects(
    runProviderChain([primary], { totalBudgetMs: 60_000, now, sleep: noSleep }),
    (err: AllProvidersFailedError) => {
      assert.ok(err.failures[0].message.includes('budget'));
      return true;
    },
  );
  assert.equal(primary.callCount, 0);
});

// ── structured telemetry ─────────────────────────────────────────────────────

test('telemetry emits one JSON line tagged with the real failure reason', () => {
  const lines: string[] = [];
  emitScanTelemetry({
    outcome: 'failure',
    reason: 'all_providers_failed',
    failures: [{ provider: 'anthropic:claude-haiku-4-5', attempt: 1, kind: 'overloaded', message: '529' }],
    userId: 'u1',
    durationMs: 1234,
  }, l => lines.push(l));
  assert.equal(lines.length, 1);
  const parsed = JSON.parse(lines[0]);
  assert.equal(parsed.event, 'scan_telemetry');
  assert.equal(parsed.reason, 'all_providers_failed');
  assert.equal(parsed.failures[0].kind, 'overloaded');
  assert.ok(parsed.at, 'timestamped');
});

test('telemetry never throws, even on an unserializable payload', () => {
  const circular: any = { outcome: 'failure', durationMs: 1 };
  circular.failures = circular;
  assert.doesNotThrow(() => emitScanTelemetry(circular, () => { throw new Error('sink down'); }));
  assert.doesNotThrow(() => emitScanTelemetry(circular));
});

// ── client: every failure reason surfaces as itself ──────────────────────────

const realFetch = globalThis.fetch;

function signIn() {
  (globalThis as any).__supabaseMock = {
    auth: {
      getUser: async () => ({ data: { user: { id: 'u1' } }, error: null }),
      getSession: async () => ({ data: { session: { access_token: 'jwt' } }, error: null }),
    },
    from: () => { throw new Error('not needed'); },
    rpc: async () => ({ data: null, error: null }),
  };
}

function mockFetch(...responses: Array<{ status: number; body?: unknown } | Error>) {
  let i = 0;
  const calls = { count: 0 };
  globalThis.fetch = (async () => {
    calls.count++;
    const next = responses[Math.min(i++, responses.length - 1)];
    if (next instanceof Error) throw next;
    return {
      ok: next.status >= 200 && next.status < 300,
      status: next.status,
      json: async () => {
        if (next.body === undefined) throw new Error('no body');
        return next.body;
      },
    };
  }) as any;
  return calls;
}

async function expectScanError(reason: ScanFailureReason): Promise<ScanError> {
  try {
    await scanDocument('file:///photo.jpg', { retryDelayMs: 1 });
  } catch (err) {
    assert.ok(err instanceof ScanError, `expected ScanError, got ${err}`);
    assert.equal((err as ScanError).reason, reason);
    return err as ScanError;
  }
  assert.fail(`expected scan to fail with '${reason}'`);
}

beforeEach(() => {
  globalThis.fetch = realFetch;
  (globalThis as any).__imageManipulatorMock = {};
  signIn();
});

test('signed out → auth failure with no network call', async () => {
  (globalThis as any).__supabaseMock.auth.getSession = async () => ({ data: { session: null }, error: null });
  globalThis.fetch = (async () => { throw new Error('must not be called'); }) as any;
  await expectScanError('auth');
});

test('unprocessable photo → image_unreadable with no upload attempted', async () => {
  (globalThis as any).__imageManipulatorMock = { throwOnSave: true };
  globalThis.fetch = (async () => { throw new Error('must not be called'); }) as any;
  await expectScanError('image_unreadable');
});

test('image still over the cap after compression → image_too_large before upload', async () => {
  (globalThis as any).__imageManipulatorMock = { base64: 'x'.repeat(7_000_001) };
  globalThis.fetch = (async () => { throw new Error('must not be called'); }) as any;
  await expectScanError('image_too_large');
});

test('device offline: network failure is retried once, then surfaces as offline', async () => {
  const calls = mockFetch(new TypeError('Network request failed'));
  await expectScanError('offline');
  assert.equal(calls.count, 2, 'one retry before giving up');
});

test('network blip then success: the retry recovers and the user never sees an error', async () => {
  const good = { verdict: 'ASSET', itemName: 'Index Fund', emoji: '📈', tagline: 't', annualImpact: '+7%', wealthScoreImpact: '+8', insight: 'i', tip: 't', xp: 20 };
  const calls = mockFetch(new TypeError('Network request failed'), { status: 200, body: good });
  const r = await scanDocument('file:///photo.jpg', { retryDelayMs: 1 });
  assert.equal(r.verdict, 'ASSET');
  assert.ok(r.id);
  assert.equal(calls.count, 2);
});

test('expired session (401) → auth, not retried', async () => {
  const calls = mockFetch({ status: 401, body: { error: 'unauthorized: invalid or expired session' } });
  await expectScanError('auth');
  assert.equal(calls.count, 1);
});

test('server rate limit (429) → rate_limited, not hammered with retries', async () => {
  const calls = mockFetch({ status: 429, body: { error: 'rate_limited' } });
  await expectScanError('rate_limited');
  assert.equal(calls.count, 1);
});

test('server 413 → image_too_large', async () => {
  const calls = mockFetch({ status: 413, body: { error: 'image_too_large' } });
  await expectScanError('image_too_large');
  assert.equal(calls.count, 1);
});

test('all providers down (503) → unavailable, no client retry of an exhausted chain', async () => {
  const calls = mockFetch({ status: 503, body: { error: 'scan_unavailable' } });
  await expectScanError('unavailable');
  assert.equal(calls.count, 1, 'server already retried and fell back; do not double the wait');
});

test('persistent 500 → retried once, then unavailable', async () => {
  const calls = mockFetch({ status: 500, body: { error: 'scan_failed' } });
  await expectScanError('unavailable');
  assert.equal(calls.count, 2);
});

test('malformed 200 response (no verdict / non-JSON) → unavailable, never a fake result', async () => {
  mockFetch({ status: 200, body: { nonsense: true } });
  await expectScanError('unavailable');
  mockFetch({ status: 200 }); // body that fails to parse as JSON
  await expectScanError('unavailable');
});

test('every failure reason has its own distinguishable copy', () => {
  const reasons = Object.keys(SCAN_ERROR_COPY) as ScanFailureReason[];
  assert.deepEqual(
    reasons.sort(),
    ['auth', 'image_too_large', 'image_unreadable', 'offline', 'rate_limited', 'unavailable'],
  );
  const titles = new Set(reasons.map(r => SCAN_ERROR_COPY[r].title));
  const bodies = new Set(reasons.map(r => SCAN_ERROR_COPY[r].body));
  assert.equal(titles.size, reasons.length, 'titles must be distinct');
  assert.equal(bodies.size, reasons.length, 'bodies must be distinct');
  // The user must be able to tell connection problems from our-end problems.
  assert.ok(SCAN_ERROR_COPY.offline.canRetrySameImage);
  assert.ok(!SCAN_ERROR_COPY.auth.canRetrySameImage, 'retrying cannot fix an expired session');
  assert.ok(!SCAN_ERROR_COPY.image_unreadable.canRetrySameImage, 'same broken photo will fail again');
});
