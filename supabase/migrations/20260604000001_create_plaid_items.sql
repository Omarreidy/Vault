create table if not exists public.plaid_items (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  item_id text not null unique,
  access_token text not null,
  accounts jsonb default '[]',
  transactions jsonb default '[]',
  updated_at timestamptz default now()
);

alter table public.plaid_items enable row level security;

create policy "Users can read own plaid items"
  on public.plaid_items for select
  using (auth.uid() = user_id);

create policy "Users can insert own plaid items"
  on public.plaid_items for insert
  with check (auth.uid() = user_id);

create policy "Users can update own plaid items"
  on public.plaid_items for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
