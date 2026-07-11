import { createClient } from 'npm:@supabase/supabase-js@2';
import { requireUser, corsHeaders as cors } from '../_shared/auth.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  // A signed-in user may only trigger a push to THEMSELVES. Anything else
  // would be a phishing/spam vector (arbitrary content to arbitrary users).
  let user: { id: string };
  try { user = await requireUser(req); } catch (r) { return r as Response; }

  try {
    const { title, body, data } = await req.json();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get the caller's own push token
    const { data: profile } = await supabase
      .from('profiles')
      .select('push_token')
      .eq('id', user.id)
      .single();

    if (!profile?.push_token) {
      return new Response(JSON.stringify({ error: 'No push token' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    // Send via Expo Push API
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: profile.push_token,
        title,
        body,
        data: data ?? {},
        sound: 'default',
        badge: 1,
      }),
    });

    const result = await res.json();

    return new Response(JSON.stringify({ success: true, result }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
});
