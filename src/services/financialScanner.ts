export type ScanVerdict = 'ASSET' | 'LIABILITY' | 'BUDGET CHECK';

export interface ScanResult {
  id: string;
  verdict: ScanVerdict;
  itemName: string;
  emoji: string;
  tagline: string;
  monthlyCost?: string;
  annualImpact: string;
  wealthScoreImpact: string;
  insight: string;
  tip: string;
  xp: number;
}

export const VERDICT_COLORS: Record<ScanVerdict, string> = {
  'ASSET':        '#7EB8A4',
  'LIABILITY':    '#C97A6E',
  'BUDGET CHECK': '#C9A96E',
};

export const VERDICT_ICONS: Record<ScanVerdict, string> = {
  'ASSET':        '◆',
  'LIABILITY':    '◉',
  'BUDGET CHECK': '◇',
};

// Mock scan results — cycles through on each scan in demo mode
export const MOCK_SCAN_RESULTS: ScanResult[] = [
  {
    id: 'sr1',
    verdict: 'LIABILITY',
    itemName: 'Dining Out',
    emoji: '🍽️',
    tagline: 'Enjoyable today. Expensive over time.',
    monthlyCost: '$65–120 per visit',
    annualImpact: '−$2,400/yr avg for your spending tier',
    wealthScoreImpact: '−3 pts if over budget',
    insight: 'Dining is the #1 discretionary spend that separates average savers from wealth builders. The national average is $350/month — most people in this category spend 30–40% more without realizing it.',
    tip: 'Set a monthly dining target and track it. Redirecting even $100/mo to savings is $1,200/yr working for you instead of a restaurant.',
    xp: 15,
  },
  {
    id: 'sr2',
    verdict: 'LIABILITY',
    itemName: 'New iPhone / Smartphone',
    emoji: '📱',
    tagline: 'Loses 20% of value the moment you open it.',
    monthlyCost: '$50–80/mo on payment plan',
    annualImpact: '−$800 in depreciation in year one',
    wealthScoreImpact: '−5 pts if financed',
    insight: 'Smartphones depreciate 40–60% in two years. Financing one at 0% APR still locks up cash flow that could be compounding. Flagship phones are a status purchase disguised as a necessity.',
    tip: 'Buy refurbished (1 generation back) and invest the $400 difference. Over 5 years that\'s $590 compounded.',
    xp: 15,
  },
  {
    id: 'sr3',
    verdict: 'BUDGET CHECK',
    itemName: 'Coffee / Café Visit',
    emoji: '☕',
    tagline: 'Not the problem people think — but it adds up.',
    monthlyCost: '$80–120/mo if daily habit',
    annualImpact: '$1,200/yr for a daily $5 habit',
    wealthScoreImpact: 'Neutral if within budget',
    insight: 'The "latte factor" is overblown as a wealth killer — but $1,200/yr is still real money. The question isn\'t whether to cut it, it\'s whether it\'s intentional.',
    tip: 'Keep it if it brings value. But log it — most people spending $120/mo think they\'re spending $40.',
    xp: 10,
  },
  {
    id: 'sr4',
    verdict: 'LIABILITY',
    itemName: 'Car / Vehicle',
    emoji: '🚗',
    tagline: 'The most expensive depreciating asset most people own.',
    monthlyCost: '$800–1,200/mo all-in (payment + insurance + gas + maintenance)',
    annualImpact: '−$10,000–$15,000/yr true cost',
    wealthScoreImpact: '−12 pts if over 15% of take-home',
    insight: 'Cars are the single biggest wealth destroyer in most household budgets. The average American spends $10,728/yr on their vehicle. That same money invested over 20 years = $430,000.',
    tip: 'If you must buy, buy used (2–3 years old) and pay cash. Lease only if you need a write-off. Never finance a depreciating asset at more than 3% of your annual income.',
    xp: 15,
  },
  {
    id: 'sr5',
    verdict: 'ASSET',
    itemName: 'Investment / Brokerage Account',
    emoji: '📈',
    tagline: 'Money making money. This is the game.',
    annualImpact: '+7–10% avg annual return (S&P 500 historical)',
    wealthScoreImpact: '+8 pts for active investing habit',
    insight: 'Every dollar invested today doubles roughly every 7 years at 10% return. A $10,000 investment at 30 is worth $174,000 at 65. This is exactly where your money should be working.',
    tip: 'Make sure your expense ratios are under 0.10%. High-fee funds silently drain 30–40% of your long-term gains.',
    xp: 20,
  },
  {
    id: 'sr6',
    verdict: 'ASSET',
    itemName: 'Book / Educational Material',
    emoji: '📚',
    tagline: 'Highest ROI purchase you can make.',
    monthlyCost: '$15–30',
    annualImpact: 'Uncapped — one idea can change your income trajectory',
    wealthScoreImpact: '+2 pts for learning habit',
    insight: 'Warren Buffett reads 500 pages a day. The wealthy spend 5x more on education than entertainment. A single book has historically been worth thousands in applied knowledge.',
    tip: 'Prioritize books on negotiation, investing, and compounding. The return on a $20 book that teaches you to negotiate a $5K raise is 25,000%.',
    xp: 20,
  },
  {
    id: 'sr7',
    verdict: 'LIABILITY',
    itemName: 'Designer Clothing / Luxury Item',
    emoji: '👟',
    tagline: 'Buys status. Sells for cents on the dollar.',
    monthlyCost: 'One-time: $200–2,000+',
    annualImpact: '−60–80% value within 1 year',
    wealthScoreImpact: '−4 pts if impulse purchase',
    insight: 'Luxury goods depreciate faster than most people realize — resale values often drop to a fraction within a year. You\'re paying a premium to borrow status you don\'t own.',
    tip: 'If you want luxury, buy pre-owned (60% off) or wait for it as a reward milestone. Let your net worth be your status signal, not your shoes.',
    xp: 15,
  },
  {
    id: 'sr8',
    verdict: 'BUDGET CHECK',
    itemName: 'Gym / Fitness Membership',
    emoji: '🏋️',
    tagline: 'Asset if you use it. Liability if you don\'t.',
    monthlyCost: '$30–200/mo',
    annualImpact: 'Up to $2,400/yr for unused premium gyms',
    wealthScoreImpact: '+3 pts if active · −3 pts if ghost member',
    insight: 'The average gym member visits 1.7x/week. If you\'re going less than 3x/week, your cost-per-visit math doesn\'t work. Health is an asset — overpaying for it isn\'t.',
    tip: 'Calculate your true cost per visit. Under $5/visit = good value. Over $15/visit = you\'re a gym donor. Consider a $25/mo Planet Fitness + free outdoor alternatives.',
    xp: 10,
  },
  {
    id: 'sr9',
    verdict: 'ASSET',
    itemName: 'Real Estate / Property',
    emoji: '🏡',
    tagline: 'Long-term asset — but not a simple one.',
    annualImpact: '+3–5% avg appreciation + equity build',
    wealthScoreImpact: '+10 pts for home ownership milestone',
    insight: 'Real estate is the most accessible wealth-building vehicle for most people. But the true value is in forced savings (equity), not just appreciation. Transaction costs mean you need 5+ years to break even.',
    tip: 'Treat your home as a long-term hold, not a flip. Your primary residence isn\'t an investment — it\'s a place to live that also builds equity. True investment real estate is rental income.',
    xp: 20,
  },
  {
    id: 'sr10',
    verdict: 'LIABILITY',
    itemName: 'Subscription Service',
    emoji: '📺',
    tagline: 'Small leaks sink big ships.',
    monthlyCost: '$10–20/mo per service',
    annualImpact: '10 subscriptions = $1,800/yr quietly leaving',
    wealthScoreImpact: '−2 pts per unused subscription',
    insight: 'The average American pays for 4.5 subscriptions they forgot about. Each one feels like "just $15" — but $15 × 12 × 10 years = $1,800 that could have compounded to $2,900.',
    tip: 'Do an annual subscription audit. Cancel anything you haven\'t used in 30 days. The friction of re-subscribing is worth $180/yr per service.',
    xp: 15,
  },
];

import { supabase, functionAuthHeaders } from './supabase';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://gvdfypehwmemootjizmd.supabase.co';

// ─── Failure taxonomy ─────────────────────────────────────────────────────────
// Every way a scan can fail maps to exactly one reason, so the UI can tell
// "you're offline" from "try again in a minute" from "our end is down".

export type ScanFailureReason =
  | 'offline'          // device can't reach the network
  | 'auth'             // no session / session expired
  | 'rate_limited'     // server said slow down (429)
  | 'image_too_large'  // payload over the analyzable cap even after compression
  | 'image_unreadable' // the photo couldn't be processed on-device
  | 'unavailable';     // our side (or every AI provider) failed

export class ScanError extends Error {
  reason: ScanFailureReason;
  /** True only for transport-level blips worth one client-side retry. The
   *  server already retries and falls back across providers before returning
   *  503, so a 503 is final — re-running the whole chain would just double
   *  the wait for the same answer. */
  transient: boolean;
  constructor(reason: ScanFailureReason, message?: string, transient = false) {
    super(message ?? reason);
    this.name = 'ScanError';
    this.reason = reason;
    this.transient = transient;
  }
}

export const SCAN_ERROR_COPY: Record<ScanFailureReason, {
  title: string;
  body: string;
  /** Whether retrying the same photo can plausibly succeed. */
  canRetrySameImage: boolean;
}> = {
  offline: {
    title: "You're offline",
    body: "VAULT can't reach the network. Check your connection, then try again.",
    canRetrySameImage: true,
  },
  auth: {
    title: 'Session expired',
    body: 'Your session has expired. Sign in again to keep scanning.',
    canRetrySameImage: false,
  },
  rate_limited: {
    title: 'Easy does it',
    body: "You've hit the scan limit for now. Give it a minute, then try again.",
    canRetrySameImage: true,
  },
  image_too_large: {
    title: 'Image too large',
    body: "This image couldn't be compressed enough to analyze. Retake the photo from a bit further back.",
    canRetrySameImage: false,
  },
  image_unreadable: {
    title: "Couldn't read that photo",
    body: "The image couldn't be processed on this device. Retake it or pick a different one.",
    canRetrySameImage: false,
  },
  unavailable: {
    title: 'Analysis is temporarily down',
    body: "Your photo is fine — our analysis engine didn't respond. Try again in a few minutes.",
    canRetrySameImage: true,
  },
};

// Mirrors the server's MAX_IMAGE_B64_LEN so an oversized payload is caught
// before burning the user's bandwidth on a doomed upload.
const MAX_IMAGE_B64_LEN = 7_000_000;
// The server's provider chain is budgeted at 60s worst-case; give it headroom.
const REQUEST_TIMEOUT_MS = 75_000;

interface ScanOptions {
  retryDelayMs?: number; // injectable for tests
}

export async function scanDocument(imageUri: string, opts: ScanOptions = {}): Promise<ScanResult> {
  const { retryDelayMs = 700 } = opts;

  // No session means a guaranteed 401 — surface it without a network round trip.
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new ScanError('auth', 'no active session');

  const base64 = await renderScanImage(imageUri);
  if (base64.length > MAX_IMAGE_B64_LEN) throw new ScanError('image_too_large');

  const headers = await functionAuthHeaders();

  // One retry, only for transient transport failures (network blip, cold-start
  // 5xx). Deterministic failures (401/413/429/503) surface immediately.
  let lastError = new ScanError('unavailable');
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      return await postScan(base64, headers);
    } catch (err) {
      lastError = err instanceof ScanError ? err : new ScanError('unavailable', String(err));
      if (!lastError.transient || attempt === 2) throw lastError;
      await new Promise(r => setTimeout(r, retryDelayMs * attempt));
    }
  }
  throw lastError;
}

async function renderScanImage(imageUri: string): Promise<string> {
  try {
    // Lazy-require the native image module so it loads only when a scan actually
    // runs — never at app launch. A top-level import would pull the native module
    // into the startup path, and any issue there crashes the app before it opens.
    const { ImageManipulator, SaveFormat } = require('expo-image-manipulator');

    // Compress + downscale before upload. Full-res phone photos produce multi-MB
    // base64 payloads that exceed the model's image limit and cause 500s — which
    // is what was silently triggering the fake mock fallback.
    const context = ImageManipulator.manipulate(imageUri);
    context.resize({ width: 1024 });
    const rendered = await context.renderAsync();
    const image = await rendered.saveAsync({
      compress: 0.7,
      format: SaveFormat.JPEG,
      base64: true,
    });
    if (!image.base64) throw new Error('no base64 in rendered image');
    return image.base64;
  } catch (err) {
    throw new ScanError('image_unreadable', String((err as Error)?.message ?? err));
  }
}

async function postScan(base64: string, headers: Record<string, string>): Promise<ScanResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(`${SUPABASE_URL}/functions/v1/financial-scanner`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ imageBase64: base64, mimeType: 'image/jpeg' }),
      signal: controller.signal,
    });
  } catch (err) {
    // We already waited the full window on a timeout — don't retry that. A
    // straight fetch throw is RN's "Network request failed": offline, but
    // transient enough to be worth one quick retry before telling the user.
    if ((err as Error)?.name === 'AbortError') throw new ScanError('unavailable', 'request timed out');
    throw new ScanError('offline', String((err as Error)?.message ?? err), true);
  } finally {
    clearTimeout(timer);
  }

  let data: any = null;
  try { data = await res.json(); } catch { /* non-JSON body; handled below */ }

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) throw new ScanError('auth', `http ${res.status}`);
    if (res.status === 429) throw new ScanError('rate_limited');
    if (res.status === 413 || data?.error === 'image_too_large') throw new ScanError('image_too_large');
    const transient = res.status === 500 || res.status === 502 || res.status === 504;
    throw new ScanError('unavailable', data?.error ?? `http ${res.status}`, transient);
  }
  if (!data || data.error || typeof data.verdict !== 'string') {
    throw new ScanError('unavailable', data?.error ?? 'malformed response');
  }
  return { ...data, id: Date.now().toString() } as ScanResult;
}

// Kept for fallback only
let scanIndex = 0;
export function getMockScanResult(): ScanResult {
  const result = MOCK_SCAN_RESULTS[scanIndex % MOCK_SCAN_RESULTS.length];
  scanIndex++;
  return result;
}
