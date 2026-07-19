import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

/**
 * The one reader/writer for notification preferences. SettingsScreen, the
 * in-app notification feed, and the local push scheduler all consult this
 * module — previously each duplicated the storage key and could drift.
 *
 * Preferences live in two layers: AsyncStorage (fast, offline) and the
 * notification_prefs table (cross-device truth, read by the server
 * dispatcher). Settings writes through to both; on load, the server copy
 * wins so a change made on one device follows the member everywhere.
 */

export interface NotifPrefs {
  /** In-app "fresh moves" cards. */
  moves: boolean;
  /** Streak cards + the 5pm local daily reminder push. */
  streak: boolean;
  /** Score / tier progress cards. */
  score: boolean;
  /** Sunday-evening weekly recap push. */
  weekly: boolean;
  /** Market insight cards. */
  insight: boolean;
}

export const NOTIF_PREFS_KEY = '@vault_notif_prefs';

// insight defaults off — matches the original SettingsScreen defaults, so
// existing users' effective settings don't change under them.
export const DEFAULT_NOTIF_PREFS: NotifPrefs = {
  moves: true, streak: true, score: true, weekly: true, insight: false,
};

/** Pure parser (exported for tests): corrupt or partial JSON degrades to defaults. */
export function parseNotifPrefs(raw: string | null): NotifPrefs {
  if (!raw) return { ...DEFAULT_NOTIF_PREFS };
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return { ...DEFAULT_NOTIF_PREFS };
    return { ...DEFAULT_NOTIF_PREFS, ...parsed };
  } catch {
    return { ...DEFAULT_NOTIF_PREFS };
  }
}

export async function getNotifPrefs(): Promise<NotifPrefs> {
  try {
    return parseNotifPrefs(await AsyncStorage.getItem(NOTIF_PREFS_KEY));
  } catch {
    return { ...DEFAULT_NOTIF_PREFS };
  }
}

export async function setNotifPrefs(prefs: NotifPrefs): Promise<void> {
  try {
    await AsyncStorage.setItem(NOTIF_PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // Preferences must never crash Settings; worst case the old values stand.
  }
}

// ── Quiet hours + pause (server-enforced; mirrored locally) ─────────────────

export interface NotifMeta {
  /** Local hour (0-23) quiet window opens; may wrap midnight. */
  quietStart: number;
  /** Local hour the quiet window closes. */
  quietEnd: number;
  /** ISO instant server pushes stay suppressed until; null = active. */
  pausedUntil: string | null;
}

export const NOTIF_META_KEY = '@vault_notif_meta';

export const DEFAULT_NOTIF_META: NotifMeta = {
  quietStart: 22, quietEnd: 8, pausedUntil: null,
};

const clampHour = (v: unknown, fallback: number): number =>
  typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 23 ? v : fallback;

/** Pure parser (exported for tests) — corrupt storage degrades to defaults. */
export function parseNotifMeta(raw: string | null): NotifMeta {
  if (!raw) return { ...DEFAULT_NOTIF_META };
  try {
    const p = JSON.parse(raw);
    if (!p || typeof p !== 'object') return { ...DEFAULT_NOTIF_META };
    return {
      quietStart: clampHour(p.quietStart, 22),
      quietEnd: clampHour(p.quietEnd, 8),
      pausedUntil: typeof p.pausedUntil === 'string' ? p.pausedUntil : null,
    };
  } catch {
    return { ...DEFAULT_NOTIF_META };
  }
}

export function isPausedNow(meta: NotifMeta, now: Date = new Date()): boolean {
  if (!meta.pausedUntil) return false;
  const t = Date.parse(meta.pausedUntil);
  return Number.isFinite(t) && t > now.getTime();
}

export async function getNotifMeta(): Promise<NotifMeta> {
  try {
    return parseNotifMeta(await AsyncStorage.getItem(NOTIF_META_KEY));
  } catch {
    return { ...DEFAULT_NOTIF_META };
  }
}

export async function setNotifMeta(meta: NotifMeta): Promise<void> {
  try {
    await AsyncStorage.setItem(NOTIF_META_KEY, JSON.stringify(meta));
  } catch {}
}

// ── Cross-device sync ───────────────────────────────────────────────────────

/** Push the full preference set to notification_prefs (server dispatcher reads it). */
export async function syncPrefsToServer(prefs: NotifPrefs, meta: NotifMeta): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('notification_prefs').upsert({
      user_id: user.id,
      prefs,
      quiet_start: meta.quietStart,
      quiet_end: meta.quietEnd,
      paused_until: meta.pausedUntil,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
  } catch {
    // Offline is fine — local copy stands until the next successful sync.
  }
}

/** Server copy of the preferences, or null when none exists yet. */
export async function fetchServerPrefs(): Promise<{ prefs: NotifPrefs; meta: NotifMeta } | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data, error } = await supabase
      .from('notification_prefs')
      .select('prefs, quiet_start, quiet_end, paused_until')
      .eq('user_id', user.id)
      .maybeSingle();
    if (error || !data) return null;
    return {
      prefs: { ...DEFAULT_NOTIF_PREFS, ...(data.prefs && typeof data.prefs === 'object' ? data.prefs : {}) },
      meta: {
        quietStart: clampHour(data.quiet_start, 22),
        quietEnd: clampHour(data.quiet_end, 8),
        pausedUntil: typeof data.paused_until === 'string' ? data.paused_until : null,
      },
    };
  } catch {
    return null;
  }
}
