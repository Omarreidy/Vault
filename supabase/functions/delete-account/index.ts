import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Permanently and fully deletes a user's account — required by App Store
// guideline 5.1.1(v). This removes EVERYTHING tied to the user:
//   1. plaid_items   (their bank access tokens + stored financial data)
//   2. profiles      (their app profile row)
//   3. the auth user (the account itself)
//
// Security: the caller must present their own valid access token. We verify the
// token identifies a real user, then delete ONLY that user — a user can never
// delete someone else's account.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Identify the caller from their access token (NOT a passed-in user_id, so
    // nobody can delete an account that isn't theirs).
    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.replace(/^Bearer\s+/i, '');
    if (!token) throw new Error('missing authorization');

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser(token);
    if (userErr || !user) throw new Error('invalid session');

    const userId = user.id;
    const admin = createClient(supabaseUrl, serviceKey);

    // 1) Delete stored financial data first (most sensitive). Non-fatal per table.
    try { await admin.from('plaid_items').delete().eq('user_id', userId); } catch (e) { console.error('plaid_items delete', String(e)); }
    // 2) Delete the profile row.
    try { await admin.from('profiles').delete().eq('id', userId); } catch (e) { console.error('profiles delete', String(e)); }
    // 3) Delete the auth user itself — this is what actually removes the account.
    const { error: delErr } = await admin.auth.admin.deleteUser(userId);
    if (delErr) throw new Error(`auth delete failed: ${delErr.message}`);

    return new Response(JSON.stringify({ deleted: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: 'Request failed' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
