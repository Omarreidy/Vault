import AsyncStorage from '@react-native-async-storage/async-storage';
import { getStreak } from './streak';
import { getTierFromScore, getNextTier, getPointsToNextTier } from './velocity';
import { TierName } from '../types';

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
  if (seconds < 60)    return 'just now';
  if (seconds < 3600)  return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

const NOTIFS_KEY      = '@vault_notifs_v2';
const DISMISSED_KEY   = '@vault_notifs_dismissed';
const LAST_GEN_KEY    = '@vault_notifs_generated_date';

function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

interface StoredNotif {
  id: string;
  type: NotifType;
  title: string;
  body: string;
  timestamp: string;
  read: boolean;
  icon: string;
  actionLabel?: string;
  value?: string;
}

function toVaultNotification(s: StoredNotif): VaultNotification {
  return { ...s, timestamp: new Date(s.timestamp) };
}

async function buildFreshNotifications(): Promise<VaultNotification[]> {
  const now = Date.now();
  const notifs: VaultNotification[] = [];

  // Streak
  const streak = await getStreak().catch(() => 0);
  if (streak >= 1) {
    const streakBody = streak >= 7
      ? `${streak} days in a row. You're in the top habit tier of VAULT members.`
      : streak >= 3
      ? `${streak} days straight. Building a wealth habit is how tiers get crossed.`
      : `Day ${streak}. Every day you open VAULT you're ahead of most people.`;
    notifs.push({
      id: `streak_${todayString()}`,
      type: 'streak',
      title: streak >= 7 ? `🔥 ${streak}-day streak — elite territory` : `🔥 Day ${streak} streak · Keep going`,
      body: streakBody,
      timestamp: new Date(now - 1000 * 60 * 5),
      read: false,
      icon: '🔥',
      value: `${streak}d`,
    });
  }

  // Onboarding score → tier progress and score notification
  try {
    const raw = await AsyncStorage.getItem('@vault_onboarding_result');
    if (raw) {
      const result = JSON.parse(raw);
      const score: number = result.score ?? 0;
      const tier = getTierFromScore(score) as TierName;
      const nextTier = getNextTier(tier);
      const pts = getPointsToNextTier(score);

      if (score > 0) {
        notifs.push({
          id: `score_${todayString()}`,
          type: 'score_up',
          title: `Your Vault score: ${score}`,
          body: `You're in the ${result.percentile ?? Math.round(score / 10)}th percentile. ${nextTier ? `${pts} points from ${nextTier} tier.` : "You’ve reached the top tier."}`,
          timestamp: new Date(now - 1000 * 60 * 30),
          read: false,
          icon: '◉',
          value: `${score}`,
        });
      }

      if (nextTier && pts > 0) {
        const daysEstimate = Math.ceil(pts / 15);
        notifs.push({
          id: `tier_${todayString()}`,
          type: 'tier_progress',
          title: `${nextTier} tier is ${pts} pts away`,
          body: `At your current pace, you'll hit ${nextTier} in roughly ${daysEstimate} day${daysEstimate !== 1 ? 's' : ''}. Stay consistent.`,
          timestamp: new Date(now - 1000 * 60 * 60 * 2),
          read: false,
          icon: '◇',
        });
      }
    }
  } catch {}

  // New moves — always available (feed refreshes daily)
  notifs.push({
    id: `moves_${todayString()}`,
    type: 'new_moves',
    title: 'Fresh wealth moves loaded',
    body: "Today's moves are ready. One could be worth $1,200+ to your bottom line this year.",
    timestamp: new Date(now - 1000 * 60 * 60 * 6),
    read: false,
    icon: '◈',
    actionLabel: 'See moves',
  });

  // Welcome for brand-new users (no streak, no score yet)
  if (streak === 0 && notifs.length === 1) {
    notifs.push({
      id: `welcome_${todayString()}`,
      type: 'insight',
      title: 'Welcome to VAULT',
      body: 'Your wealth intelligence feed is ready. Complete onboarding to unlock your Vault score and personalized moves.',
      timestamp: new Date(now - 1000 * 60 * 60 * 1),
      read: false,
      icon: '◈',
    });
  }

  return notifs;
}

export async function loadNotifications(): Promise<VaultNotification[]> {
  try {
    const [storedRaw, lastGenDate, dismissedRaw] = await Promise.all([
      AsyncStorage.getItem(NOTIFS_KEY),
      AsyncStorage.getItem(LAST_GEN_KEY),
      AsyncStorage.getItem(DISMISSED_KEY),
    ]);

    const dismissed: Set<string> = new Set(dismissedRaw ? JSON.parse(dismissedRaw) : []);
    const today = todayString();

    // If already generated today, return persisted list (with read state intact)
    if (lastGenDate === today && storedRaw) {
      const stored: StoredNotif[] = JSON.parse(storedRaw);
      return stored
        .filter(n => !dismissed.has(n.id))
        .map(toVaultNotification);
    }

    // Generate fresh for today
    const fresh = await buildFreshNotifications();
    const filtered = fresh.filter(n => !dismissed.has(n.id));

    const toStore: StoredNotif[] = filtered.map(n => ({
      ...n,
      timestamp: n.timestamp.toISOString(),
    }));

    await Promise.all([
      AsyncStorage.setItem(NOTIFS_KEY, JSON.stringify(toStore)),
      AsyncStorage.setItem(LAST_GEN_KEY, today),
    ]);

    return filtered;
  } catch {
    return [];
  }
}

export async function markNotificationRead(id: string): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(NOTIFS_KEY);
    if (!raw) return;
    const stored: StoredNotif[] = JSON.parse(raw);
    const updated = stored.map(n => n.id === id ? { ...n, read: true } : n);
    await AsyncStorage.setItem(NOTIFS_KEY, JSON.stringify(updated));
  } catch {}
}

export async function dismissNotification(id: string): Promise<void> {
  try {
    const [raw, dismissedRaw] = await Promise.all([
      AsyncStorage.getItem(NOTIFS_KEY),
      AsyncStorage.getItem(DISMISSED_KEY),
    ]);
    const dismissed: string[] = dismissedRaw ? JSON.parse(dismissedRaw) : [];
    if (!dismissed.includes(id)) dismissed.push(id);
    const tasks: Promise<void>[] = [AsyncStorage.setItem(DISMISSED_KEY, JSON.stringify(dismissed))];
    if (raw) {
      const stored: StoredNotif[] = JSON.parse(raw);
      tasks.push(AsyncStorage.setItem(NOTIFS_KEY, JSON.stringify(stored.filter(n => n.id !== id))));
    }
    await Promise.all(tasks);
  } catch {}
}

export async function getUnreadCount(): Promise<number> {
  try {
    const notifs = await loadNotifications();
    return notifs.filter(n => !n.read).length;
  } catch {
    return 0;
  }
}
