const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PRICE_ID = 'price_1TeoO3FLKhJO6GBkqGvkeWxZ';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const { user_id, email, success_url, cancel_url } = await req.json();
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')!;

    // Check if customer already exists
    const searchRes = await fetch(
      `https://api.stripe.com/v1/customers/search?query=metadata['user_id']:'${user_id}'`,
      { headers: { Authorization: `Bearer ${stripeKey}` } }
    );
    const searchData = await searchRes.json();
    let customerId = searchData.data?.[0]?.id;

    // Create customer if doesn't exist
    if (!customerId) {
      const customerRes = await fetch('https://api.stripe.com/v1/customers', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${stripeKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          email,
          'metadata[user_id]': user_id,
        }),
      });
      const customer = await customerRes.json();
      customerId = customer.id;
    }

    // Create checkout session
    const sessionRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        customer: customerId,
        mode: 'subscription',
        'line_items[0][price]': PRICE_ID,
        'line_items[0][quantity]': '1',
        success_url: success_url ?? 'https://vaultreidy.netlify.app?subscribed=true',
        cancel_url: cancel_url ?? 'https://vaultreidy.netlify.app?cancelled=true',
        'subscription_data[metadata][user_id]': user_id,
        'allow_promotion_codes': 'true',
      }),
    });

    const session = await sessionRes.json();
    if (session.error) throw new Error(session.error.message);

    return new Response(JSON.stringify({ url: session.url, session_id: session.id }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
});
