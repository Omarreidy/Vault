-- Launch analytics (2026-07-19).
--
-- 1) website_events: first-party marketing-site analytics (page views, CTA
--    clicks, UTM/creator attribution). Visitors are anonymous, so inserts are
--    allowed to the anon role; nothing is readable through the client API.
--    No financial data exists on the website, so none can arrive here.
--
-- 2) analytics_events anon-insert policy: the app funnel starts before signup
--    (app_opened, signup_started), but the existing policy only allowed
--    authenticated inserts, so every pre-auth event silently dropped. Anonymous
--    rows must carry user_id NULL — a client that isn't signed in can never
--    write an event attributed to a user.

CREATE TABLE IF NOT EXISTS website_events (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  session_id  TEXT NOT NULL,
  event       TEXT NOT NULL CHECK (char_length(event) <= 64),
  props       JSONB NOT NULL DEFAULT '{}'::jsonb,
  page        TEXT,
  referrer    TEXT,
  source      TEXT,   -- utm_source
  medium      TEXT,   -- utm_medium
  campaign    TEXT,   -- utm_campaign
  content     TEXT,   -- utm_content (creative id)
  creator     TEXT,   -- ?creator= (creator/affiliate id)
  variant     TEXT,   -- ?v= (landing-page variant)
  client_ts   TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS website_events_event_created_idx
  ON website_events (event, created_at DESC);
CREATE INDEX IF NOT EXISTS website_events_session_idx
  ON website_events (session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS website_events_campaign_idx
  ON website_events (campaign, created_at DESC);

ALTER TABLE website_events ENABLE ROW LEVEL SECURITY;

-- Insert-only from the public site; dashboards read with the service role.
CREATE POLICY website_events_insert_anon ON website_events
  FOR INSERT TO anon
  WITH CHECK (true);

-- No SELECT/UPDATE/DELETE policies: client roles cannot read events back.

-- Pre-auth app events (install → signup funnel).
CREATE POLICY analytics_insert_anon ON analytics_events
  FOR INSERT TO anon
  WITH CHECK (user_id IS NULL);
