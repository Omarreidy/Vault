import type { NotifType } from './notifications';

/**
 * Single source of truth for "which screen does a notification open".
 * Pure module (no native imports) so the routing table is unit-testable —
 * a notification landing on the wrong screen is a copy-paste bug this
 * table exists to prevent.
 */

export type TabName = 'Feed' | 'Vault' | 'Insights' | 'Future' | 'Profile';

const TABS: readonly string[] = ['Feed', 'Vault', 'Insights', 'Future', 'Profile'];

// `data.screen` values carried in push payloads. Server sends may also use a
// literal tab name — both forms resolve here so client and backend can never
// disagree about a destination.
const PUSH_SCREEN_ROUTES: Record<string, TabName> = {
  daily_reminder: 'Feed',
  weekly_recap:   'Vault',
  moves:          'Feed',
  streak:         'Feed',
  score:          'Vault',
  goals:          'Vault',
  insights:       'Insights',
  future:         'Future',
  profile:        'Profile',
};

/** Destination for a tapped push notification. Unknown payloads land on Feed. */
export function routeForNotification(data: unknown): TabName {
  const screen = (data as { screen?: unknown } | null | undefined)?.screen;
  if (typeof screen !== 'string') return 'Feed';
  if (TABS.includes(screen)) return screen as TabName;
  return PUSH_SCREEN_ROUTES[screen] ?? 'Feed';
}

// In-app notification-center cards: where each type's story lives.
// Score, tier, goal, and challenge progress all live on the Vault tab
// (ScoreScreen); moves/streak/wins on the Feed; market insights on Pulse.
const TYPE_ROUTES: Record<NotifType, TabName> = {
  score_up:           'Vault',
  score_down:         'Vault',
  tier_progress:      'Vault',
  goal_milestone:     'Vault',
  challenge_complete: 'Vault',
  streak:             'Feed',
  new_moves:          'Feed',
  win:                'Feed',
  insight:            'Insights',
};

/** Destination when a notification-center card is tapped. */
export function routeForNotifType(type: NotifType): TabName {
  return TYPE_ROUTES[type] ?? 'Feed';
}
