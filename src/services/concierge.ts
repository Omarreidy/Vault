export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

const SUPABASE_URL = 'https://gvdfypehwmemootjizmd.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_tHoiSHF-49L1_p0OLRPeKw_5mfSi0fs';

export async function askConcierge(
  messages: ConversationMessage[],
  onChunk: (text: string) => void
): Promise<void> {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/concierge`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'apikey': SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ messages }),
  });

  if (!response.ok) {
    throw new Error(`Server error: ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    onChunk(decoder.decode(value, { stream: true }));
  }
}
