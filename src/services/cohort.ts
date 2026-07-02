import { supabase } from './supabase';

/**
 * Real cohort social layer backed by Supabase.
 * Activity rows are written by members as they act; reads go through
 * the get_cohort_feed RPC which anonymizes names ("First L.") and
 * aggregates reaction counts server-side.
 */

export type ActivityType =
  | 'move_complete'
  | 'streak_milestone'
  | 'tier_progress'
  | 'net_worth_badge'
  | 'goal_hit'
  | 'challenge_complete'
  | 'joined';

export type ReactionKey = 'locked_in' | 'building' | 'witnessed';

export interface Reaction {
  key: ReactionKey;
  label: string;
  emoji: string;
  count: number;
  reacted: boolean;
}

export const REACTION_META: { key: ReactionKey; label: string; emoji: string }[] = [
  { key: 'locked_in', label: 'Locked In', emoji: '🔒' },
  { key: 'building',  label: 'Building',  emoji: '📈' },
  { key: 'witnessed', label: 'Witnessed', emoji: '👁' },
];

export const ACTIVITY_ICONS: Record<ActivityType, string> = {
  move_complete:      '◈',
  streak_milestone:   '🔥',
  tier_progress:      '◇',
  net_worth_badge:    '◉',
  goal_hit:           '🛡',
  challenge_complete: '◆',
  joined:             '✦',
};

export interface CohortActivityItem {
  id: string;
  memberName: string;
  isMe: boolean;
  type: ActivityType;
  headline: string;
  sub?: string;
  xp?: number;
  minutesAgo: number;
  reactions: Reaction[];
}

export function timeAgoShort(minutes: number): string {
  if (minutes < 1)    return 'now';
  if (minutes < 60)   return `${Math.floor(minutes)}m`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h`;
  return `${Math.floor(minutes / 1440)}d`;
}

export async function fetchCohortFeed(limit = 40): Promise<CohortActivityItem[] | null> {
  const { data, error } = await supabase.rpc('get_cohort_feed', { feed_limit: limit });
  if (error || !Array.isArray(data)) return null;

  return data.map((row: any) => {
    const mine: string[] = row.my_reactions ?? [];
    const counts: Record<ReactionKey, number> = {
      locked_in: row.locked_in ?? 0,
      building:  row.building ?? 0,
      witnessed: row.witnessed ?? 0,
    };
    return {
      id: row.id,
      memberName: row.member_name ?? 'Vault member',
      isMe: !!row.is_me,
      type: row.activity_type as ActivityType,
      headline: row.headline,
      sub: row.sub ?? undefined,
      xp: row.xp ?? undefined,
      minutesAgo: Math.max(0, (Date.now() - new Date(row.created_at).getTime()) / 60_000),
      reactions: REACTION_META.map(m => ({
        ...m,
        count: counts[m.key],
        reacted: mine.includes(m.key),
      })),
    };
  });
}

/**
 * Records an activity so the rest of the cohort can see and react to it.
 * Returns the new activity id, or null when signed out / offline — callers
 * treat posting as best-effort and never block the UX on it.
 */
export async function postActivity(
  type: ActivityType,
  headline: string,
  sub?: string,
  xp?: number,
): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data, error } = await supabase
      .from('cohort_activity')
      .insert({
        user_id: user.id,
        type,
        headline: headline.slice(0, 120),
        sub: sub ? sub.slice(0, 200) : null,
        xp: xp ?? null,
      })
      .select('id')
      .single();
    return error ? null : data.id;
  } catch {
    return null;
  }
}

/** Adds or removes the current user's reaction. Returns whether it persisted. */
export async function setReaction(
  activityId: string,
  key: ReactionKey,
  on: boolean,
): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    if (on) {
      const { error } = await supabase.from('cohort_reactions').upsert(
        { activity_id: activityId, user_id: user.id, label: key },
        { onConflict: 'activity_id,user_id,label', ignoreDuplicates: true },
      );
      return !error;
    }
    const { error } = await supabase.from('cohort_reactions')
      .delete()
      .match({ activity_id: activityId, user_id: user.id, label: key });
    return !error;
  } catch {
    return false;
  }
}

/** Total onboarded members across VAULT. */
export async function fetchMemberCount(): Promise<number | null> {
  const { data, error } = await supabase.rpc('member_count');
  return error || typeof data !== 'number' ? null : data;
}

/** Onboarded members in a given tier (the user's cohort). */
export async function fetchTierMemberCount(tier: string): Promise<number | null> {
  const { data, error } = await supabase.rpc('tier_member_count', { cohort_tier: tier });
  return error || typeof data !== 'number' ? null : data;
}
