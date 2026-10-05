-- Storage buckets and policies (docs/architecture.md §6 → Storage buckets, docs/roles.md §1, §3, §4).
-- Paths: public-media  profiles/{profile_id}/… · posts/{post_id}/… · events/{event_id}/… · site/…
--        member-documents  library/{document_id}/{filename}
--        board-vault  legal/… · receipts/{entry_id}/… · correspondence/{id}/…
-- Private files are served with short-lived signed URLs after a server-side check.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('public-media', 'public-media', true, 5 * 1024 * 1024,
   array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']),
  ('member-documents', 'member-documents', false, 20 * 1024 * 1024,
   array['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'text/plain', 'text/markdown',
         'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
         'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
         'application/vnd.oasis.opendocument.text', 'application/vnd.oasis.opendocument.spreadsheet']),
  ('board-vault', 'board-vault', false, 20 * 1024 * 1024,
   array['application/pdf', 'image/jpeg', 'image/png', 'image/webp',
         'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
         'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Who may write a public-media path: managers into their profile's folder, the board into posts/
-- and events/, admins anywhere.
create function private.can_write_public_media(object_name text) returns boolean
  language sql stable security definer set search_path = ''
as $$
  select case (storage.foldername(object_name))[1]
    when 'profiles' then private.manages_profile(private.try_uuid((storage.foldername(object_name))[2]))
                         or private.has_role('admin')
    when 'posts' then private.has_role('board')
    when 'events' then private.has_role('board')
    when 'site' then private.has_role('admin')
    else false
  end
$$;

-- A member-documents object is readable when its documents row is (audience check via RLS rules).
create function private.can_read_member_document(object_name text) returns boolean
  language sql stable security definer set search_path = ''
as $$
  select (storage.foldername(object_name))[1] = 'library' and exists (
    select 1 from public.documents d
    where d.id = private.try_uuid((storage.foldername(object_name))[2])
      and d.collection = 'library'
      and private.has_role(d.audience)
  )
$$;

grant execute on function private.can_write_public_media(text), private.can_read_member_document(text)
  to anon, authenticated, service_role;

-- public-media
create policy "public-media: anyone reads" on storage.objects for select to anon, authenticated
  using (bucket_id = 'public-media');
create policy "public-media: scoped uploads" on storage.objects for insert to authenticated
  with check (bucket_id = 'public-media' and private.can_write_public_media(name));
create policy "public-media: scoped updates" on storage.objects for update to authenticated
  using (bucket_id = 'public-media' and private.can_write_public_media(name))
  with check (bucket_id = 'public-media' and private.can_write_public_media(name));
create policy "public-media: scoped deletes" on storage.objects for delete to authenticated
  using (bucket_id = 'public-media' and private.can_write_public_media(name));

-- member-documents
create policy "member-documents: read by document audience" on storage.objects for select to authenticated
  using (bucket_id = 'member-documents' and private.can_read_member_document(name));
create policy "member-documents: board uploads" on storage.objects for insert to authenticated
  with check (bucket_id = 'member-documents' and (select private.has_role('board')));
create policy "member-documents: board updates" on storage.objects for update to authenticated
  using (bucket_id = 'member-documents' and (select private.has_role('board')))
  with check (bucket_id = 'member-documents' and (select private.has_role('board')));
create policy "member-documents: board deletes" on storage.objects for delete to authenticated
  using (bucket_id = 'member-documents' and (select private.has_role('board')));

-- board-vault: board only; legal files are deleted by admins only.
create policy "board-vault: board reads" on storage.objects for select to authenticated
  using (bucket_id = 'board-vault' and (select private.has_role('board')));
create policy "board-vault: board uploads" on storage.objects for insert to authenticated
  with check (bucket_id = 'board-vault' and (select private.has_role('board'))
              and (storage.foldername(name))[1] in ('legal', 'receipts', 'correspondence'));
create policy "board-vault: board updates" on storage.objects for update to authenticated
  using (bucket_id = 'board-vault' and (select private.has_role('board')))
  with check (bucket_id = 'board-vault' and (select private.has_role('board')));
create policy "board-vault: deletes" on storage.objects for delete to authenticated
  using (bucket_id = 'board-vault' and (
    ((storage.foldername(name))[1] in ('receipts', 'correspondence') and (select private.has_role('board')))
    or (select private.has_role('admin'))));
