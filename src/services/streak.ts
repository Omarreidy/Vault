import AsyncStorage from '@react-native-async-storage/async-storage';
import { postActivity } from './cohort';

const STREAK_KEY      = '@vault_streak_days';
const LAST_OPEN_KEY   = '@vault_last_open_date';

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

/** Call once on app open. Increments streak if this is a new day, resets if a day was skipped. */
export async function updateStreak(): Promise<number> {
  const today = toDateString(new Date());
  const [lastOpen, streakRaw] = await Promise.all([
    AsyncStorage.getItem(LAST_OPEN_KEY),
    AsyncStorage.getItem(STREAK_KEY),
  ]);

  const current = parseStreak(streakRaw, 0);

  if (lastOpen === today) return current; // already counted today

  const newStreak = lastOpen === yesterday() ? current + 1 : 1;

  await Promise.all([
    AsyncStorage.setItem(LAST_OPEN_KEY, today),
    AsyncStorage.setItem(STREAK_KEY, String(newStreak)),
  ]);

  // First open of the day that lands on a milestone — share it with the
  // cohort (best-effort; never blocks the streak update).
  if (STREAK_MILESTONES.includes(newStreak)) {
    postActivity(
      'streak_milestone',
      `Hit a ${newStreak}-day streak${newStreak >= 7 ? ' 🔥' : ''}`,
      `${newStreak} consecutive days of showing up.`,
    ).catch(() => {});
  }

  return newStreak;
}

/** Read current streak without modifying it. Returns 0 if streak is broken. */
export async function getStreak(): Promise<number> {
  const [lastOpen, streakRaw] = await Promise.all([
    AsyncStorage.getItem(LAST_OPEN_KEY),
    AsyncStorage.getItem(STREAK_KEY),
  ]);

  const today = toDateString(new Date());
  if (lastOpen !== today && lastOpen !== yesterday()) return 0;
  return parseStreak(streakRaw, 1);
}
