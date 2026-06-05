import Anthropic from 'npm:@anthropic-ai/sdk@0.99.0';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const { imageBase64, mimeType = 'image/jpeg' } = await req.json();
    if (!imageBase64) throw new Error('imageBase64 required');

    const client = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY')! });

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
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
            text: `You are VAULT's financial document scanner. Analyze this financial document, screenshot, or statement.

Return a JSON object with these exact fields:
{
  "verdict": "HEALTHY" | "ATTENTION" | "ACTION NEEDED" | "CRITICAL",
  "score": number 0-100 (financial health score),
  "summary": "one sentence summary of what you see",
  "findings": [
    {
      "icon": "emoji",
      "label": "finding title",
      "detail": "specific detail with numbers if visible",
      "impact": "positive" | "negative" | "neutral"
    }
  ],
  "topAction": "the single most important action to take based on this document",
  "documentType": "what type of document this is (bank statement, credit card bill, investment statement, pay stub, etc.)"
}

Be specific with numbers you can see. If you cannot read specific numbers clearly, say so. Max 4 findings.`
          }
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
        verdict: 'ATTENTION',
        score: 50,
        summary: 'Document analyzed — see findings below.',
        findings: [{ icon: '📄', label: 'Document scanned', detail: text.slice(0, 200), impact: 'neutral' }],
        topAction: 'Review the details above.',
        documentType: 'Financial document',
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
