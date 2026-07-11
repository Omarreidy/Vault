import { createClient } from 'npm:@supabase/supabase-js@2';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export function unauthorized(msg: string): Response {
  return new Response(JSON.stringify({ error: `unauthorized: ${msg}` }), {
    status: 401,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/**
 * Verifies the caller's Supabase session JWT and returns the user id.
 * The public anon key alone never passes — a real signed-in session is
 * required. Throws a ready-to-return 401 Response on failure, so callers
 * use:  let user; try { user = await requireUser(req); } catch (r) { return r as Response; }
 */
export async function requireUser(req: Request): Promise<{ id: string }> {
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!token) throw unauthorized('missing bearer token');

  const client = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: `Bearer ${token}` } } },
  );
  const { data: { user }, error } = await client.auth.getUser(token);
  if (error || !user) throw unauthorized('invalid or expired session');
  return { id: user.id };
}
