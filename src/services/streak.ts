import AsyncStorage from '@react-native-async-storage/async-storage';
import { postActivity } from './cohort';
import { supabase, currentUserId } from './supabase';

// Storage keys predate the action-based streak — kept verbatim so streaks
// earned under the old "open the app" rule carry over seamlessly.
const STREAK_KEY      = '@vault_streak_days';
const LAST_ACTION_KEY = '@vault_last_open_date';

// Streak lengths worth announcing to the cohort.
const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100];

// Streak days are the DEVICE's local calendar days ('YYYY-MM-DD'). Using UTC
// here (toISOString) wrongly reset streaks for anyone west of UTC who opens
// the app in the evening — two consecutive local days can straddle a UTC day.
function toDateString(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

function yesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return toDateString(d);
}

// Corrupt storage must never become a NaN streak that persists forever.
function parseStreak(raw: string | null, fallback: number): number {
  const n = parseInt(raw ?? '', 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** A streak as stored in one place — device or server. */
interface StreakState {
  streak: number;
  lastAction: string | null;
}

export interface StreakResult {
  streak: number;
  /** True when this call moved the streak forward (first action of the day). */
  extended: boolean;
}

async function readLocal(): Promise<StreakState> {
  const [lastAction, streakRaw] = await Promise.all([
    AsyncStorage.getItem(LAST_ACTION_KEY),
    AsyncStorage.getItem(STREAK_KEY),
  ]);
  return { streak: parseStreak(streakRaw, 0), lastAction };
}

/**
 * The server copy, or null when signed out, offline, or the row is missing.
 * Never throws: a streak must still work on a plane.
 */
async function readRemote(): Promise<StreakState | null> {
  try {
    const uid = await currentUserId();
    if (!uid) return null;
    const { data, error } = await supabase
      .from('profiles')
      .select('streak_days, streak_last_action')
      .eq('id', uid)
      .maybeSingle();
    if (error || !data) return null;
    const n = Number(data.streak_days);
    return {
      streak: Number.isFinite(n) && n > 0 ? n : 0,
      lastAction: (data.streak_last_action as string | null) ?? null,
    };
  } catch {
    return null;
  }
}

async function writeLocal(state: StreakState): Promise<void> {
  await Promise.all([
    AsyncStorage.setItem(LAST_ACTION_KEY, state.lastAction ?? ''),
    AsyncStorage.setItem(STREAK_KEY, String(state.streak)),
  ]);
}

/** Best-effort: a failed sync must never cost the member their streak. */
async function writeRemote(state: StreakState): Promise<void> {
  try {
    const uid = await currentUserId();
    if (!uid) return;
    await supabase
      .from('profiles')
      .update({ streak_days: state.streak, streak_last_action: state.lastAction })
      .eq('id', uid);
  } catch {
    /* offline or signed out — the device copy is still correct */
  }
}

/**
 * Reconcile the two copies.
 *
 * The later `lastAction` wins, because it reflects genuinely more recent
 * activity — a device restored from an old backup must not drag a current
 * streak backwards. When both acted on the same day (the ordinary case, and
 * the first sync after installing this version) keep the LONGER streak so
 * upgrading never costs someone days they actually earned.
 */
function merge(local: StreakState, remote: StreakState | null): StreakState {
  if (!remote) return local;
  if (!local.lastAction) return remote;
  if (!remote.lastAction) return local;
  if (remote.lastAction > local.lastAction) return remote;
  if (local.lastAction > remote.lastAction) return local;
  return local.streak >= remote.streak ? local : remote;
}

/** A streak is live only while its last action was today or yesterday. */
function isLive(state: StreakState): boolean {
  return state.lastAction === toDateString(new Date()) || state.lastAction === yesterday();
}

/**
 * Streaks reward ACTION, not attendance: call when the user completes a move.
 * The first completed move of a calendar day extends the streak; a day with
 * no completed moves breaks it. Idempotent within a day.
 */
export async function recordActionStreak(): Promise<StreakResult> {
  const today = toDateString(new Date());
  const [local, remote] = await Promise.all([readLocal(), readRemote()]);
  const state = merge(local, remote);

  if (state.lastAction === today) {
    // Already counted today. Still push the merged value out so a device that
    // was behind converges rather than waiting for tomorrow's action.
    if (state.streak !== local.streak || state.lastAction !== local.lastAction) {
      await writeLocal(state);
      await writeRemote(state);
    }
    return { streak: state.streak, extended: false };
  }

  const newStreak = state.lastAction === yesterday() ? state.streak + 1 : 1;
  const next: StreakState = { streak: newStreak, lastAction: today };

  await writeLocal(next);
  await writeRemote(next);

  // First action of the day that lands on a milestone — share it with the
  // cohort (best-effort; never blocks the streak update).
  if (STREAK_MILESTONES.includes(newStreak)) {
    postActivity(
      'streak_milestone',
      `Hit a ${newStreak}-day streak${newStreak >= 7 ? ' 🔥' : ''}`,
      `${newStreak} consecutive days of real wealth moves.`,
    ).catch(() => {});
  }

  return { streak: newStreak, extended: true };
}

/** Read current streak without modifying it. Returns 0 if streak is broken. */
export async function getStreak(): Promise<number> {
  const [local, remote] = await Promise.all([readLocal(), readRemote()]);
  const state = merge(local, remote);
  if (!isLive(state)) return 0;
  return state.streak > 0 ? state.streak : 1;
}
