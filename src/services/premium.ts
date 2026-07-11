import { Platform } from 'react-native';
import { supabase } from './supabase';

/**
 * Mirrors the RevenueCat `premium` entitlement into `profiles.is_premium` —
 * the flag every screen gates on (via useRealProfile). Without this sync a
 * paying subscriber loses premium on their next app launch, because nothing
 * else ever persists the entitlement.
 *
 * Safe to call on every launch and after any purchase/restore:
 * - no-ops on web (no RevenueCat there)
 * - only writes when the stored flag actually differs
 * - never throws (returns the entitlement state, or null when unknown)
 */
export async function syncPremiumStatus(): Promise<boolean | null> {
  if (Platform.OS === 'web') return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Purchases = require('react-native-purchases').default;
    const info = await Purchases.getCustomerInfo();
    const active = !!info?.entitlements?.active?.['premium'];

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return active;

    const { data: prof } = await supabase
      .from('profiles')
      .select('is_premium')
      .eq('id', user.id)
      .single();

    if (prof && prof.is_premium !== active) {
      await supabase.from('profiles').update({
        is_premium: active,
        ...(active ? { premium_since: new Date().toISOString() } : {}),
      }).eq('id', user.id);
    }
    return active;
  } catch {
    return null;
  }
}
