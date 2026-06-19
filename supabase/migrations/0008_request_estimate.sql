-- 0008: Persist the AI item-value estimate on the request.
-- Computed at deposit (open -> sourcing) by the estimator and shown in the
-- operator console so the team has a target price + a "needs review" flag for
-- low-confidence items before they start sourcing. Purely advisory: it never
-- changes what the customer is charged (the four-line order still rules).
alter table requests add column if not exists est_value_jpy      integer;
alter table requests add column if not exists est_value_low_jpy  integer;
alter table requests add column if not exists est_value_high_jpy integer;
alter table requests add column if not exists est_confidence      real;
alter table requests add column if not exists est_needs_review    boolean not null default false;
alter table requests add column if not exists est_category        text;
alter table requests add column if not exists est_sources         jsonb not null default '[]'::jsonb;
alter table requests add column if not exists est_updated_at      timestamptz;
