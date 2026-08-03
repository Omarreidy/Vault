import { createClient } from 'npm:@supabase/supabase-js@2';
import { requireUser, corsHeaders } from '../_shared/auth.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  // Bank data is written to the VERIFIED caller's account only — the user id
  // comes from their session JWT, never from the request body.
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

    const { public_token } = await req.json();
    if (!public_token) throw new Error('Missing public_token');

    // Exchange public token for access token. A failed exchange must be a
    // clean error — never a partial row that later scores as "no accounts".
    const exchangeRes = await fetch(`${baseUrl}/item/public_token/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: clientId, secret, public_token }),
    });
    const exchangeData = await exchangeRes.json();
    if (!exchangeRes.ok || !exchangeData.access_token || !exchangeData.item_id) {
      throw new Error(exchangeData?.error_message ?? 'Plaid token exchange failed');
    }
    const { access_token, item_id } = exchangeData;

    // Fetch accounts
    const accountsRes = await fetch(`${baseUrl}/accounts/get`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: clientId, secret, access_token }),
    });
    const accountsData = await accountsRes.json();
    if (!accountsRes.ok || !Array.isArray(accountsData.accounts)) {
      throw new Error(accountsData?.error_message ?? 'Plaid accounts fetch failed');
    }

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

    const transactions = Array.isArray(txData.transactions) ? txData.transactions : [];

    await supabase.from('plaid_items').upsert({
      user_id: user.id,
      item_id,
      access_token,
      accounts: accountsData.accounts,
      // Like plaid-refresh: never wipe previously-stored transactions with an
      // empty list (PRODUCT_NOT_READY on reconnect) — an emptied window would
      // silently score as "zero spend". New rows get the column default [].
      ...(transactions.length > 0 ? { transactions } : {}),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'item_id' });

    // Plaid issues a NEW item_id every time the same bank is re-linked, so the
    // upsert above never matches an existing row — it inserts another one. Left
    // alone, each reconnect duplicated the member's whole transaction window
    // under fresh transaction_ids that dedupeTransactions() cannot recognise,
    // inflating reported income, spend, and the Vault Score derived from them.
    //
    // Identify the same institution the way dedupeAccounts does — by the set of
    // (name, mask) pairs — and drop the older rows. Best-effort: a cleanup
    // failure must never fail a successful bank connection.
    try {
      const fingerprint = (accts: any[]): string =>
        (accts ?? [])
          .map(a => `${String(a?.name ?? '').toLowerCase()}|${String(a?.mask ?? '')}`)
          .sort()
          .join(',');

      const current = fingerprint(accountsData.accounts);
      if (current) {
        const { data: existing } = await supabase
          .from('plaid_items')
          .select('id, item_id, accounts')
          .eq('user_id', user.id);

        const superseded = (existing ?? [])
          .filter((row: any) => row.item_id !== item_id && fingerprint(row.accounts) === current)
          .map((row: any) => row.id);

        if (superseded.length > 0) {
          await supabase.from('plaid_items').delete().in('id', superseded);
          console.log(`plaid-exchange: removed ${superseded.length} superseded item(s) for the same institution`);
        }
      }
    } catch (e) {
      console.warn('plaid-exchange: superseded-item cleanup failed', String(e));
    }

    return new Response(JSON.stringify({
      accounts: accountsData.accounts,
      transactions,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: 'Request failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
