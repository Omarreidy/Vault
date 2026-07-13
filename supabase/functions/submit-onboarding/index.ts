import { createClient } from 'npm:@supabase/supabase-js@2';
import { requireUser, corsHeaders as cors } from '../_shared/auth.ts';
import { computeOnboardingScore } from '../_shared/onboarding.ts';

// Server-authoritative onboarding write. score/tier/percentile are guarded
// columns (D1) that clients cannot set directly — the score is recomputed here
// from the raw quiz answers so it can never be inflated from the client.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  let caller: { id: string };
  try { caller = await requireUser(req); } catch (r) { return r as Response; }

  try {
    const body = await req.json().catch(() => ({}));
    const name = typeof body.name === 'string' ? body.name.slice(0, 80) : null;
    const age = typeof body.age === 'string' ? body.age : '';
    const income = typeof body.income === 'string' ? body.income : '';
    const goal = typeof body.goal === 'string' ? body.goal : '';

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // If quiz answers are present, compute + persist the authoritative score.
    // If only a name came through (e.g. a resubmit), just flip the flag/name
    // without touching an existing score.
    const hasAnswers = !!(age && income && goal);
    const update: Record<string, unknown> = { onboarding_complete: true };
    if (name !== null) update.name = name;

    let scored: ReturnType<typeof computeOnboardingScore> | null = null;
    if (hasAnswers) {
      scored = computeOnboardingScore({ age, income, goal });
      update.score = scored.score;
      update.tier = scored.tier;
      update.tier_progress = scored.tierProgress;
      update.percentile = scored.percentile;
    }

    const { error } = await supabase.from('profiles').update(update).eq('id', caller.id);
    if (error) throw error;

    return new Response(
      JSON.stringify({
        ok: true,
        ...(scored
          ? { score: scored.score, tier: scored.tier, tier_progress: scored.tierProgress, percentile: scored.percentile }
          : {}),
      }),
      { headers: { ...cors, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: 'Request failed' }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
});
