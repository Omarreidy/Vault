import { requireUser, corsHeaders } from '../_shared/auth.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  // Only signed-in members can mint Plaid Link tokens.
  let user: { id: string };
  try { user = await requireUser(req); } catch (r) { return r as Response; }

  try {
    const clientId = Deno.env.get('PLAID_CLIENT_ID')!;
    const secret   = Deno.env.get('PLAID_SECRET')!;
    const env      = Deno.env.get('PLAID_ENV') ?? 'sandbox';

    const baseUrl = env === 'production'
      ? 'https://production.plaid.com'
      : env === 'development'
      ? 'https://development.plaid.com'
      : 'https://sandbox.plaid.com';

    const userId = user.id;

    const res = await fetch(`${baseUrl}/link/token/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        secret,
        client_name: 'VAULT',
        user: { client_user_id: userId },
        products: ['transactions'],
        country_codes: ['US'],
        language: 'en',
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error_message ?? 'Plaid error');
    }

    return new Response(JSON.stringify({ link_token: data.link_token }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
