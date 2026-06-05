alter table public.profiles
  add column if not exists is_premium boolean default false,
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists premium_since timestamptz;
