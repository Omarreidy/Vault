import { Platform } from 'react-native';
import { supabase } from './supabase';

export async function registerForPushNotifications(): Promise<string | null> {
  // Push notifications only work on native devices, not web
  if (Platform.OS === 'web') return null;

  try {
    const Notifications = await import('expo-notifications');
    const Device = await import('expo-device');

    if (!Device.isDevice) return null;

    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });

    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return null;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'VAULT',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#C9A96E',
      });
    }

    const token = (await Notifications.getExpoPushTokenAsync()).data;
    const { data: { user } } = await supabase.auth.getUser();
    if (user && token) {
      await supabase.from('profiles').update({ push_token: token }).eq('id', user.id);
    }
    return token;
  } catch {
    return null;
  }
}

export type NotifType =
  | 'score_up' | 'score_down' | 'tier_progress' | 'streak'
  | 'new_moves' | 'challenge_complete' | 'goal_milestone' | 'insight' | 'win';

export interface VaultNotification {
  id: string;
  type: NotifType;
  title: string;
  body: string;
  timestamp: Date;
  read: boolean;
  icon: string;
  actionLabel?: string;
  value?: string;
}

export function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60)   return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export const MOCK_NOTIFICATIONS: VaultNotification[] = [
  {
    id: 'n1', type: 'score_up',
    title: 'Your score jumped +47 pts',
    body: "Best week this month. You're now in the top 29% of Gold members.",
    timestamp: new Date(Date.now() - 1000 * 60 * 12),
    read: false, icon: '◉', value: '+47',
  },
  {
    id: 'n2', type: 'new_moves',
    title: '5 new wealth moves waiting',
    body: 'Fresh moves based on your accounts. One of them is worth $1,200+.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
    read: false, icon: '◈', actionLabel: 'See moves',
  },
  {
    id: 'n3', type: 'streak',
    title: "Day 23. Don't break it.",
    body: "You're 7 days from your longest streak ever.",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5),
    read: false, icon: '🔥', value: '23d',
  },
  {
    id: 'n4', type: 'tier_progress',
    title: 'Platinum is 53 points away',
    body: "At your current pace you'll hit Platinum in 8 days.",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 14),
    read: true, icon: '◇',
  },
];
