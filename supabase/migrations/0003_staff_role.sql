-- Staff role for the operator console. is_staff is readable by the owner via
-- RLS; only the service role may flip it (see trigger below).

alter table profiles add column is_staff boolean not null default false;

create or replace function prevent_self_staff_promotion()
returns trigger language plpgsql as $$
begin
  if new.is_staff is distinct from old.is_staff
     and auth.role() <> 'service_role' then
    raise exception 'is_staff can only be changed by the service role';
  end if;
  return new;
end $$;

create trigger profiles_no_self_staff
  before update on profiles
  for each row execute function prevent_self_staff_promotion();
