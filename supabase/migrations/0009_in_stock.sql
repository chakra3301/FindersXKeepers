-- In-stock items: a direct store purchase (no finder's fee, no sourcing wait).
-- Requests created from /in-stock set this true so checkout + lifecycle branch
-- to "purchase & receive" instead of the escrow/sourcing flow.
alter table public.requests
  add column if not exists in_stock boolean not null default false;
