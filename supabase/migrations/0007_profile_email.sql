-- 0007: Mirror the auth email onto the profile row.
-- The passwordless (OTP) login flow needs to tell a NEW email from a RETURNING
-- one before sending a code, so it can show the right screen. `auth.users` isn't
-- reachable over the REST API, so we keep a lower-cased copy of the email on the
-- owner-scoped `profiles` row (written by the same trigger that creates it) and
-- look it up with the service-role client. Also handy for the email layer.
alter table profiles add column if not exists email text;

-- Case-insensitive uniqueness; emails are normalised to lower-case on write.
create unique index if not exists profiles_email_key on profiles (lower(email));

-- Backfill existing rows from auth.users.
update profiles p
set email = lower(u.email)
from auth.users u
where u.id = p.id and p.email is null;

-- Extend the new-user trigger to capture the email alongside the profile row.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, lower(new.email))
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;
