import Anthropic from 'npm:@anthropic-ai/sdk@0.99.0';
import { requireUser, corsHeaders } from '../_shared/auth.ts';

function fmt(n: number) {
  return '$' + n.toLocaleString('en-US');
}

function buildSystemPrompt(ctx: any): string {
  const base = `You are VAULT Concierge — a private, elite AI wealth advisor inside the VAULT app.
You speak like a sharp, experienced financial advisor who gets straight to the point.
Keep responses concise and actionable. Short paragraphs. No bullet overload. Sound human, not robotic.
Responses are for informational purposes only — not official financial advice.`;

  if (!ctx) return base;

  const { name, tier, score, percentile, plaidConnected } = ctx;

  if (!plaidConnected) {
    return `${base}

Member: ${name} | Tier: ${tier} | Score: ${score}/1000 | Percentile: ${percentile}th

They haven't connected bank accounts yet — your advice is based on profile data only. Encourage connecting to unlock fully personalized advice. Be warm, not pushy.`;
  }

  const {
    totalChecking = 0,
    totalSavings = 0,
    totalInvesting = 0,
    totalCreditDebt = 0,
    creditUtilization = 0,
    accountCount = 0,
  } = ctx;

  const netWorth = totalSavings + totalInvesting - totalCreditDebt;

  return `${base}

You have the member's real account data. Use their actual numbers in every response — never be generic when specifics are available.

Member: ${name}
Tier: ${tier} | Score: ${score}/1000 | Percentile: ${percentile}th
Linked accounts: ${accountCount}

Financial snapshot:
- Checking:      ${fmt(totalChecking)}
- Savings:       ${fmt(totalSavings)}
- Investments:   ${fmt(totalInvesting)}
- Credit debt:   ${fmt(totalCreditDebt)} (${creditUtilization}% utilization)
- Net worth:     ${fmt(netWorth)}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Signed-in members only — this endpoint spends real Anthropic tokens.
  try { await requireUser(req); } catch (r) { return r as Response; }

  try {
    const { messages, userContext } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: 'Invalid request' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set');

    const client = new Anthropic({ apiKey });

    const stream = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: buildSystemPrompt(userContext ?? null),
      messages: messages.map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      stream: true,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        for await (const event of stream) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        controller.close();
      },
    });

    return new Response(readable, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: 'Something went wrong' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
