import { Platform, AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { buildWeeklyRecapBody } from './ritual';
import { getNotifPrefs, getNotifMeta, isPausedNow } from './notificationPrefs';
import { routeForNotification } from './notificationRouting';
import { navigateToTab } from '../navigation/navigationRef';
import { track, EVENTS } from './analytics';

// Must match app.json → extra.eas.projectId (required by getExpoPushTokenAsync).
const EAS_PROJECT_ID = '1bd77465-3a6e-4210-a447-faee867083cb';

const DAILY_REMINDER_ID = 'vault-daily-streak';
const WEEKLY_RECAP_ID   = 'vault-weekly-recap';

// Device-scoped memory of the last token we stored, so re-registration on
// every app open doesn't re-fire the analytics event.
const LAST_TOKEN_KEY = '@vault_last_push_token';

// expo-notifications is loaded lazily so the web export (Vercel) never
// bundles/executes native notification code.
function getNotifications(): any | null {
  if (Platform.OS === 'web') return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('expo-notifications');
  } catch {
    return null;
  }
}

/**
 * Full push setup, safe to call on every app start:
 * 1. Foreground display handler + Android channel
 * 2. Tap handling (warm + cold start) → deep link to the right tab
 * 3. Badge cleared on open and on every return to foreground
 * 4. Permission request → Expo push token → saved to profiles.push_token
 * 5. Daily reminder + weekly recap kept in sync with Settings toggles
 */
export async function initPushNotifications(): Promise<void> {
  const Notifications = getNotifications();
  if (!Notifications) return;

  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: false,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'VAULT',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    wireNotificationInteractions(Notifications);
    await clearBadge();
    await registerPushToken();
    await syncDailyReminder();
    await syncWeeklyRecap();
  } catch {
    // Never let notification setup break app launch.
  }
}

// Listeners are app-lifetime singletons; initPushNotifications re-runs on
// every sign-in, so guard against stacking duplicate subscriptions (which
// would double-navigate and double-count analytics on each tap).
let interactionsWired = false;

function wireNotificationInteractions(Notifications: any): void {
  if (interactionsWired) return;
  interactionsWired = true;

  // Tap while the app is running (foreground or backgrounded).
  Notifications.addNotificationResponseReceivedListener((response: any) => {
    handleNotificationResponse(response);
  });

  // Tap that cold-started the app: the listener above never fires for it.
  // Clear after handling so a later sign-out/sign-in doesn't replay it.
  Notifications.getLastNotificationResponseAsync()
    .then((response: any) => {
      if (!response) return;
      handleNotificationResponse(response);
      return Notifications.clearLastNotificationResponseAsync();
    })
    .catch(() => {});

  // APNs/FCM rotate device tokens at will — keep profiles.push_token current.
  Notifications.addPushTokenListener(() => {
    registerPushToken().catch(() => {});
  });

  // Returning to the app means the user has seen what the badge announced.
  AppState.addEventListener('change', state => {
    if (state === 'active') clearBadge().catch(() => {});
  });
}

function handleNotificationResponse(response: any): void {
  try {
    const request = response?.notification?.request;
    const screen = routeForNotification(request?.content?.data);
    track(EVENTS.NOTIF_OPENED, {
      source: 'push',
      screen,
      id: request?.identifier ?? null,
    }).catch(() => {});
    navigateToTab(screen);
  } catch {
    // A malformed payload must never crash the app on open.
  }
}

/** iOS badge is announcement state, not a counter — opening the app clears it. */
export async function clearBadge(): Promise<void> {
  const Notifications = getNotifications();
  if (!Notifications) return;
  try {
    await Notifications.setBadgeCountAsync(0);
  } catch {}
}

export type PushPermission = 'granted' | 'denied' | 'undetermined' | 'unavailable';

/** Real OS-level permission — Settings uses this so toggles never lie. */
export async function getPushPermission(): Promise<PushPermission> {
  const Notifications = getNotifications();
  if (!Notifications) return 'unavailable';
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status === 'granted' || status === 'denied' || status === 'undetermined') return status;
    return 'unavailable';
  } catch {
    return 'unavailable';
  }
}

/** Requests permission and stores the Expo push token on the user's profile. */
export async function registerPushToken(): Promise<string | null> {
  const Notifications = getNotifications();
  if (!Notifications) return null;

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Device = require('expo-device');
    if (!Device.isDevice) return null; // simulators can't receive push tokens

    const { status: existing } = await Notifications.getPermissionsAsync();
    let status = existing;
    if (existing !== 'granted') {
      const res = await Notifications.requestPermissionsAsync({
        ios: { allowAlert: true, allowBadge: true, allowSound: true },
      });
      status = res.status;
      // Only an actual prompt outcome is tracked — not the ambient status
      // check on every launch.
      track(EVENTS.PUSH_PERMISSION_RESULT, { granted: status === 'granted' }).catch(() => {});
    }
    if (status !== 'granted') return null;

    const { data: token } = await Notifications.getExpoPushTokenAsync({
      projectId: EAS_PROJECT_ID,
    });
    if (!token) return null;

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      // Timezone rides along so the server dispatcher can compute this
      // member's LOCAL hour for quiet hours and send windows.
      let timezone: string | null = null;
      try { timezone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? null; } catch {}
      const { error } = await supabase
        .from('profiles')
        .update(timezone ? { push_token: token, timezone } : { push_token: token })
        .eq('id', user.id);
      const prev = await AsyncStorage.getItem(LAST_TOKEN_KEY).catch(() => null);
      if (!error && prev !== token) {
        await AsyncStorage.setItem(LAST_TOKEN_KEY, token).catch(() => {});
        track(EVENTS.PUSH_TOKEN_REGISTERED, { rotated: prev != null }).catch(() => {});
      }
    }
    return token;
  } catch {
    return null;
  }
}

/**
 * Sign-out teardown. Must run BEFORE supabase.auth.signOut() — clearing
 * profiles.push_token needs the still-valid session (RLS: own row only).
 * Without this, the next account on this device inherits the previous
 * account's push channel — a cross-account leak of financial notifications.
 * Local reminders are cancelled too: a signed-out device has no streak.
 */
export async function teardownPushForSignOut(): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('profiles').update({ push_token: null }).eq('id', user.id);
    }
  } catch {}

  const Notifications = getNotifications();
  if (Notifications) {
    try {
      await Notifications.cancelScheduledNotificationAsync(DAILY_REMINDER_ID);
      await Notifications.cancelScheduledNotificationAsync(WEEKLY_RECAP_ID);
    } catch {}
  }

  try {
    await AsyncStorage.removeItem(LAST_TOKEN_KEY);
  } catch {}
}

/**
 * Keeps the daily streak reminder in sync with the Settings toggle.
 * Scheduling with a fixed identifier is idempotent — re-running replaces
 * the previous schedule instead of stacking duplicates.
 */
export async function syncDailyReminder(): Promise<void> {
  const Notifications = getNotifications();
  if (!Notifications) return;

  try {
    const [prefs, meta] = await Promise.all([getNotifPrefs(), getNotifMeta()]);
    if (!prefs.streak || isPausedNow(meta)) {
      await Notifications.cancelScheduledNotificationAsync(DAILY_REMINDER_ID);
      return;
    }

    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return;

    await Notifications.scheduleNotificationAsync({
      identifier: DAILY_REMINDER_ID,
      content: {
        title: '🔥 Protect your streak',
        body: "Today's wealth moves are ready. One move keeps your streak alive.",
        sound: 'default',
        data: { screen: 'daily_reminder' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 17,
        minute: 0,
      },
    });
  } catch {
    // non-fatal
  }
}

/**
 * Weekly velocity recap — "+12 pts this week — see what moved." Re-synced on
 * every app open with the latest weekly gain so the Sunday-evening delivery
 * carries current numbers. Fixed identifier keeps it idempotent; the Settings
 * "weekly" toggle controls it.
 */
export async function syncWeeklyRecap(weeklyGain?: number): Promise<void> {
  const Notifications = getNotifications();
  if (!Notifications) return;

  try {
    const [prefs, meta] = await Promise.all([getNotifPrefs(), getNotifMeta()]);
    if (!prefs.weekly || isPausedNow(meta)) {
      await Notifications.cancelScheduledNotificationAsync(WEEKLY_RECAP_ID);
      return;
    }

    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return;

    await Notifications.scheduleNotificationAsync({
      identifier: WEEKLY_RECAP_ID,
      content: {
        title: '✦ Your week in wealth',
        body: buildWeeklyRecapBody(weeklyGain),
        sound: 'default',
        data: { screen: 'weekly_recap' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: 1, // Sunday
        hour: 17,
        minute: 30,
      },
    });
  } catch {
    // non-fatal
  }
}
