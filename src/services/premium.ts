import { Platform } from 'react-native';
import { supabase } from './supabase';

/**
 * Reads the authoritative premium entitlement from `profiles.is_premium`.
 *
 * As of the D1 fix (qa/FINANCIAL_SPEC.md §12) `is_premium` is a GUARDED column:
 * clients cannot write it, and the RevenueCat webhook edge function is the ONLY
 * writer. So the client no longer mirrors the entitlement — it just reads the
 * server truth. After a purchase, RevenueCat fires the webhook within a few
 * seconds; this helper briefly polls so the value it returns reflects that.
 *
 * - no-ops on web (no RevenueCat / native purchases there)
 * - never throws (returns the flag, or null when unknown)
 */
export async function syncPremiumStatus(
  opts: { attempts?: number; delayMs?: number } = {},
): Promise<boolean | null> {
  if (Platform.OS === 'web') return null;
  const attempts = opts.attempts ?? 4;
  const delayMs = opts.delayMs ?? 1200;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Poll a few times so a just-completed purchase (webhook lands in ~1–3s)
    // is reflected without forcing the caller to restart the app.
    for (let attempt = 0; attempt < attempts; attempt++) {
      const { data } = await supabase
        .from('profiles')
        .select('is_premium')
        .eq('id', user.id)
        .single();
      if (data?.is_premium === true) return true;
      if (attempt < attempts - 1) await new Promise(r => setTimeout(r, delayMs));
    }
    return false;
  } catch {
    return null;
  }
}
