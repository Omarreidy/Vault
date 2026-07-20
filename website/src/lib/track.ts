// First-party website analytics — no cookies, no third-party SDK.
//
// Events are best-effort inserts into the `website_events` Supabase table
// (see supabase/migrations/20260719000000_launch_analytics.sql). Tracking is
// enabled only when NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
// are set at build time; otherwise every call silently no-ops. It must never
// throw, block rendering, or delay a navigation.
//
// Attribution (?utm_source, utm_medium, utm_campaign, utm_content, creator, v)
// is captured once per session and attached to every subsequent event, so a
// CTA click deep in the page still credits the TikTok video that caused it.
// No financial data exists on this surface, so none can leak.

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export type WebEventName =
  | 'page_view'
  | 'appstore_cta_click'
  | 'demo_cta_click'
  | 'support_email_click';

const SESSION_KEY = 'vault_session';
const ATTR_KEY = 'vault_attr';

interface Attribution {
  source: string | null;
  medium: string | null;
  campaign: string | null;
  content: string | null;
  creator: string | null;
  variant: string | null;
  referrer: string | null;
  landing: string | null;
}

function safeStorage(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function getSessionId(): string {
  const store = safeStorage();
  const existing = store?.getItem(SESSION_KEY);
  if (existing) return existing;
  const id = `w-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  store?.setItem(SESSION_KEY, id);
  return id;
}

/** Capture UTM/creator/variant params once per session; later calls read the stored copy. */
export function getAttribution(): Attribution {
  const store = safeStorage();
  const cached = store?.getItem(ATTR_KEY);
  if (cached) {
    try {
      return JSON.parse(cached) as Attribution;
    } catch {
      /* fall through to recapture */
    }
  }
  let attr: Attribution = {
    source: null,
    medium: null,
    campaign: null,
    content: null,
    creator: null,
    variant: null,
    referrer: null,
    landing: null,
  };
  try {
    const params = new URLSearchParams(window.location.search);
    attr = {
      source: params.get('utm_source'),
      medium: params.get('utm_medium'),
      campaign: params.get('utm_campaign'),
      content: params.get('utm_content'),
      creator: params.get('creator'),
      variant: params.get('v'),
      referrer: document.referrer || null,
      landing: window.location.pathname,
    };
    store?.setItem(ATTR_KEY, JSON.stringify(attr));
  } catch {
    /* never throw */
  }
  return attr;
}

export function track(event: WebEventName, props: Record<string, unknown> = {}): void {
  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || typeof window === 'undefined') return;
    const attr = getAttribution();
    const row = {
      session_id: getSessionId(),
      event,
      props,
      page: window.location.pathname,
      referrer: attr.referrer,
      source: attr.source,
      medium: attr.medium,
      campaign: attr.campaign,
      content: attr.content,
      creator: attr.creator,
      variant: attr.variant,
      client_ts: new Date().toISOString(),
    };
    // keepalive lets the request survive the page unloading after a CTA click.
    fetch(`${SUPABASE_URL}/rest/v1/website_events`, {
      method: 'POST',
      keepalive: true,
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(row),
    }).catch(() => {});
  } catch {
    /* analytics must never break the site */
  }
}
