import { createClient } from 'npm:@supabase/supabase-js@2';

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

    const { public_token, user_id } = await req.json();
    if (!public_token) throw new Error('Missing public_token');

    // Exchange public token for access token
    const exchangeRes = await fetch(`${baseUrl}/item/public_token/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: clientId, secret, public_token }),
    });
    const { access_token, item_id } = await exchangeRes.json();

    // Fetch accounts
    const accountsRes = await fetch(`${baseUrl}/accounts/get`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: clientId, secret, access_token }),
    });
    const accountsData = await accountsRes.json();

    // Fetch transactions (last 30 days)
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - 30);
    const txRes = await fetch(`${baseUrl}/transactions/get`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        secret,
        access_token,
        start_date: start.toISOString().split('T')[0],
        end_date: now.toISOString().split('T')[0],
      }),
    });
    const txData = await txRes.json();

    // Save to Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    await supabase.from('plaid_items').upsert({
      user_id,
      item_id,
      access_token,
      accounts: accountsData.accounts ?? [],
      transactions: txData.transactions ?? [],
      updated_at: new Date().toISOString(),
    }, { onConflict: 'item_id' });

    return new Response(JSON.stringify({
      accounts: accountsData.accounts ?? [],
      transactions: txData.transactions ?? [],
    }), {
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
