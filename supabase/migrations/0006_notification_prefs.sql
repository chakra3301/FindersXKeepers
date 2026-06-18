-- 0006: Persisted email notification preferences.
-- Replaces the presentational toggles on /account with real, owner-scoped
-- columns. Financial confirmations (escrow deposit, refund) always send and are
-- intentionally NOT gated by a column; `notify_shipped` is the one toggle wired
-- to a send today. `notify_action_needed` / `notify_messages` are stored now and
-- gate future emails. Default opt-in (true) — transactional, not marketing.
alter table profiles add column if not exists notify_action_needed boolean not null default true;
alter table profiles add column if not exists notify_messages       boolean not null default true;
alter table profiles add column if not exists notify_shipped         boolean not null default true;
