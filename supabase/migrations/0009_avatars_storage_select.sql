-- 0009: Avatars bucket SELECT for authenticated owners.
-- Required for storage.upload({ upsert: true }) and listing a user's folder.
-- Public reads still use /object/public/… and do not need this policy.

create policy "avatars_owner_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
