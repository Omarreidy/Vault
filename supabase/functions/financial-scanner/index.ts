import Anthropic from 'npm:@anthropic-ai/sdk@0.99.0';
import { requireUser, corsHeaders as cors } from '../_shared/auth.ts';
import { allowRequest, tooManyRequests } from '../_shared/ratelimit.ts';
import { parseScanResult } from './parse.ts';

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
// Anthropic rejects images over ~5MB; base64 inflates raw bytes by ~4/3, so cap
// the encoded string so an oversized body can't inflate a request server-side.
const MAX_IMAGE_B64_LEN = 7_000_000;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  // Signed-in members only — this endpoint spends real Anthropic tokens.
  let user: { id: string };
  try { user = await requireUser(req); } catch (r) { return r as Response; }
  if (!(await allowRequest(user.id, 'financial-scanner', 15, 60))) return tooManyRequests();

  try {
    const { imageBase64, mimeType = 'image/jpeg' } = await req.json();
    if (!imageBase64 || typeof imageBase64 !== 'string') throw new Error('imageBase64 required');
    if (imageBase64.length > MAX_IMAGE_B64_LEN) throw new Error('image too large');
    const media_type = ALLOWED_MIME.has(mimeType) ? mimeType : 'image/jpeg';

    const client = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY')! });

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type, data: imageBase64 },
          },
          {
            type: 'text',
            text: `You are VAULT's financial intelligence scanner. The user has scanned something — it could be food, a product, a car, clothing, a bill, a subscription, a document, or anything else.

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
- Return ONLY the JSON object, no other text.`,
          },
        ],
      }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    // Validate everything the model returned before the client renders it —
    // verdict is coerced into the enum and xp clamped to the 0–25 design range.
    const result = parseScanResult(text);

    return new Response(JSON.stringify(result), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: 'Scan failed' }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
});
