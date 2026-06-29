-- Seeds the Apple review demo account (appreview@getvault.app) with realistic
-- sample bank data so the reviewer sees the fully personalized app WITHOUT
-- needing to connect a real bank (Plaid is in production).
-- Idempotent: safe to re-run.

-- 1) Replace any existing linked data for the demo user.
DELETE FROM plaid_items WHERE user_id = '5fefe3de-003b-4c2b-92eb-b3f25c8aeb17';

-- 2) Insert sample accounts + transactions. The access_token is intentionally
--    fake — plaid-refresh will fail to refresh this item and skip it (per-item
--    isolation), leaving this seeded data untouched.
INSERT INTO plaid_items (user_id, item_id, access_token, accounts, transactions, updated_at)
VALUES (
  '5fefe3de-003b-4c2b-92eb-b3f25c8aeb17',
  'demo-item-review',
  'demo-access-token-no-real-bank',
  '[
    {"account_id":"demo-checking","name":"Premier Checking","type":"depository","subtype":"checking","balances":{"current":12450.32,"available":12450.32,"limit":null,"iso_currency_code":"USD"}},
    {"account_id":"demo-savings","name":"High-Yield Savings","type":"depository","subtype":"savings","balances":{"current":8200.00,"available":8200.00,"limit":null,"iso_currency_code":"USD"}},
    {"account_id":"demo-brokerage","name":"Brokerage","type":"investment","subtype":"brokerage","balances":{"current":24000.00,"available":24000.00,"limit":null,"iso_currency_code":"USD"}},
    {"account_id":"demo-credit","name":"Rewards Card","type":"credit","subtype":"credit card","balances":{"current":1800.00,"available":8200.00,"limit":10000.00,"iso_currency_code":"USD"}}
  ]'::jsonb,
  '[
    {"transaction_id":"t1","account_id":"demo-checking","amount":-3000.00,"date":"2026-06-25","name":"ACME CORP DIRECT DEP","category":["Payroll"],"iso_currency_code":"USD"},
    {"transaction_id":"t2","account_id":"demo-checking","amount":-3000.00,"date":"2026-06-11","name":"ACME CORP DIRECT DEP","category":["Payroll"],"iso_currency_code":"USD"},
    {"transaction_id":"t3","account_id":"demo-checking","amount":1850.00,"date":"2026-06-18","name":"Rent Payment","category":["Payment","Rent"],"iso_currency_code":"USD"},
    {"transaction_id":"t4","account_id":"demo-checking","amount":142.30,"date":"2026-06-20","name":"Whole Foods Market","category":["Food and Drink","Groceries"],"iso_currency_code":"USD"},
    {"transaction_id":"t5","account_id":"demo-credit","amount":89.99,"date":"2026-06-15","name":"Amazon","category":["Shops"],"iso_currency_code":"USD"},
    {"transaction_id":"t6","account_id":"demo-credit","amount":34.50,"date":"2026-06-22","name":"Uber","category":["Travel"],"iso_currency_code":"USD"}
  ]'::jsonb,
  now()
);

-- 3) Ensure the profile is Gold tier + onboarding complete (so cohort + tier render).
INSERT INTO profiles (id, name, tier, onboarding_complete, percentile, streak_days)
VALUES ('5fefe3de-003b-4c2b-92eb-b3f25c8aeb17', 'Alex Morgan', 'GOLD', true, 72, 12)
ON CONFLICT (id) DO UPDATE
  SET tier = 'GOLD',
      onboarding_complete = true,
      name = COALESCE(profiles.name, EXCLUDED.name),
      percentile = COALESCE(profiles.percentile, EXCLUDED.percentile);
