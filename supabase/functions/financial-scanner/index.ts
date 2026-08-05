import Anthropic from 'npm:@anthropic-ai/sdk@0.99.0';
import { requireUser, corsHeaders as cors } from '../_shared/auth.ts';
import { allowRequest, tooManyRequests } from '../_shared/ratelimit.ts';
import { parseScanResult } from './parse.ts';
import { runProviderChain, AllProvidersFailedError, type Provider } from './chain.ts';
import { emitScanTelemetry } from './telemetry.ts';

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
// Anthropic rejects images over ~5MB; base64 inflates raw bytes by ~4/3, so cap
// the encoded string so an oversized body can't inflate a request server-side.
const MAX_IMAGE_B64_LEN = 7_000_000;

// Per-attempt timeout for a single model call. The SDK/fetch timeout is set
// slightly below the chain's attemptTimeoutMs so the provider error (which
// classifies precisely) wins the race, with the chain timeout as backstop.
const MODEL_CALL_TIMEOUT_MS = 25_000;

const SCAN_PROMPT = `You are VAULT's financial intelligence scanner. The user has scanned something — it could be food, a product, a car, clothing, a bill, a subscription, a document, or anything else.

Give a straight, unflinching financial read on what you see — honest about costs and trade-offs, never contemptuous of the person who owns it. Return ONLY a valid JSON object with these exact fields:

{
  "verdict": "ASSET" | "LIABILITY" | "BUDGET CHECK",
  "itemName": "short name of the item (max 4 words)",
  "emoji": "single most relevant emoji",
  "tagline": "one punchy sentence — the financial truth about this item",
  "monthlyCost": "estimated monthly cost if applicable, e.g. '$120/mo' — omit field entirely if not relevant",
  "annualImpact": "annual financial impact with a number, e.g. '+$2,400/yr' or '-$1,800/yr'",
  "wealthScoreImpact": "score impact, e.g. '+8 pts for investing habit' or '-5 pts if financed'",
  "insight": "2-3 sentences of sharp financial context — include real numbers, percentages, or comparisons where possible",
  "tip": "one specific, actionable wealth-building tip related to this item",
  "xp": number between 10 and 25
}

Rules:
- ASSET = holds value, appreciates, or earns money (investments, real estate, education, skills, precious metals and other stores of value, equipment that generates income)
- LIABILITY = costs money, depreciates, or drains wealth (most consumer goods, financed depreciating items, unused subscriptions)
- BUDGET CHECK = depends on the person's situation or behaviour (food, gym, entertainment, and anything whose answer changes with facts a photo cannot show)

THE MOST IMPORTANT RULE — a photo carries no context. You cannot see what someone paid, whether it is financed, whether it earns them money, or whether they already own it. When the verdict genuinely depends on one of those, choose BUDGET CHECK and use the insight to name the deciding factor plainly: "This is an asset if it earns you money, a liability if it doesn't — here's how to tell." A confident wrong verdict is worse than an honest conditional one. Never label something a LIABILITY merely because it is a physical object someone owns.

Category guidance:
- Precious metals are NOT consumer goods. High-purity gold (22k, 24k), bullion, coins and bars are ASSETS — they track spot price and are bought as savings across much of the world. Judge them on purity and weight, not on the fact that they are worn.
- Lower-purity or designer jewellery (10k, 14k, 18k, brand-name pieces) is mostly retail markup rather than metal. BUDGET CHECK, and say plainly that resale is typically far below purchase price. Do not call it an ASSET just because it contains some gold.
- Watches and collectibles split hard by model. Established pieces with real secondary markets (Rolex, Patek, Omega sports models, graded cards, rare sneakers, listed art) hold value — treat as ASSET or BUDGET CHECK and reference the resale market. Fashion and microbrand watches depreciate like any consumer good.
- Tools of trade — cameras, laptops, vehicles, kitchen or trade equipment — are ASSETS when they produce income and LIABILITIES when they don't. You cannot tell which from a photo, so say so.
- Health and preventive items (glasses, dental work, medication, mouthguards, therapy, medical devices) are never LIABILITIES. They avert far larger costs. Treat as ASSET or BUDGET CHECK and be warm, not brutal.
- Essentials are not indulgences. Groceries, basic clothing, transport to work, utilities and rent are necessary spending — assess how well the money is being spent, never imply the spending itself is a mistake.
- Insurance is risk transfer, not waste. Being underinsured is usually the more expensive error.
- Vehicles depend on price, financing and reliability, not on being a car. A paid-off reliable car is not the same object as a financed luxury one.
- Sentimental items — wedding and engagement rings, inherited pieces, gifts — get no purchase critique. State what it is worth, mention insuring or appraising it, and leave the decision alone.
- If it looks like something already owned rather than a purchase being considered, give keep/sell/insure guidance instead of buying advice.
- If the image is blurry, unclear, or you cannot confidently identify the object, set itemName to "Unclear Photo" and verdict to "BUDGET CHECK". Explain what you think it might be but do NOT guess a specific category with false confidence.
- Be honest and specific, never sneering. The user is the person who owns this. Describe the finances, do not judge the person, and never tell them to buy or sell a specific investment.
- Be specific and confident when you CAN see the item clearly.
- Keep itemName short and recognizable.
- Return ONLY the JSON object, no other text.`;

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

function anthropicProvider(
  name: string,
  model: string,
  imageBase64: string,
  media_type: string,
): Provider<string> {
  return {
    name,
    call: async () => {
      const client = new Anthropic({
        apiKey: Deno.env.get('ANTHROPIC_API_KEY')!,
        maxRetries: 0, // the chain owns retries — don't stack the SDK's on top
        timeout: MODEL_CALL_TIMEOUT_MS,
      });
      const response = await client.messages.create({
        model,
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: media_type as 'image/jpeg', data: imageBase64 } },
            { type: 'text', text: SCAN_PROMPT },
          ],
        }],
      });
      const block = response.content[0];
      return block?.type === 'text' ? block.text : '';
    },
  };
}

// Cross-vendor fallback so an Anthropic-wide outage doesn't take the feature
// down. Activates only when OPENAI_API_KEY is set in the function's secrets.
function openAiProvider(imageBase64: string, media_type: string): Provider<string> | null {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) return null;
  return {
    name: 'openai:gpt-4o-mini',
    call: async () => {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          max_tokens: 1024,
          messages: [{
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: `data:${media_type};base64,${imageBase64}` } },
              { type: 'text', text: SCAN_PROMPT },
            ],
          }],
        }),
        signal: AbortSignal.timeout(MODEL_CALL_TIMEOUT_MS),
      });
      if (!res.ok) {
        const err = new Error(`openai responded ${res.status}`) as Error & { status: number };
        err.status = res.status;
        throw err;
      }
      const data = await res.json();
      return data?.choices?.[0]?.message?.content ?? '';
    },
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const startedAt = Date.now();
  const done = () => Date.now() - startedAt;

  // Signed-in members only — this endpoint spends real Anthropic tokens.
  let user: { id: string };
  try {
    user = await requireUser(req);
  } catch (r) {
    emitScanTelemetry({ outcome: 'rejected', reason: 'unauthorized', durationMs: done() });
    return r as Response;
  }
  if (!(await allowRequest(user.id, 'financial-scanner', 15, 60))) {
    emitScanTelemetry({ outcome: 'rejected', reason: 'rate_limited', userId: user.id, durationMs: done() });
    return tooManyRequests();
  }

  let body: { imageBase64?: unknown; mimeType?: unknown };
  try {
    body = await req.json();
  } catch {
    emitScanTelemetry({ outcome: 'rejected', reason: 'unparseable_body', userId: user.id, durationMs: done() });
    return json(400, { error: 'bad_request' });
  }
  const { imageBase64, mimeType = 'image/jpeg' } = body ?? {};
  if (!imageBase64 || typeof imageBase64 !== 'string') {
    emitScanTelemetry({ outcome: 'rejected', reason: 'missing_image', userId: user.id, durationMs: done() });
    return json(400, { error: 'bad_request' });
  }
  if (imageBase64.length > MAX_IMAGE_B64_LEN) {
    emitScanTelemetry({
      outcome: 'rejected', reason: 'image_too_large', userId: user.id,
      durationMs: done(), detail: `b64len=${imageBase64.length}`,
    });
    return json(413, { error: 'image_too_large' });
  }
  const media_type = ALLOWED_MIME.has(mimeType as string) ? (mimeType as string) : 'image/jpeg';

  // Ordered fallback chain. Sonnet leads because asset-vs-liability is a
  // judgement call, not a lookup: Haiku classified a 24k gold necklace as a
  // LIABILITY because it read "jewellery" as a consumer good. Haiku stays as
  // the second rung so a Sonnet outage degrades the verdict quality rather
  // than failing the scan, then a different vendor entirely (if configured).
  const providers = [
    anthropicProvider('anthropic:claude-sonnet-5', 'claude-sonnet-5', imageBase64, media_type),
    anthropicProvider('anthropic:claude-haiku-4-5', 'claude-haiku-4-5-20251001', imageBase64, media_type),
    openAiProvider(imageBase64, media_type),
  ].filter((p): p is Provider<string> => p !== null);

  try {
    const { result: text, provider, attempts, failures } = await runProviderChain(providers, {
      maxAttemptsPerProvider: 2,
      attemptTimeoutMs: MODEL_CALL_TIMEOUT_MS + 1_000,
      baseDelayMs: 400,
      totalBudgetMs: 60_000,
    });

    // Validate everything the model returned before the client renders it —
    // verdict is coerced into the enum and xp clamped to the 0–25 design range.
    const result = parseScanResult(text);

    emitScanTelemetry({
      outcome: 'success', provider, attempts, userId: user.id, durationMs: done(),
      ...(failures.length > 0 ? { failures } : {}),
    });
    return json(200, result);
  } catch (err) {
    if (err instanceof AllProvidersFailedError) {
      emitScanTelemetry({
        outcome: 'failure', reason: 'all_providers_failed', failures: err.failures,
        attempts: err.failures.length, userId: user.id, durationMs: done(),
      });
      return json(503, { error: 'scan_unavailable' });
    }
    emitScanTelemetry({
      outcome: 'failure', reason: 'unhandled_exception', userId: user.id,
      durationMs: done(), detail: String(err).slice(0, 500),
    });
    return json(500, { error: 'scan_failed' });
  }
});
