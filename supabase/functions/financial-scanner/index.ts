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

Give a brutally honest financial verdict on what you see. Return ONLY a valid JSON object with these exact fields:

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
- ASSET = generates value, appreciates, or builds wealth (investments, education, real estate, skills)
- LIABILITY = costs money, depreciates, or drains wealth (most consumer goods, financed items, unused subscriptions)
- BUDGET CHECK = depends entirely on behavior (food, gym, entertainment — fine if intentional, harmful if unchecked)
- If the image is blurry, unclear, or you cannot confidently identify the object, set itemName to "Unclear Photo" and verdict to "BUDGET CHECK". Explain what you think it might be but do NOT guess a specific category with false confidence.
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

  // Ordered fallback chain: cheap+fast primary, stronger Anthropic model on a
  // different serving pool, then a different vendor entirely (if configured).
  const providers = [
    anthropicProvider('anthropic:claude-haiku-4-5', 'claude-haiku-4-5-20251001', imageBase64, media_type),
    anthropicProvider('anthropic:claude-sonnet-5', 'claude-sonnet-5', imageBase64, media_type),
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
