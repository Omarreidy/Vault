-- Remove superseded Plaid Items (2026-08-03).
--
-- plaid-exchange upserts on `item_id`, but Plaid issues a NEW item_id every
-- time a member re-links the same bank. The conflict target therefore never
-- matched and each reconnect INSERTED another row holding the same real
-- transactions under fresh transaction_ids.
--
-- dedupeTransactions() collapses only exact transaction_id matches, so those
-- cross-Item duplicates survived into the totals: a member who reconnected
-- three times saw roughly triple their real monthly income and spend, and a
-- Vault Score computed from triple their real spending.
--
-- Two rows are the same institution when their accounts carry the same
-- (name, mask) pairs — the same identity test dedupeAccounts already uses for
-- re-linked accounts. Keep the most recently updated row of each group; the
-- older ones hold nothing the newest doesn't, since every refresh rewrites the
-- full 30-day window.
--
-- Safe to re-run: after the first pass every group has exactly one row.

DO $$
DECLARE
  total_before  int;
  dupes         int;
BEGIN
  SELECT count(*) INTO total_before FROM public.plaid_items;

  CREATE TEMP TABLE superseded ON COMMIT DROP AS
  WITH fingerprinted AS (
    SELECT
      p.id,
      p.user_id,
      p.updated_at,
      (
        SELECT string_agg(
                 lower(coalesce(a->>'name', '') || '|' || coalesce(a->>'mask', '')),
                 ','
                 ORDER BY lower(coalesce(a->>'name', '') || '|' || coalesce(a->>'mask', ''))
               )
        FROM jsonb_array_elements(p.accounts) a
      ) AS fingerprint
    FROM public.plaid_items p
    WHERE jsonb_typeof(p.accounts) = 'array'
      AND jsonb_array_length(p.accounts) > 0
  ),
  ranked AS (
    SELECT
      id,
      user_id,
      fingerprint,
      row_number() OVER (
        PARTITION BY user_id, fingerprint
        ORDER BY updated_at DESC NULLS LAST, id DESC
      ) AS rn
    FROM fingerprinted
    -- A row with no identifiable accounts cannot be matched to another with
    -- confidence, so it is never treated as a duplicate.
    WHERE fingerprint IS NOT NULL AND fingerprint <> ''
  )
  SELECT id, user_id, fingerprint FROM ranked WHERE rn > 1;

  SELECT count(*) INTO dupes FROM superseded;

  RAISE NOTICE 'plaid_items: % rows total, % superseded duplicates to remove, % will remain',
    total_before, dupes, total_before - dupes;

  RAISE NOTICE 'affected members: %', (SELECT count(DISTINCT user_id) FROM superseded);

  DELETE FROM public.plaid_items WHERE id IN (SELECT id FROM superseded);
END $$;
