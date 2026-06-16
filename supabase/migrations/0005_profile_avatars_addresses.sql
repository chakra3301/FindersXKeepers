-- 0005: Profile avatars + saved shipping address book.
-- Avatar bucket is PUBLIC (avatars are not sensitive; the nav renders <img>
-- with no signed-URL plumbing). Addresses are owner-only. A request stores a
-- frozen JSON snapshot of the chosen address so later edits/deletes of the
-- saved address never change a destination already committed to.

-- Public avatars bucket. Object paths: {user_id}/avatar-{timestamp}.{ext}
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  3145728,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

-- Owners may write/delete only under their own {auth.uid()}/ prefix.
create policy "avatars_owner_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars_owner_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars_owner_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Avatar URL on the profile.
alter table profiles add column if not exists avatar_url text;

-- Saved shipping addresses (owner-only).
create table if not exists addresses (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  recipient_name text not null,
  line1          text not null,
  line2          text,
  city           text not null,
  region         text,
  postal_code    text not null,
  country        text not null,
  phone          text,
  is_default     boolean not null default false,
  created_at     timestamptz not null default now()
);

-- At most one default address per user.
create unique index if not exists addresses_one_default_per_user
  on addresses (user_id) where is_default;

create index if not exists addresses_user_id_idx on addresses (user_id);

alter table addresses enable row level security;

create policy "addresses_select_own" on addresses
  for select using (auth.uid() = user_id);
create policy "addresses_insert_own" on addresses
  for insert with check (auth.uid() = user_id);
create policy "addresses_update_own" on addresses
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "addresses_delete_own" on addresses
  for delete using (auth.uid() = user_id);

-- Frozen destination snapshot on the request (set at deposit, optional).
alter table requests add column if not exists shipping_address jsonb;
