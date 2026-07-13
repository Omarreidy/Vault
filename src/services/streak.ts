import AsyncStorage from '@react-native-async-storage/async-storage';
import { postActivity } from './cohort';

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

export interface StreakResult {
  streak: number;
  /** True when this call moved the streak forward (first action of the day). */
  extended: boolean;
}

/**
 * Streaks reward ACTION, not attendance: call when the user completes a move.
 * The first completed move of a calendar day extends the streak; a day with
 * no completed moves breaks it. Idempotent within a day.
 */
export async function recordActionStreak(): Promise<StreakResult> {
  const today = toDateString(new Date());
  const [lastAction, streakRaw] = await Promise.all([
    AsyncStorage.getItem(LAST_ACTION_KEY),
    AsyncStorage.getItem(STREAK_KEY),
  ]);

  const current = parseStreak(streakRaw, 0);

  if (lastAction === today) return { streak: current, extended: false }; // already counted today

  const newStreak = lastAction === yesterday() ? current + 1 : 1;

  await Promise.all([
    AsyncStorage.setItem(LAST_ACTION_KEY, today),
    AsyncStorage.setItem(STREAK_KEY, String(newStreak)),
  ]);

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
  const [lastAction, streakRaw] = await Promise.all([
    AsyncStorage.getItem(LAST_ACTION_KEY),
    AsyncStorage.getItem(STREAK_KEY),
  ]);

  const today = toDateString(new Date());
  if (lastAction !== today && lastAction !== yesterday()) return 0;
  return parseStreak(streakRaw, 1);
}
