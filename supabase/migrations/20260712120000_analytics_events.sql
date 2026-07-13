-- Product analytics events (client-emitted, best-effort).
-- Clients may only insert their own rows; nobody can read them through the
-- anon/authenticated API — dashboards query with the service role.

CREATE TABLE IF NOT EXISTS analytics_events (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id  TEXT NOT NULL,
  event       TEXT NOT NULL,
  props       JSONB NOT NULL DEFAULT '{}'::jsonb,
  platform    TEXT NOT NULL DEFAULT 'unknown',
  client_ts   TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS analytics_events_event_created_idx
  ON analytics_events (event, created_at DESC);
CREATE INDEX IF NOT EXISTS analytics_events_user_idx
  ON analytics_events (user_id, created_at DESC);

ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Insert-only for signed-in users, and only as themselves.
CREATE POLICY analytics_insert_own ON analytics_events
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- No SELECT/UPDATE/DELETE policies: client roles cannot read events back.
