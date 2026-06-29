import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Re-pulls fresh accounts + transactions from Plaid for every item a user has
// linked, and updates the stored snapshot. Designed to never throw on a single
// bad item — one failing institution must not break the whole refresh.
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

    const { user_id } = await req.json().catch(() => ({}));
    if (!user_id) throw new Error('user_id required');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: items } = await supabase
      .from('plaid_items')
      .select('item_id, access_token')
      .eq('user_id', user_id);

    if (!items || items.length === 0) {
      return new Response(JSON.stringify({ refreshed: 0, reason: 'no_items' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - 30);
    const startDate = start.toISOString().split('T')[0];
    const endDate = now.toISOString().split('T')[0];

    let refreshed = 0;
    // Process items independently — a failure on one never aborts the others.
    await Promise.all(items.map(async (item: any) => {
      const access_token = item.access_token;
      if (!access_token) return;
      try {
        const accountsRes = await fetch(`${baseUrl}/accounts/get`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ client_id: clientId, secret, access_token }),
        });
        const accountsData = await accountsRes.json();
        if (!accountsRes.ok || !accountsData.accounts) return; // skip on error

        // Transactions can be temporarily PRODUCT_NOT_READY — that's non-fatal.
        let transactions: any[] = [];
        try {
          const txRes = await fetch(`${baseUrl}/transactions/get`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              client_id: clientId, secret, access_token,
              start_date: startDate, end_date: endDate,
            }),
          });
          const txData = await txRes.json();
          if (txRes.ok && Array.isArray(txData.transactions)) transactions = txData.transactions;
        } catch { /* keep transactions empty */ }

        await supabase.from('plaid_items').update({
          accounts: accountsData.accounts,
          // Only overwrite transactions when we actually got some, so a transient
          // PRODUCT_NOT_READY doesn't wipe previously-stored history.
          ...(transactions.length > 0 ? { transactions } : {}),
          updated_at: new Date().toISOString(),
        }).eq('item_id', item.item_id);

        refreshed++;
      } catch (e) {
        console.error('refresh failed for item', item.item_id, String(e));
      }
    }));

    return new Response(JSON.stringify({ refreshed }), {
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
