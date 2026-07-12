import { createClient } from 'npm:@supabase/supabase-js@2';
import { requireUser, corsHeaders as cors } from '../_shared/auth.ts';
import { computeVaultScore } from '../_shared/finance.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  // Scores are computed and written for the VERIFIED caller only — nobody
  // can recompute or overwrite another member's score/tier.
  let caller: { id: string };
  try { caller = await requireUser(req); } catch (r) { return r as Response; }

  try {
    const user_id = caller.id;

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get Plaid data for this user
    const { data: plaidItems } = await supabase
      .from('plaid_items')
      .select('accounts, transactions')
      .eq('user_id', user_id);

    if (!plaidItems || plaidItems.length === 0) {
      return new Response(JSON.stringify({ error: 'no_plaid_data' }), {
        status: 404, headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    // Flatten all accounts and transactions across all linked items.
    // The score math itself (categorization, dedupe, formula) lives in
    // _shared/finance.ts so it stays identical to the client's copy.
    const allAccounts = plaidItems.flatMap((item: any) => item.accounts ?? []);
    const allTx       = plaidItems.flatMap((item: any) => item.transactions ?? []);

    const score = computeVaultScore(allAccounts, allTx);

    const result = {
      ...score,
      tierProgress: 0,
      weeklyChange: 0,
    };

    // Save to profile
    await supabase.from('profiles').update({
      score: score.total,
      tier: score.tier,
      percentile: score.percentile,
    }).eq('id', user_id);

    return new Response(JSON.stringify(result), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
});
