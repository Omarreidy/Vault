import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

// Must match app.json → extra.eas.projectId (required by getExpoPushTokenAsync).
const EAS_PROJECT_ID = '1bd77465-3a6e-4210-a447-faee867083cb';

// Same key SettingsScreen persists its notification toggles under.
const NOTIF_PREFS_KEY = '@vault_notif_prefs';

const DAILY_REMINDER_ID = 'vault-daily-streak';

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
 * 1. Foreground display handler
 * 2. Android notification channel
 * 3. Permission request → Expo push token → saved to profiles.push_token
 * 4. Daily streak reminder (respects the Settings toggle)
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

    await registerPushToken();
    await syncDailyReminder();
  } catch {
    // Never let notification setup break app launch.
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
    }
    if (status !== 'granted') return null;

    const { data: token } = await Notifications.getExpoPushTokenAsync({
      projectId: EAS_PROJECT_ID,
    });
    if (!token) return null;

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('profiles').update({ push_token: token }).eq('id', user.id);
    }
    return token;
  } catch {
    return null;
  }
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
    let streakOn = true;
    try {
      const raw = await AsyncStorage.getItem(NOTIF_PREFS_KEY);
      if (raw) streakOn = JSON.parse(raw).streak !== false;
    } catch {}

    if (!streakOn) {
      await Notifications.cancelScheduledNotificationAsync(DAILY_REMINDER_ID);
      return;
    }

    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return;

    await Notifications.scheduleNotificationAsync({
      identifier: DAILY_REMINDER_ID,
      content: {
        title: '🔥 Protect your streak',
        body: "Today's wealth moves are ready. One open keeps your streak alive.",
        sound: 'default',
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
