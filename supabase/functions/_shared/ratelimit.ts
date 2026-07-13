import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from './auth.ts';

// Reuse one service-role client across invocations in the same worker. The
// service role bypasses RLS, which is required to touch rate_limit_hits.
let _admin: ReturnType<typeof createClient> | null = null;
function admin() {
  if (!_admin) {
    _admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
  }
  return _admin;
}

/** Ready-to-return 429 for callers that have exceeded their budget. */
export function tooManyRequests(retryAfterSeconds = 60): Response {
  return new Response(
    JSON.stringify({ error: 'rate_limited', message: 'Too many requests. Please slow down.' }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfterSeconds),
      },
    },
  );
}

/**
 * Returns true when the call is within budget, false when `subject` has made
 * `max` or more calls to `bucket` in the trailing `windowSeconds`.
 *
 * Fails OPEN: any DB/transport error returns true so a transient problem with
 * the limiter never takes a paid feature offline for legitimate users. The
 * limiter is a cost/abuse guard, not an authorization control (auth is handled
 * separately by requireUser).
 */
export async function allowRequest(
  subject: string,
  bucket: string,
  max: number,
  windowSeconds: number,
): Promise<boolean> {
  try {
    const { data, error } = await admin().rpc('check_rate_limit', {
      p_subject: subject,
      p_bucket: bucket,
      p_max: max,
      p_window_seconds: windowSeconds,
    });
    if (error) return true; // fail open
    return data !== false;
  } catch {
    return true; // fail open
  }
}
