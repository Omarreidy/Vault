import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { supabase } from './supabase';
import { LEGAL_VERSIONS } from '../constants/legal';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const APP_VERSION: string = require('../../app.json').expo.version ?? 'unknown';

const CACHE_KEY = 'vault_legal_acceptance';

interface CachedAcceptance {
  terms: string;
  privacy: string;
  disclosures: string;
  // false when the user accepted while offline and the audit row hasn't
  // reached Supabase yet — retried on every subsequent launch.
  synced: boolean;
}

function matchesCurrent(c: CachedAcceptance): boolean {
  return (
    c.terms === LEGAL_VERSIONS.terms &&
    c.privacy === LEGAL_VERSIONS.privacy &&
    c.disclosures === LEGAL_VERSIONS.disclosures
  );
}

async function insertAcceptanceRow(userId: string): Promise<boolean> {
  const { error } = await supabase.from('legal_acceptances').insert({
    user_id: userId,
    terms_version: LEGAL_VERSIONS.terms,
    privacy_version: LEGAL_VERSIONS.privacy,
    disclosures_version: LEGAL_VERSIONS.disclosures,
    app_version: APP_VERSION,
    platform: Platform.OS,
  });
  return !error;
}

async function readCache(): Promise<CachedAcceptance | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as CachedAcceptance) : null;
  } catch {
    return null;
  }
}

async function writeCache(synced: boolean): Promise<void> {
  const entry: CachedAcceptance = { ...LEGAL_VERSIONS, synced };
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch {}
}

/**
 * True when the signed-in user has accepted the CURRENT versions of the
 * Terms, Privacy Policy, and Important Disclosures. Local cache is the
 * fast path; Supabase is the source of truth (covers reinstalls and
 * acceptances made on other devices).
 */
export async function hasCurrentAcceptance(userId: string): Promise<boolean> {
  const cached = await readCache();
  if (cached && matchesCurrent(cached)) {
    if (!cached.synced) {
      // Acceptance happened offline — keep retrying the audit row quietly.
      insertAcceptanceRow(userId).then((ok) => {
        if (ok) writeCache(true);
      });
    }
    return true;
  }

  const { data, error } = await supabase
    .from('legal_acceptances')
    .select('id')
    .eq('user_id', userId)
    .eq('terms_version', LEGAL_VERSIONS.terms)
    .eq('privacy_version', LEGAL_VERSIONS.privacy)
    .eq('disclosures_version', LEGAL_VERSIONS.disclosures)
    .limit(1);

  if (error || !data || data.length === 0) return false;

  await writeCache(true);
  return true;
}

/**
 * Records the user's acceptance: audit row in Supabase (user id, versions,
 * app version, platform, server timestamp) + local cache. If the network
 * write fails, the acceptance still stands locally (the user performed the
 * affirmative act) and the audit row is retried on later launches.
 */
export async function recordAcceptance(userId: string): Promise<void> {
  const ok = await insertAcceptanceRow(userId);
  await writeCache(ok);
}
