-- Storage layout (see docs/api-routes.md for the full strategy):
--   mock-uploads/{uploader_id}/{mock_id}/{filename}   — original CSV/JSON custom-mock uploads
--   note-files/{user_id}/{note_id}/{filename}         — PDF notes / camera-scanned images
-- Both buckets are PRIVATE. There is no public bucket in this app: even "public" Vault
-- notes are only ever served via a signed URL issued by /api/uploads/signed-url after an
-- explicit visibility check, so download counting and revocation stay possible.

insert into storage.buckets (id, name, public, file_size_limit)
values
  ('mock-uploads', 'mock-uploads', false, 26214400),
  ('note-files', 'note-files', false, 26214400)
on conflict (id) do nothing;

-- A user may write only inside their own folder (first path segment = their uid) in
-- either bucket. Community mock uploads are separately readable app-wide via the
-- `user_uploaded_mocks_select_all` RLS policy + the signed-URL route, not via a broad
-- storage SELECT policy — so private note files stay private by default.
create policy "own_folder_insert_mock_uploads" on storage.objects for insert
  with check (bucket_id = 'mock-uploads' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "own_folder_select_mock_uploads" on storage.objects for select
  using (bucket_id = 'mock-uploads' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "own_folder_insert_note_files" on storage.objects for insert
  with check (bucket_id = 'note-files' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "own_folder_select_note_files" on storage.objects for select
  using (bucket_id = 'note-files' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "own_folder_delete_note_files" on storage.objects for delete
  using (bucket_id = 'note-files' and (storage.foldername(name))[1] = auth.uid()::text);
