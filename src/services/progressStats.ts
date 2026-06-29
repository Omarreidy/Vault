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
  dayStamp: string;            // YYYY-MM-DD of last daily window
  weekStamp: string;           // YYYY-MM-DD (Monday) of last weekly window
}

function todayStr(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

function mondayStr(d = new Date()): string {
  const day = d.getDay(); // 0 Sun .. 6 Sat
  const diff = day === 0 ? -6 : 1 - day; // shift back to Monday
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  return todayStr(monday);
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
    dayStamp: todayStr(),
    weekStamp: mondayStr(),
  };
}

/** Loads stats and applies daily/weekly resets if the calendar has moved on. */
export async function loadStats(): Promise<VaultStats> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    let s: VaultStats = raw ? { ...fresh(), ...JSON.parse(raw) } : fresh();

    const today = todayStr();
    const monday = mondayStr();
    let changed = false;

    if (s.dayStamp !== today) {
      s.movesActedToday = 0;
      s.scoreVisitedToday = false;
      s.conciergeUsedToday = false;
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

/** Weekly velocity gain (current score minus the snapshot taken at week start). */
export function weeklyVelocityGain(stats: VaultStats, currentScore: number): number {
  if (stats.weekStartScore === null) return 0;
  return Math.max(0, currentScore - stats.weekStartScore);
}
