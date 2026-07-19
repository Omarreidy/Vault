import { createNavigationContainerRef } from '@react-navigation/native';
import type { TabName } from '../services/notificationRouting';

/**
 * Navigation handle usable from outside the component tree — notification
 * taps arrive in plain listeners (src/services/push.ts) that have no access
 * to a screen's navigation prop.
 */
export const navigationRef = createNavigationContainerRef();

// A cold-start notification tap is processed before the tab navigator mounts
// (App is still resolving auth/legal state). Park the destination and flush
// it from NavigationContainer.onReady.
let pendingTab: TabName | null = null;

export function navigateToTab(tab: TabName): void {
  if (navigationRef.isReady()) {
    navigationRef.navigate(tab as never);
  } else {
    pendingTab = tab;
  }
}

export function flushPendingNavigation(): void {
  if (pendingTab && navigationRef.isReady()) {
    const tab = pendingTab;
    pendingTab = null;
    navigationRef.navigate(tab as never);
  }
}
