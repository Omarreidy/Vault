import { Platform } from 'react-native';
import { supabase } from './supabase';

/**
 * Lightweight product analytics. Events are best-effort inserts into the
 * `analytics_events` table (see supabase/migrations/20260712120000): if the
 * user is offline, signed out, or the table isn't deployed yet, tracking
 * silently no-ops — analytics must never break or slow the product.
 */

// Every trackable event, in one place so names never drift between callers
// and dashboards. snake_case, past tense for facts, imperative for intents.
export const EVENTS = {
  FEED_COMPOSED:          'feed_composed',
  MOVE_ACTED:             'move_acted',
  MOVE_SKIPPED:           'move_skipped',
  CONNECT_CARD_VIEWED:    'connect_card_viewed',
  CONNECT_CARD_CTA:       'connect_card_cta_tapped',
  CONNECT_CARD_DISMISSED: 'connect_card_dismissed',
  PLAID_LINK_SUCCEEDED:   'plaid_link_succeeded',
  DAILY_BRIEF_VIEWED:     'daily_brief_viewed',
  DAILY_BRIEF_CTA:        'daily_brief_cta_tapped',
  STREAK_EXTENDED:        'streak_extended',
  VAULT_CLOSED:           'vault_closed',
} as const;

export type EventName = (typeof EVENTS)[keyof typeof EVENTS];

export interface AnalyticsEvent {
  user_id: string | null;
  session_id: string;
  event: EventName;
  props: Record<string, unknown>;
  platform: string;
  client_ts: string;
}

// One id per app launch — lets funnels distinguish sessions without cookies.
const SESSION_ID = `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export function getSessionId(): string {
  return SESSION_ID;
}

// Pure row builder, split out so tests can verify the payload shape without
// touching the network.
export function buildEvent(
  event: EventName,
  props: Record<string, unknown> = {},
  userId: string | null = null,
  sessionId: string = SESSION_ID,
  now: Date = new Date(),
): AnalyticsEvent {
  return {
    user_id: userId,
    session_id: sessionId,
    event,
    props,
    platform: Platform.OS,
    client_ts: now.toISOString(),
  };
}

export async function track(event: EventName, props: Record<string, unknown> = {}): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const row = buildEvent(event, props, user?.id ?? null);
    await supabase.from('analytics_events').insert(row);
  } catch {
    // Never surface analytics failures to the user.
  }
}
