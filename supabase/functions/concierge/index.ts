import Anthropic from 'npm:@anthropic-ai/sdk@0.99.0';
import { requireUser, corsHeaders } from '../_shared/auth.ts';
import { allowRequest, tooManyRequests } from '../_shared/ratelimit.ts';
import { buildSystemPrompt } from './prompt.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Signed-in members only — this endpoint spends real Anthropic tokens.
  let user: { id: string };
  try { user = await requireUser(req); } catch (r) { return r as Response; }
  if (!(await allowRequest(user.id, 'concierge', 20, 60))) return tooManyRequests();

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
