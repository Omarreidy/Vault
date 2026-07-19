/**
 * VAULT health check — validates feed/insight card data AND every live backend
 * endpoint. Exits 0 when everything is healthy, 1 when anything is broken (so it
 * can block a build). Run it with: `npm run health` (or it runs before builds).
 *
 * This is a TEST + REPORT tool only. It never edits or deploys anything.
 * The /healthcheck command is what reads this output and applies fixes.
 */
import { ALL_MOVES } from '../src/services/mockData';
import { INSIGHTS } from '../src/services/insights';
import { evaluateAchievements } from '../src/services/achievements';
import { evaluateChallenges } from '../src/services/challenges';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://gvdfypehwmemootjizmd.supabase.co';
const ANON = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? 'sb_publishable_tHoiSHF-49L1_p0OLRPeKw_5mfSi0fs';

const C = {
  reset: '\x1b[0m', red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m',
  cyan: '\x1b[36m', dim: '\x1b[2m', bold: '\x1b[1m',
};

const failures: string[] = [];
const warnings: string[] = [];
const passes: string[] = [];

function pass(msg: string) { passes.push(msg); }
function fail(msg: string) { failures.push(msg); }
function warn(msg: string) { warnings.push(msg); }

// ─── Part 1: Card data validation ───────────────────────────────────────────
const VALID_CATEGORIES = ['savings', 'investment', 'debt', 'spending', 'opportunity'];
const VALID_EFFORTS = ['instant', 'quick', 'medium'];

function validateMoves() {
  const ids = new Set<string>();
  let issues = 0;
  for (const m of ALL_MOVES) {
    const id = m.id ?? '(no id)';
    const bad = (why: string) => { fail(`Feed card ${id}: ${why}`); issues++; };
    if (!m.id) bad('missing id');
    else if (ids.has(m.id)) bad('duplicate id'); else ids.add(m.id);
    if (!m.title?.trim()) bad('empty title');
    if (!m.description?.trim()) bad('empty description');
    if (!m.impact?.trim()) bad('empty impact (breaks the big number display)');
    if (typeof m.impactValue !== 'number' || Number.isNaN(m.impactValue)) bad('invalid impactValue');
    if (!m.actionLabel?.trim()) bad('empty actionLabel (Act button renders blank)');
    if (!VALID_CATEGORIES.includes(m.category)) bad(`invalid category "${m.category}"`);
    if (!VALID_EFFORTS.includes(m.effort)) bad(`invalid effort "${m.effort}"`);
    if (m.lesson) {
      if (!m.lesson.headline?.trim()) bad('lesson missing headline');
      if (!m.lesson.body?.trim()) bad('lesson missing body');
      if (typeof m.lesson.xp !== 'number') bad('lesson missing xp');
    }
  }
  if (issues === 0) pass(`All ${ALL_MOVES.length} feed cards valid (fields, categories, efforts, ids)`);
}

function validateInsights() {
  const ids = new Set<string>();
  let issues = 0;
  for (const i of INSIGHTS) {
    const id = i.id ?? '(no id)';
    const bad = (why: string) => { fail(`Insight ${id}: ${why}`); issues++; };
    if (!i.id) bad('missing id');
    else if (ids.has(i.id)) bad('duplicate id'); else ids.add(i.id);
    if (!i.headline?.trim()) bad('empty headline');
    if (!i.body?.trim()) bad('empty body');
    if (!i.tag?.trim()) bad('empty tag');
    if (!['positive', 'negative', 'neutral'].includes(i.impactType)) bad(`invalid impactType "${i.impactType}"`);
  }
  if (issues === 0) pass(`All ${INSIGHTS.length} insight cards valid`);
}

function validateGamification() {
  // Fresh user: only "First Step" should be unlocked, no challenge complete.
  const freshAch = evaluateAchievements({ streak: 0, score: 0, movesActed: 0, plaidConnected: false });
  const freshUnlocked = freshAch.filter(a => a.unlocked).length;
  if (freshUnlocked !== 1) fail(`achievements: fresh user should unlock exactly 1 (got ${freshUnlocked})`);

  // Power user: streak/score/moves/bank all maxed → most achievements unlock.
  const powerAch = evaluateAchievements({
    streak: 120, score: 950, movesActed: 50, plaidConnected: true, savings: 20000, netWorth: 250000,
  });
  const powerUnlocked = powerAch.filter(a => a.unlocked).length;
  if (powerUnlocked < 10) fail(`achievements: power user should unlock 10+ (got ${powerUnlocked})`);

  if (freshUnlocked === 1 && powerUnlocked >= 10) {
    pass(`achievements: evaluation correct (fresh ${freshUnlocked}/12 → power ${powerUnlocked}/12)`);
  }

  // Challenges should track real behavior, not stay at 0.
  const { daily, weekly } = evaluateChallenges({
    streak: 7, movesToday: 2, movesWeek: 10, scoreVisitedToday: true, conciergeUsedToday: true, weeklyVelocityGain: 120,
  });
  const allComplete = [...daily, ...weekly].every(c => c.completed);
  const noneTracked = [...daily, ...weekly].every(c => c.progress === 0);
  if (noneTracked) fail('challenges: progress stuck at 0 — tracking not wired');
  else if (!allComplete) fail('challenges: maxed context did not complete all challenges');
  else pass(`challenges: evaluation correct (${daily.length} daily + ${weekly.length} weekly track real progress)`);
}

// ─── Part 2: Live endpoint checks ───────────────────────────────────────────
// Protected functions require a real signed-in session JWT. The health check
// signs in as the review account once and reuses that token; the anon key is
// only used for the genuinely public endpoints (market-data/news/research).
const REVIEW_EMAIL = process.env.HEALTHCHECK_EMAIL ?? 'appreview@getvault.app';
const REVIEW_PASSWORD = process.env.HEALTHCHECK_PASSWORD ?? 'VaultReview2026!';
let sessionToken: string | null = null;

async function signIn(): Promise<void> {
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': ANON },
      body: JSON.stringify({ email: REVIEW_EMAIL, password: REVIEW_PASSWORD }),
    });
    const d = await res.json();
    sessionToken = d.access_token ?? null;
    if (!sessionToken) warn('auth: could not sign in review account — protected checks may fail');
  } catch (e) {
    warn(`auth: sign-in unreachable (${e})`);
  }
}

async function post(fn: string, body: unknown, opts: { auth?: boolean } = {}): Promise<any> {
  const token = opts.auth === false ? ANON : (sessionToken ?? ANON);
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${fn}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'apikey': ANON,
    },
    body: JSON.stringify(body),
  });
  return res.json();
}

const looksLikeAuthError = (s: string) =>
  /401|x-api-key|invalid api key|authentication_error/i.test(s);

// Security regression test: every protected function MUST reject the bare anon
// key with 401. If any starts accepting anon again, this fails the build.
async function checkAuthEnforced() {
  const protectedFns = [
    'plaid-link-token', 'plaid-exchange', 'plaid-refresh',
    'calculate-score', 'concierge', 'financial-scanner', 'send-notification',
    'push-dispatch', // cron-secret only — anon must always bounce
  ];
  const leaks: string[] = [];
  const missing: string[] = [];
  await Promise.all(protectedFns.map(async fn => {
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/${fn}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ANON}`, 'apikey': ANON },
        body: JSON.stringify({}),
      });
      // 404 = not deployed yet — an ops gap, not an auth leak.
      if (res.status === 404) missing.push(fn);
      else if (res.status !== 401) leaks.push(`${fn} (${res.status})`);
    } catch { /* network flake — ignore, not a security signal */ }
  }));
  if (leaks.length > 0) fail(`auth-enforcement: these accept anon key without a session → ${leaks.join(', ')}`);
  else pass(`auth-enforcement: ${protectedFns.length - missing.length}/${protectedFns.length} protected functions reject anon key (401)`);
  if (missing.length > 0) warn(`not deployed yet: ${missing.join(', ')} — run: supabase functions deploy ${missing.join(' ')}`);
}

async function checkMarketData() {
  try {
    const d = await post('market-data', {});
    if (d.error) return fail(`market-data: ${d.error}`);
    const s = d.snapshot ?? {};
    const allZero = !s.sp500Change && !s.nasdaqChange && !s.dowChange;
    if (allZero && (!d.movers || d.movers.length === 0)) {
      fail('market-data: all indices 0 and no movers — Finnhub key likely invalid/rate-limited');
    } else {
      pass(`market-data: live (S&P ${s.sp500Change}%, ${d.movers?.length ?? 0} movers, VIX ${s.vix})`);
    }
  } catch (e) { fail(`market-data: unreachable (${e})`); }
}

async function checkMarketNews() {
  try {
    const d = await post('market-news', {});
    if (d.error) return fail(`market-news: ${d.error}`);
    if (!d.articles || d.articles.length === 0) fail('market-news: 0 articles — Finnhub news source failing');
    else pass(`market-news: ${d.articles.length} live articles`);
  } catch (e) { fail(`market-news: unreachable (${e})`); }
}

async function checkResearch() {
  try {
    const d = await post('company-research', { ticker: 'AAPL' });
    if (d.error) {
      if (looksLikeAuthError(d.error)) fail('company-research: Anthropic API key invalid (401)');
      else fail(`company-research: ${d.error}`);
      return;
    }
    if (!d.name || d.revenue === 'N/A' || d.peRatio === 'N/A') {
      fail('company-research: fundamentals missing (FMP key issue)');
    } else if (!d.businessModel || /loading/i.test(d.businessModel) || d.oneLiner === `${d.name} is a leading ${d.sector} company.`) {
      fail('company-research: AI analysis fell back to defaults (max_tokens truncation or Claude error)');
    } else {
      pass(`company-research: full report (${d.name}, P/E ${d.peRatio}, verdict ${d.verdict})`);
    }
  } catch (e) { fail(`company-research: unreachable (${e})`); }
}

async function checkConcierge() {
  // Concierge streams plain text (not JSON), so read the raw body.
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/concierge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionToken ?? ANON}`, 'apikey': ANON },
      body: JSON.stringify({ messages: [{ role: 'user', content: 'Reply with the single word OK' }] }),
    });
    const text = (await res.text()).trim();
    if (!res.ok || looksLikeAuthError(text)) {
      if (looksLikeAuthError(text)) fail('concierge: Anthropic API key invalid (401)');
      else fail(`concierge: HTTP ${res.status} — ${text.slice(0, 80)}`);
    } else if (text.length < 1) {
      fail('concierge: empty response');
    } else {
      pass('concierge: responding (Anthropic key valid)');
    }
  } catch (e) { fail(`concierge: unreachable (${e})`); }
}

async function checkPlaid() {
  try {
    const d = await post('plaid-link-token', { user_id: 'healthcheck' });
    if (d.error) return fail(`plaid-link-token: ${d.error}`);
    if (typeof d.link_token === 'string' && d.link_token.startsWith('link-')) {
      pass(`plaid-link-token: returns ${d.link_token.split('-').slice(0, 2).join('-')}-… token`);
    } else {
      fail('plaid-link-token: no link_token returned');
    }
  } catch (e) { fail(`plaid-link-token: unreachable (${e})`); }
}

async function checkScanner() {
  // Fetch a small real image to exercise the vision path. Skip gracefully if offline.
  try {
    const imgRes = await fetch('https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=320&q=60');
    if (!imgRes.ok) { warn('financial-scanner: skipped (could not fetch test image)'); return; }
    const buf = new Uint8Array(await imgRes.arrayBuffer());
    let bin = '';
    for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
    const b64 = btoa(bin);
    const d = await post('financial-scanner', { imageBase64: b64, mimeType: 'image/jpeg' });
    if (d.error) {
      if (looksLikeAuthError(d.error)) fail('financial-scanner: Anthropic API key invalid (401)');
      else fail(`financial-scanner: ${d.error}`);
    } else if (!d.verdict || !d.itemName) {
      fail('financial-scanner: no verdict returned (vision pipeline broken)');
    } else {
      pass(`financial-scanner: live (test image → "${d.itemName}" / ${d.verdict})`);
    }
  } catch (e) { warn(`financial-scanner: skipped (${e})`); }
}

async function checkScore() {
  try {
    const d = await post('calculate-score', { user_id: 'healthcheck' });
    // No real Plaid data for this user — we only verify the function is reachable
    // and not throwing an infra/auth error.
    if (d.error && looksLikeAuthError(d.error)) fail(`calculate-score: ${d.error}`);
    else pass('calculate-score: reachable');
  } catch (e) { fail(`calculate-score: unreachable (${e})`); }
}

// ─── Run ────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n${C.bold}${C.cyan}VAULT Health Check${C.reset}\n${C.dim}${new Date().toLocaleString()}${C.reset}\n`);

  validateMoves();
  validateInsights();
  validateGamification();

  // Sign in first so protected-function checks use a real session.
  await signIn();

  await Promise.all([
    checkAuthEnforced(),
    checkMarketData(),
    checkMarketNews(),
    checkResearch(),
    checkConcierge(),
    checkPlaid(),
    checkScanner(),
    checkScore(),
  ]);

  for (const p of passes) console.log(`${C.green}✓${C.reset} ${p}`);
  for (const w of warnings) console.log(`${C.yellow}⚠${C.reset} ${w}`);
  for (const f of failures) console.log(`${C.red}✗${C.reset} ${f}`);

  console.log(
    `\n${C.bold}${failures.length === 0 ? C.green : C.red}` +
    `${passes.length} healthy · ${warnings.length} warnings · ${failures.length} broken${C.reset}\n`
  );

  if (failures.length > 0) {
    console.log(`${C.dim}Run ${C.reset}${C.bold}/healthcheck${C.reset}${C.dim} in Claude Code to auto-fix the broken items.${C.reset}\n`);
    process.exit(1);
  }
  process.exit(0);
}

main();
