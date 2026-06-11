import AsyncStorage from '@react-native-async-storage/async-storage';

const STREAK_KEY      = '@vault_streak_days';
const LAST_OPEN_KEY   = '@vault_last_open_date';

function toDateString(d: Date): string {
  return d.toISOString().slice(0, 10); // 'YYYY-MM-DD'
}

function yesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return toDateString(d);
}

/** Call once on app open. Increments streak if this is a new day, resets if a day was skipped. */
export async function updateStreak(): Promise<number> {
  const today = toDateString(new Date());
  const [lastOpen, streakRaw] = await Promise.all([
    AsyncStorage.getItem(LAST_OPEN_KEY),
    AsyncStorage.getItem(STREAK_KEY),
  ]);

  const current = parseInt(streakRaw ?? '0', 10);

  if (lastOpen === today) return current; // already counted today

  const newStreak = lastOpen === yesterday() ? current + 1 : 1;

  await Promise.all([
    AsyncStorage.setItem(LAST_OPEN_KEY, today),
    AsyncStorage.setItem(STREAK_KEY, String(newStreak)),
  ]);

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
  return parseInt(streakRaw ?? '1', 10);
}
