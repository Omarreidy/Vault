import Anthropic from 'npm:@anthropic-ai/sdk@0.99.0';
import { requireUser, corsHeaders as cors } from '../_shared/auth.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  // Signed-in members only — this endpoint spends real Anthropic tokens.
  try { await requireUser(req); } catch (r) { return r as Response; }

  try {
    const { imageBase64, mimeType = 'image/jpeg' } = await req.json();
    if (!imageBase64) throw new Error('imageBase64 required');

    const client = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY')! });

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mimeType, data: imageBase64 },
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
    let result: any = {};
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) result = JSON.parse(jsonMatch[0]);
    } catch {
      result = {
        verdict: 'BUDGET CHECK',
        itemName: 'Scanned Item',
        emoji: '📄',
        tagline: 'Could not fully analyze — try a clearer photo.',
        annualImpact: 'Unknown',
        wealthScoreImpact: 'Neutral',
        insight: text.slice(0, 300),
        tip: 'Take a clearer, well-lit photo for a more precise verdict.',
        xp: 10,
      };
    }

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
