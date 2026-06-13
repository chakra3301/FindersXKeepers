-- =============================================================================
-- Finders × Keepers — initial schema
-- Tables, enums, RLS, triggers for the concierge sourcing lifecycle.
-- Apply once: paste into the Supabase SQL Editor, or `supabase db push`.
-- =============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- Enums
-- ----------------------------------------------------------------------------
-- Request lifecycle. The legal transitions live in the app state machine
-- (src/lib/requests/state-machine.ts) — this enum is just the vocabulary.
create type request_status as enum (
  'open',
  'sourcing',
  'candidate_sent',
  'approved',
  'purchased',
  'received',
  'shipped',
  'released',
  'refunded',
  'cancelled'
);

create type min_condition as enum (
  'new',
  'like_new',
  'good',
  'acceptable',
  'any'
);

create type rush_tier as enum (
  'standard',
  'priority',
  'express'
);

create type candidate_status as enum (
  'proposed',
  'approved',
  'rejected'
);

create type receipt_status as enum (
  'pending',
  'accepted',
  'rejected'
);

-- Escrow lifecycle as modelled by the payment processor: funds are held by the
-- processor and released on our trigger. They never land in our own balance.
create type payment_status as enum (
  'pending',
  'held',
  'released',
  'refunded',
  'failed'
);

create type message_sender as enum (
  'customer',
  'team'
);

-- ----------------------------------------------------------------------------
-- Tables
-- ----------------------------------------------------------------------------
create table profiles (
  id              uuid primary key references auth.users (id) on delete cascade,
  shipping_country text,
  currency_pref   text not null default 'USD',
  created_at      timestamptz not null default now()
);

create table requests (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users (id) on delete cascade,
  title               text not null,
  description         text,
  reference_image_url text,
  reference_url       text,
  min_condition       min_condition not null default 'any',
  must_haves          jsonb not null default '[]'::jsonb,
  nice_to_haves       jsonb not null default '[]'::jsonb,
  budget_cap_jpy      integer check (budget_cap_jpy is null or budget_cap_jpy >= 0),
  rush_tier           rush_tier not null default 'standard',
  status              request_status not null default 'open',
  deadline_at         timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create table candidates (
  id             uuid primary key default gen_random_uuid(),
  request_id     uuid not null references requests (id) on delete cascade,
  listing_url    text,
  listing_images jsonb not null default '[]'::jsonb,
  price_jpy      integer check (price_jpy is null or price_jpy >= 0),
  notes          text,
  status         candidate_status not null default 'proposed',
  created_at     timestamptz not null default now()
);

-- Pricing is always four separate lines. total_jpy is a generated column so it
-- can never drift from the sum — never an opaque single number.
create table orders (
  id                  uuid primary key default gen_random_uuid(),
  request_id          uuid not null references requests (id) on delete cascade,
  candidate_id        uuid references candidates (id) on delete set null,
  item_cost_jpy       integer not null default 0 check (item_cost_jpy >= 0),
  finder_fee_jpy      integer not null default 0 check (finder_fee_jpy >= 0),
  shipping_jpy        integer not null default 0 check (shipping_jpy >= 0),
  tax_jpy             integer not null default 0 check (tax_jpy >= 0),
  total_jpy           integer generated always as
                        (item_cost_jpy + finder_fee_jpy + shipping_jpy + tax_jpy) stored,
  received_image_urls jsonb not null default '[]'::jsonb,
  receipt_status      receipt_status not null default 'pending',
  created_at          timestamptz not null default now()
);

create table shipments (
  id              uuid primary key default gen_random_uuid(),
  order_id        uuid not null references orders (id) on delete cascade,
  carrier         text,
  tracking_number text,
  shipped_at      timestamptz,
  created_at      timestamptz not null default now()
);

create table messages (
  id         uuid primary key default gen_random_uuid(),
  request_id uuid not null references requests (id) on delete cascade,
  sender     message_sender not null,
  body       text not null,
  created_at timestamptz not null default now()
);

create table payments (
  id                       uuid primary key default gen_random_uuid(),
  request_id               uuid not null references requests (id) on delete cascade,
  stripe_payment_intent_id text,
  amount_jpy               integer not null check (amount_jpy >= 0),
  status                   payment_status not null default 'pending',
  created_at               timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Indexes
-- ----------------------------------------------------------------------------
create index requests_user_id_idx   on requests (user_id);
create index requests_status_idx    on requests (status);
create index candidates_request_idx on candidates (request_id);
create index orders_request_idx     on orders (request_id);
create index shipments_order_idx    on shipments (order_id);
create index messages_request_idx   on messages (request_id, created_at);
create index payments_request_idx   on payments (request_id);

-- ----------------------------------------------------------------------------
-- Triggers
-- ----------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger requests_set_updated_at
  before update on requests
  for each row execute function set_updated_at();

-- Auto-create a profile row when a new auth user signs up.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ----------------------------------------------------------------------------
-- Row Level Security
-- A user only ever touches rows tied to their own user_id. The service-role
-- key (server-only: seeding + team lifecycle actions) bypasses RLS entirely.
-- ----------------------------------------------------------------------------
alter table profiles   enable row level security;
alter table requests   enable row level security;
alter table candidates enable row level security;
alter table orders     enable row level security;
alter table shipments  enable row level security;
alter table messages   enable row level security;
alter table payments   enable row level security;

-- profiles: owner-only
create policy "profiles_select_own" on profiles
  for select using (auth.uid() = id);
create policy "profiles_insert_own" on profiles
  for insert with check (auth.uid() = id);
create policy "profiles_update_own" on profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- requests: full ownership by the customer
create policy "requests_select_own" on requests
  for select using (auth.uid() = user_id);
create policy "requests_insert_own" on requests
  for insert with check (auth.uid() = user_id);
create policy "requests_update_own" on requests
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "requests_delete_own" on requests
  for delete using (auth.uid() = user_id);

-- Helper predicate reused below: does this request belong to the caller?
-- (Inlined per-table because Postgres RLS can't share a macro.)

-- candidates: owner may read, and approve/reject (update)
create policy "candidates_select_own" on candidates
  for select using (exists (
    select 1 from requests r where r.id = candidates.request_id and r.user_id = auth.uid()
  ));
create policy "candidates_update_own" on candidates
  for update using (exists (
    select 1 from requests r where r.id = candidates.request_id and r.user_id = auth.uid()
  ));

-- orders: owner read-only (orders are team/system-written via service role)
create policy "orders_select_own" on orders
  for select using (exists (
    select 1 from requests r where r.id = orders.request_id and r.user_id = auth.uid()
  ));

-- shipments: owner read-only, reached through the parent order → request
create policy "shipments_select_own" on shipments
  for select using (exists (
    select 1 from orders o
    join requests r on r.id = o.request_id
    where o.id = shipments.order_id and r.user_id = auth.uid()
  ));

-- messages: owner reads the thread and may post (only as 'customer')
create policy "messages_select_own" on messages
  for select using (exists (
    select 1 from requests r where r.id = messages.request_id and r.user_id = auth.uid()
  ));
create policy "messages_insert_own" on messages
  for insert with check (
    sender = 'customer' and exists (
      select 1 from requests r where r.id = messages.request_id and r.user_id = auth.uid()
    )
  );

-- payments: owner read-only. Payment rows are written only by the processor
-- integration via the service role — customers never write money state.
create policy "payments_select_own" on payments
  for select using (exists (
    select 1 from requests r where r.id = payments.request_id and r.user_id = auth.uid()
  ));

-- ----------------------------------------------------------------------------
-- Storage: proof images bucket (private). Upload flow is deferred per roadmap;
-- provisioned now so the seam exists.
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('proof-images', 'proof-images', false)
on conflict (id) do nothing;
