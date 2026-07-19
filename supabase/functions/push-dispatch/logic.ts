// Pure decision logic for the push dispatcher — no Deno/network imports so
// every rule that decides whether a member gets pushed is unit-testable
// (tests/notification-dispatch.test.ts). The Deno entrypoint (index.ts) only
// does I/O around these functions.

export interface ServerPrefs {
  prefs: Record<string, unknown>;
  quiet_start: number;
  quiet_end: number;
  paused_until: string | null;
}

export const DEFAULT_SERVER_PREFS: ServerPrefs = {
  prefs: {},
  quiet_start: 22,
  quiet_end: 8,
  paused_until: null,
};

/** Member's local hour (0-23) for an IANA zone; bad/missing zones fall back to ET. */
export function localHour(now: Date, timezone: string | null | undefined): number {
  const tz = timezone || 'America/New_York';
  try {
    const h = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric', hour12: false, timeZone: tz,
    }).format(now);
    const n = parseInt(h, 10);
    return Number.isFinite(n) ? n % 24 : 12;
  } catch {
    return localHour(now, 'America/New_York');
  }
}

/** Quiet window may wrap midnight (default 22 → 8). start===end disables it. */
export function inQuietHours(hour: number, start: number, end: number): boolean {
  if (start === end) return false;
  if (start < end) return hour >= start && hour < end;
  return hour >= start || hour < end;
}

export function isPaused(pausedUntil: string | null, now: Date): boolean {
  if (!pausedUntil) return false;
  const t = Date.parse(pausedUntil);
  return Number.isFinite(t) && t > now.getTime();
}

/**
 * Learned best send hour: the member's modal activity hour from their own
 * analytics events (already converted to their local hour). No events → 18
 * (early evening — the app's strongest ritual window). Quiet-hour clamping
 * happens separately in canSendNow.
 */
export function bestSendHour(eventLocalHours: number[]): number {
  if (eventLocalHours.length === 0) return 18;
  const counts = new Map<number, number>();
  for (const h of eventLocalHours) {
    if (!Number.isFinite(h)) continue;
    const hh = ((h % 24) + 24) % 24;
    counts.set(hh, (counts.get(hh) ?? 0) + 1);
  }
  if (counts.size === 0) return 18;
  let best = 18, bestCount = -1;
  for (const [h, c] of counts) {
    if (c > bestCount || (c === bestCount && h < best)) { best = h; bestCount = c; }
  }
  return best;
}

/** Behavioral sends fire only near the member's learned hour (±1). */
export function withinSendWindow(hour: number, best: number): boolean {
  const diff = Math.abs(hour - best);
  return Math.min(diff, 24 - diff) <= 1;
}

/** Global frequency cap: at most one server push per member per ~day. */
export function underDailyCap(lastSentAtIso: string | null, now: Date): boolean {
  if (!lastSentAtIso) return true;
  const t = Date.parse(lastSentAtIso);
  if (!Number.isFinite(t)) return true;
  return now.getTime() - t >= 20 * 60 * 60 * 1000;
}

// Which client toggle governs each server category. premium_welcome is
// membership-transactional and only honors the global pause.
const CATEGORY_TOGGLE: Record<string, string | null> = {
  dormant_7:       'moves',
  dormant_30:      'moves',
  tier_up:         'score',
  premium_welcome: null,
};

export function categoryEnabled(category: string, prefs: Record<string, unknown>): boolean {
  const toggle = CATEGORY_TOGGLE[category] ?? null;
  if (!toggle) return true;
  return prefs[toggle] !== false; // missing key = default on
}

export interface SendGate {
  category: string;
  now: Date;
  timezone: string | null;
  serverPrefs: ServerPrefs;
  lastSentAtIso: string | null;
  eventLocalHours: number[];
}

/** The one gate every server push passes before Expo is contacted. */
export function canSendNow(gate: SendGate): boolean {
  const { category, now, timezone, serverPrefs, lastSentAtIso, eventLocalHours } = gate;
  if (isPaused(serverPrefs.paused_until, now)) return false;
  if (!categoryEnabled(category, serverPrefs.prefs)) return false;

  const hour = localHour(now, timezone);
  if (inQuietHours(hour, serverPrefs.quiet_start, serverPrefs.quiet_end)) return false;
  if (!underDailyCap(lastSentAtIso, now)) return false;
  return withinSendWindow(hour, bestSendHour(eventLocalHours));
}

// ── Tier progression ────────────────────────────────────────────────────────

// Mirrors constants/theme.ts TIERS ordering (server is authoritative for tier).
export const TIER_ORDER = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'BLACK'];

export function tierRank(tier: string): number {
  return TIER_ORDER.indexOf(tier);
}

/**
 * Notify only genuine upward movement: current tier must outrank every tier
 * already congratulated. A downgrade (score recomputation) never notifies,
 * and re-crossing a boundary can't re-fire — no shame, no spam.
 */
export function shouldNotifyTier(currentTier: string, notifiedTiers: string[]): boolean {
  const rank = tierRank(currentTier);
  if (rank <= 0) return false; // unknown tier or BRONZE baseline
  return notifiedTiers.every(t => tierRank(t) < rank);
}

// ── Dedupe keys ─────────────────────────────────────────────────────────────

/** ISO-8601 week label, e.g. '2026-W29' — weekly dedupe periods. */
export function isoWeek(d: Date): string {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

export function monthKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function dedupeKeyFor(category: string, now: Date, tier?: string): string {
  switch (category) {
    case 'dormant_7':       return `dormant7:${isoWeek(now)}`;
    case 'dormant_30':      return `dormant30:${monthKey(now)}`;
    case 'tier_up':         return `tier:${tier}`;
    case 'premium_welcome': return 'premium_welcome';
    default:                return `${category}:${isoWeek(now)}`;
  }
}

// ── Copy variation ──────────────────────────────────────────────────────────

/**
 * Deterministic variant pick: stable for (user, period) so retries resend the
 * SAME text, but rotates across periods so repeat sends don't repeat wording.
 */
export function pickVariant(userId: string, periodKey: string, count: number): number {
  if (count <= 1) return 0;
  const s = `${userId}:${periodKey}`;
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h % count;
}

// ── Expo receipt classification ─────────────────────────────────────────────

export type ReceiptOutcome = 'delivered' | 'device_gone' | 'retry' | 'dead';

export function classifyReceipt(
  receipt: { status?: string; details?: { error?: string } } | undefined,
  attempts: number,
): ReceiptOutcome {
  if (!receipt) return attempts >= 3 ? 'dead' : 'retry'; // receipt evaporated
  if (receipt.status === 'ok') return 'delivered';
  if (receipt.details?.error === 'DeviceNotRegistered') return 'device_gone';
  return attempts >= 3 ? 'dead' : 'retry';
}

export function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}
