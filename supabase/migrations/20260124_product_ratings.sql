-- Product ratings per user (used for recommendation sorting + history)
-- Run this in Supabase SQL editor.

create extension if not exists "pgcrypto";

create table if not exists public.product_ratings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id int not null,
  brand text null,
  product_name text null,
  tag text null,
  rating int not null check (rating between 1 and 5),
  last_prediction_id uuid null references public.predictions(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, product_id)
);

create index if not exists product_ratings_user_updated_at_idx
  on public.product_ratings (user_id, updated_at desc);

create index if not exists product_ratings_user_tag_idx
  on public.product_ratings (user_id, tag);

alter table public.product_ratings enable row level security;

-- RLS: user can read/write only their own ratings
create policy if not exists "product_ratings_select_own"
  on public.product_ratings
  for select
  using (auth.uid() = user_id);

create policy if not exists "product_ratings_insert_own"
  on public.product_ratings
  for insert
  with check (auth.uid() = user_id);

create policy if not exists "product_ratings_update_own"
  on public.product_ratings
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy if not exists "product_ratings_delete_own"
  on public.product_ratings
  for delete
  using (auth.uid() = user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_product_ratings_updated_at on public.product_ratings;
create trigger trg_product_ratings_updated_at
before update on public.product_ratings
for each row execute function public.set_updated_at();
