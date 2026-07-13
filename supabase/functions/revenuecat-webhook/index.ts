import { createClient } from 'npm:@supabase/supabase-js@2';
import { decideFromEvent } from './parse.ts';

// RevenueCat → the ONLY writer of profiles.is_premium (D1). RevenueCat signs
// its webhooks with a static Authorization header configured in the dashboard;
// we reject anything that doesn't match REVENUECAT_WEBHOOK_SECRET. This runs
// server-to-server with the service role, so a client can never forge premium.
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
};

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405, headers: cors });

  const expected = Deno.env.get('REVENUECAT_WEBHOOK_SECRET');
  const provided = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!expected || !provided || !timingSafeEqual(provided, expected)) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const decision = decideFromEvent(body);

    // Not actionable (no mappable user or a no-op event) — ack so RevenueCat
    // doesn't retry a well-formed but irrelevant event.
    if (decision.userId === null || decision.active === null) {
      return new Response(JSON.stringify({ ok: true, skipped: decision.reason }), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const update: Record<string, unknown> = { is_premium: decision.active };
    if (decision.active) update.premium_since = new Date().toISOString();

    const { error } = await supabase.from('profiles').update(update).eq('id', decision.userId);
    if (error) throw error;

    return new Response(JSON.stringify({ ok: true, user: decision.userId, active: decision.active, type: decision.type }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: 'Request failed' }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
});
