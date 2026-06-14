-- Private Storage bucket for proof / listing / reference images.
-- Object paths: requests/{request_id}/{category}/{uuid}.{ext}
-- DB columns store the path (not a public URL); the app signs URLs at render time.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'proofs',
  'proofs',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

-- Extract request_id from paths like requests/{uuid}/listing/….
create or replace function public.proof_request_id_from_path(path text)
returns uuid
language sql
immutable
as $$
  select nullif(split_part(path, '/', 2), '')::uuid;
$$;

-- Staff: full read/write on the proofs bucket.
create policy "proofs_staff_all" on storage.objects
  for all to authenticated
  using (
    bucket_id = 'proofs'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_staff = true
    )
  )
  with check (
    bucket_id = 'proofs'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_staff = true
    )
  );

-- Customers: read objects tied to their own requests.
create policy "proofs_customer_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'proofs'
    and exists (
      select 1 from public.requests r
      where r.id = public.proof_request_id_from_path(name)
        and r.user_id = auth.uid()
    )
  );

-- Customers: upload only into their own request folders.
create policy "proofs_customer_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'proofs'
    and exists (
      select 1 from public.requests r
      where r.id = public.proof_request_id_from_path(name)
        and r.user_id = auth.uid()
    )
  );
