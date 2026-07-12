/**
 * AI surfaces: the concierge system prompt (incomplete, conflicting, and
 * unavailable financial context) and the scanner's model-output validation
 * (malformed JSON, out-of-range XP, bogus verdicts). Also the client error
 * contract: failed score fetches return null — never fabricated numbers.
 */
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { buildSystemPrompt } from '../supabase/functions/concierge/prompt';
import { parseScanResult, fallbackScanResult } from '../supabase/functions/financial-scanner/parse';
import { fetchLiveScore } from '../src/services/velocity';
import { buildFeed } from '../src/services/feed';
import { getScanErrorResult, VERDICT_COLORS } from '../src/services/financialScanner';

// ── concierge prompt ─────────────────────────────────────────────────────────

test('no context at all → generic advisor prompt, no invented numbers', () => {
  const p = buildSystemPrompt(null);
  assert.ok(p.includes('VAULT Concierge'));
  assert.ok(!p.includes('$'), 'no dollar figures without data');
});

test('profile-only context (no bank) advises from profile and encourages linking', () => {
  const p = buildSystemPrompt({ name: 'Imran', tier: 'SILVER', score: 340, percentile: 37, plaidConnected: false });
  assert.ok(p.includes('Imran'));
  assert.ok(p.includes('340/1000'));
  assert.ok(p.includes("haven't connected bank accounts"));
  assert.ok(!p.includes('Net worth'), 'never quotes a net worth it does not have');
});

test('REGRESSION D2: net worth quoted to the AI includes checking', () => {
  const p = buildSystemPrompt({
    name: 'Imran', tier: 'GOLD', score: 512, percentile: 53, plaidConnected: true,
    totalChecking: 1000, totalSavings: 2000, totalInvesting: 3000, totalCreditDebt: 500,
    creditUtilization: 5, accountCount: 4,
  });
  assert.ok(p.includes('Net worth:     $5,500'), 'checking + savings + investments − debt');
});

test('incomplete snapshot fields default to 0 instead of NaN or errors', () => {
  const p = buildSystemPrompt({ name: 'X', tier: 'BRONZE', score: 100, percentile: 10, plaidConnected: true });
  assert.ok(p.includes('Checking:      $0'));
  assert.ok(p.includes('Net worth:     $0'));
  assert.ok(!p.includes('NaN') && !p.includes('undefined'));
});

test('conflicting data (debt exceeds assets) renders a negative net worth honestly', () => {
  const p = buildSystemPrompt({
    name: 'X', tier: 'BRONZE', score: 100, percentile: 10, plaidConnected: true,
    totalCreditDebt: 10000, creditUtilization: 95,
  });
  assert.ok(p.includes('-10,000'));
});

// ── scanner output validation (REGRESSION D12) ───────────────────────────────

test('well-formed model JSON passes through, even wrapped in prose', () => {
  const r = parseScanResult('Sure! Here is the verdict:\n{"verdict":"ASSET","itemName":"Index Fund","emoji":"📈","tagline":"t","annualImpact":"+7%","wealthScoreImpact":"+8","insight":"i","tip":"t","xp":20}');
  assert.equal(r.verdict, 'ASSET');
  assert.equal(r.xp, 20);
  assert.equal(r.itemName, 'Index Fund');
});

test('bogus verdict is coerced into the enum the client can render', () => {
  const r = parseScanResult('{"verdict":"SUPER BUY!!","itemName":"Car","xp":15}');
  assert.equal(r.verdict, 'BUDGET CHECK');
  assert.ok(VERDICT_COLORS[r.verdict], 'client color lookup cannot miss');
});

test('model-asserted XP is clamped to the 0–25 design range', () => {
  assert.equal(parseScanResult('{"verdict":"ASSET","xp":1000}').xp, 25);
  assert.equal(parseScanResult('{"verdict":"ASSET","xp":-40}').xp, 0);
  assert.equal(parseScanResult('{"verdict":"ASSET","xp":"lots"}').xp, 10);
  assert.equal(parseScanResult('{"verdict":"ASSET"}').xp, 10);
});

test('unparseable model output degrades to the honest fallback, never a fake verdict', () => {
  const r = parseScanResult('I cannot see the image clearly, sorry.');
  assert.equal(r.verdict, 'BUDGET CHECK');
  assert.equal(r.itemName, 'Scanned Item');
  assert.equal(r.xp, 10);
  const broken = parseScanResult('{"verdict": "ASSET", "xp": '); // truncated JSON
  assert.equal(broken.itemName, 'Scanned Item');
  assert.deepEqual(fallbackScanResult('abc').insight, 'abc');
});

test('non-string fields are coerced to safe defaults', () => {
  const r = parseScanResult('{"verdict":"LIABILITY","itemName":42,"emoji":null,"tagline":"","monthlyCost":12,"xp":12}');
  assert.equal(r.itemName, 'Scanned Item');
  assert.equal(r.emoji, '📄');
  assert.equal(r.monthlyCost, undefined); // numeric monthlyCost dropped, not stringified
});

test('client scan error card is honest: zero XP, no verdict spin', () => {
  const r = getScanErrorResult();
  assert.equal(r.xp, 0);
  assert.ok(r.itemName.includes("Couldn't analyze"));
});

// ── client error contract: no plausible-but-wrong numbers ────────────────────

const realFetch = globalThis.fetch;
beforeEach(() => { globalThis.fetch = realFetch; });

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

test('score fetch: network failure → null (slow/failed request never invents a score)', async () => {
  signIn();
  globalThis.fetch = (async () => { throw new Error('timeout'); }) as any;
  assert.equal(await fetchLiveScore(), null);
});

test('score fetch: server error payload → null, not a zero score', async () => {
  signIn();
  globalThis.fetch = (async () => ({ json: async () => ({ error: 'no_plaid_data' }) })) as any;
  assert.equal(await fetchLiveScore(), null);
});

test('score fetch: good payload maps through with derived tier progress', async () => {
  signIn();
  globalThis.fetch = (async () => ({
    json: async () => ({ total: 512, savings: 60, investment: 40, debt: 80, spending: 70, percentile: 53, tier: 'GOLD' }),
  })) as any;
  const s = await fetchLiveScore();
  assert.equal(s!.total, 512);
  assert.equal(s!.tier, 'GOLD');
  assert.ok(s!.tierProgress > 0 && s!.tierProgress < 1);
  // repeated request, same response → same result (idempotent)
  assert.deepEqual(await fetchLiveScore(), s);
});

test('signed-out score fetch → null without any network call', async () => {
  (globalThis as any).__supabaseMock = {
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
      getSession: async () => ({ data: { session: null }, error: null }),
    },
    from: () => { throw new Error('not needed'); },
    rpc: async () => ({ data: null, error: null }),
  };
  globalThis.fetch = (async () => { throw new Error('must not be called'); }) as any;
  assert.equal(await fetchLiveScore(), null);
});

// ── daily feed determinism ───────────────────────────────────────────────────

test('feed build is deterministic for a seed and never duplicates ids', () => {
  const moves = Array.from({ length: 8 }, (_, i) => ({ id: `m${i}` })) as any[];
  const insights = Array.from({ length: 5 }, (_, i) => ({ id: `i${i}` })) as any[];
  const wins = Array.from({ length: 3 }, (_, i) => ({ id: `w${i}` })) as any[];
  const a = buildFeed(moves, insights, wins, 20260711);
  const b = buildFeed(moves, insights, wins, 20260711);
  assert.deepEqual(a.map(x => x.id), b.map(x => x.id));
  assert.equal(new Set(a.map(x => x.id)).size, a.length);
  assert.ok(a.some(x => x.type === 'beliefs'));
  const c = buildFeed(moves, insights, wins, 20260712);
  assert.notDeepEqual(a.map(x => x.id), c.map(x => x.id), 'fresh order tomorrow');
});
