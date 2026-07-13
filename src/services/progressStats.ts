import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Central behavior tracker that powers real Challenges and Achievements.
 * Persists to AsyncStorage and auto-resets daily/weekly counters based on the
 * calendar so progress is accurate "every day, forever" with no server needed.
 */

const KEY = '@vault_stats_v1';

export interface VaultStats {
  movesActedTotal: number;     // lifetime moves taken
  movesActedToday: number;     // resets daily
  movesActedWeek: number;      // resets weekly (Mon)
  scoreVisitedToday: boolean;  // resets daily
  conciergeUsedToday: boolean; // resets daily
  xpTotal: number;             // lifetime XP
  xpWeek: number;              // resets weekly
  weekStartScore: number | null; // velocity score snapshot at start of week
  lastKnownScore: number | null; // most recent velocity score seen (any day)
  prevDayScore: number | null;   // lastKnownScore as of the last day rollover
  dayStamp: string;            // YYYY-MM-DD of last daily window
  weekStamp: string;           // YYYY-MM-DD (Monday) of last weekly window
}

// Daily/weekly windows follow the DEVICE's local calendar. toISOString (UTC)
// reset the daily counters at 7–8 pm for US users and could stamp the wrong
// Monday (local getDay combined with a UTC date string).
function todayStr(d = new Date()): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

function mondayStr(d = new Date()): string {
  const day = d.getDay(); // 0 Sun .. 6 Sat
  const diff = day === 0 ? -6 : 1 - day; // shift back to Monday
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  return todayStr(monday);
}

// Corrupt/legacy storage must never turn counters into NaN or strings
// (`"3" + 1` would concatenate). Coerce every numeric field on load.
function toCount(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
}

function fresh(): VaultStats {
  return {
    movesActedTotal: 0,
    movesActedToday: 0,
    movesActedWeek: 0,
    scoreVisitedToday: false,
    conciergeUsedToday: false,
    xpTotal: 0,
    xpWeek: 0,
    weekStartScore: null,
    lastKnownScore: null,
    prevDayScore: null,
    dayStamp: todayStr(),
    weekStamp: mondayStr(),
  };
}

/** Loads stats and applies daily/weekly resets if the calendar has moved on. */
export async function loadStats(): Promise<VaultStats> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    let s: VaultStats = raw ? { ...fresh(), ...JSON.parse(raw) } : fresh();
    s.movesActedTotal = toCount(s.movesActedTotal);
    s.movesActedToday = toCount(s.movesActedToday);
    s.movesActedWeek  = toCount(s.movesActedWeek);
    s.xpTotal = toCount(s.xpTotal);
    s.xpWeek  = toCount(s.xpWeek);
    if (s.weekStartScore !== null && !Number.isFinite(s.weekStartScore)) s.weekStartScore = null;
    if (s.lastKnownScore !== null && !Number.isFinite(s.lastKnownScore)) s.lastKnownScore = null;
    if (s.prevDayScore !== null && !Number.isFinite(s.prevDayScore)) s.prevDayScore = null;

    const today = todayStr();
    const monday = mondayStr();
    let changed = false;

    if (s.dayStamp !== today) {
      s.movesActedToday = 0;
      s.scoreVisitedToday = false;
      s.conciergeUsedToday = false;
      // Yesterday's closing score becomes today's comparison baseline.
      if (s.lastKnownScore !== null) s.prevDayScore = s.lastKnownScore;
      s.dayStamp = today;
      changed = true;
    }
    if (s.weekStamp !== monday) {
      s.movesActedWeek = 0;
      s.xpWeek = 0;
      s.weekStartScore = null; // re-snapshot on next score visit
      s.weekStamp = monday;
      changed = true;
    }

    if (changed) await AsyncStorage.setItem(KEY, JSON.stringify(s));
    return s;
  } catch {
    return fresh();
  }
}

async function save(s: VaultStats): Promise<VaultStats> {
  try { await AsyncStorage.setItem(KEY, JSON.stringify(s)); } catch {}
  return s;
}

export async function recordMove(xp = 0): Promise<VaultStats> {
  const s = await loadStats();
  s.movesActedTotal += 1;
  s.movesActedToday += 1;
  s.movesActedWeek += 1;
  s.xpTotal += xp;
  s.xpWeek += xp;
  return save(s);
}

/** Adds XP (e.g. a referral bonus) without counting a move. */
export async function addXP(xp: number): Promise<VaultStats> {
  const s = await loadStats();
  s.xpTotal += xp;
  s.xpWeek += xp;
  return save(s);
}

export async function recordScoreVisit(currentScore?: number): Promise<VaultStats> {
  const s = await loadStats();
  s.scoreVisitedToday = true;
  // Snapshot the score at the first visit of the week so we can measure weekly gain.
  if (s.weekStartScore === null && typeof currentScore === 'number') {
    s.weekStartScore = currentScore;
  }
  return save(s);
}

export async function recordConcierge(): Promise<VaultStats> {
  const s = await loadStats();
  s.conciergeUsedToday = true;
  return save(s);
}

/**
 * Records the latest velocity score for daily-delta tracking. The first score
 * ever seen becomes its own baseline (delta 0) so the Daily Open never shows
 * a fake jump on install day.
 */
export async function recordDailyScore(score: number): Promise<VaultStats> {
  const s = await loadStats();
  if (!Number.isFinite(score)) return s;
  if (s.prevDayScore === null && s.lastKnownScore === null) s.prevDayScore = score;
  s.lastKnownScore = score;
  // The weekly snapshot also anchors here so the recap works even for users
  // who never visit the Score tab.
  if (s.weekStartScore === null) s.weekStartScore = score;
  return save(s);
}

/** Velocity change since yesterday's baseline; null until a baseline exists. */
export function dailyDelta(stats: VaultStats, currentScore: number): number | null {
  if (stats.prevDayScore === null || !Number.isFinite(currentScore)) return null;
  return currentScore - stats.prevDayScore;
}

/** Weekly velocity gain (current score minus the snapshot taken at week start). */
export function weeklyVelocityGain(stats: VaultStats, currentScore: number): number {
  if (stats.weekStartScore === null) return 0;
  return Math.max(0, currentScore - stats.weekStartScore);
}
