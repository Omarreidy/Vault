import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://gvdfypehwmemootjizmd.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? 'sb_publishable_tHoiSHF-49L1_p0OLRPeKw_5mfSi0fs';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// `autoRefreshToken: true` is NOT sufficient on React Native. The refresh loop
// is a JS timer, and iOS suspends timers the moment the app leaves the
// foreground — so a backgrounded app stops refreshing and its 60-minute access
// token quietly expires. Every edge function then answers 401, which the UI
// used to report as "check the ticker", so members retried the same input until
// something happened to refresh the session. Supabase requires this AppState
// pairing on React Native; without it the app is broken after an hour idle.
AppState.addEventListener('change', state => {
  if (state === 'active') supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});
// The listener only fires on *change*, so cover the already-foregrounded start.
if (AppState.currentState === 'active') supabase.auth.startAutoRefresh();

/** Refresh this far ahead of expiry rather than spending a request on a token that dies mid-flight. */
const REFRESH_SKEW_MS = 5 * 60 * 1000;

/**
 * The access token to send, refreshed first if it is expired or nearly so.
 * Returns null when there is no session at all (caller falls back to anon).
 */
async function currentAccessToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  const expiresAtMs = (session.expires_at ?? 0) * 1000;
  if (expiresAtMs - Date.now() > REFRESH_SKEW_MS) return session.access_token;

  // Expired or expiring imminently. Refresh now; if that fails, still send the
  // old token — callFunction's 401 retry is the second line of defence and a
  // transient refresh failure shouldn't hard-fail a request that might pass.
  try {
    const { data, error } = await supabase.auth.refreshSession();
    if (!error && data.session) return data.session.access_token;
  } catch { /* fall through to the stale token */ }
  return session.access_token;
}

/**
 * Headers for edge-function calls. Protected functions require the caller's
 * real session JWT — the anon key alone is rejected with 401. Falls back to
 * the anon key only for the few public, read-only endpoints.
 */
export async function functionAuthHeaders(): Promise<Record<string, string>> {
  const token = await currentAccessToken();
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token ?? SUPABASE_ANON_KEY}`,
    'apikey': SUPABASE_ANON_KEY,
  };
}

// ── Edge-function calls ──────────────────────────────────────────────────────

/** The session is gone or unrecoverable — the member must sign in again. */
export class AuthExpiredError extends Error {
  constructor() { super('Your session expired. Sign in again to continue.'); this.name = 'AuthExpiredError'; }
}

/** The request never reached the server, or never came back. Retrying usually works. */
export class NetworkError extends Error {
  constructor() { super('Could not reach VAULT. Check your connection and try again.'); this.name = 'NetworkError'; }
}

/** The server was reached and refused or failed the request. */
export class FunctionError extends Error {
  constructor(message: string, readonly status: number) { super(message); this.name = 'FunctionError'; }
}

// Long enough that a slow-but-working request is never killed (company-research
// legitimately runs 20–30s), short enough that a dead connection still settles.
// A fetch with no timeout at all can hang forever and leave a spinner running.
const DEFAULT_TIMEOUT_MS = 60_000;

export interface CallFunctionOptions {
  body?: unknown;
  timeoutMs?: number;
  method?: 'GET' | 'POST';
  /** Public read-only endpoints that work fine on the anon key. */
  allowAnon?: boolean;
}

/**
 * Force a token refresh, for callers that can't use callFunction — streaming
 * responses, or flows with their own retry logic. Returns true if a usable
 * session came back.
 */
export async function refreshSessionToken(): Promise<boolean> {
  try {
    const { data, error } = await supabase.auth.refreshSession();
    return !error && !!data.session;
  } catch {
    return false;
  }
}

/**
 * POST to an edge function with the three things every call site needs and none
 * of them had: a timeout, a refresh-and-replay on 401, and errors that say what
 * actually went wrong.
 *
 * The 401 retry is the important one. An expired access token is by far the
 * most common failure here, it is completely recoverable, and retrying it
 * silently is the difference between a feature that works and one the member
 * has to poke repeatedly.
 */
export async function callFunction<T = any>(fn: string, opts: CallFunctionOptions = {}): Promise<T> {
  const { body, timeoutMs = DEFAULT_TIMEOUT_MS, method = 'POST' } = opts;

  const attempt = async (): Promise<Response> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(`${SUPABASE_URL}/functions/v1/${fn}`, {
        method,
        headers: await functionAuthHeaders(),
        ...(method === 'POST' ? { body: JSON.stringify(body ?? {}) } : {}),
        signal: controller.signal,
      });
    } catch {
      // Abort and genuine transport failures land here identically; from the
      // member's point of view they are the same thing.
      throw new NetworkError();
    } finally {
      clearTimeout(timer);
    }
  };

  let res = await attempt();

  if (res.status === 401 && !opts.allowAnon) {
    // Almost always an access token that expired while the app was backgrounded.
    let refreshed = false;
    try {
      const { data, error } = await supabase.auth.refreshSession();
      refreshed = !error && !!data.session;
    } catch { /* refreshed stays false */ }
    if (!refreshed) throw new AuthExpiredError();
    res = await attempt();
    if (res.status === 401) throw new AuthExpiredError();
  }

  // Read the body before checking status: failures carry their reason in
  // `error` (e.g. "invalid ticker"), and that detail is what lets the UI say
  // something true instead of guessing.
  let json: any = null;
  try { json = await res.json(); } catch { /* non-JSON body; handled below */ }

  if (!res.ok) {
    throw new FunctionError(json?.error ? String(json.error) : `${fn} failed (${res.status})`, res.status);
  }
  if (json === null) throw new FunctionError(`${fn} returned an unreadable response`, res.status);
  if (json?.error) throw new FunctionError(String(json.error), res.status);
  return json as T;
}
