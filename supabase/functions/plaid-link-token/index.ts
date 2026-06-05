const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const clientId = Deno.env.get('PLAID_CLIENT_ID')!;
    const secret   = Deno.env.get('PLAID_SECRET')!;
    const env      = Deno.env.get('PLAID_ENV') ?? 'sandbox';

    const baseUrl = env === 'production'
      ? 'https://production.plaid.com'
      : env === 'development'
      ? 'https://development.plaid.com'
      : 'https://sandbox.plaid.com';

    const body = await req.json().catch(() => ({}));
    const userId = body.user_id ?? 'default-user';

    const res = await fetch(`${baseUrl}/link/token/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        secret,
        client_name: 'VAULT',
        user: { client_user_id: userId },
        products: ['transactions', 'accounts'],
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
