-- supabase/migrations/0002_escrow_settlement.sql
-- Records how a held escrow amount was split at settlement: the portion
-- captured to us vs. the unused cap returned to the customer. Null until a
-- payment is settled (and on the full-refund path).
alter table payments
  add column captured_jpy integer,
  add column refunded_jpy integer;

-- When settled, the split must reconcile exactly to the held amount.
alter table payments
  add constraint payments_settlement_split_chk check (
    captured_jpy is null
    or (
      captured_jpy >= 0
      and refunded_jpy >= 0
      and captured_jpy + refunded_jpy = amount_jpy
    )
  );
