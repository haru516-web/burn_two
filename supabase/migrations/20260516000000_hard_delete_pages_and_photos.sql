grant select, insert, update, delete on public.completed_pages to authenticated;
grant select, insert, update, delete on public.photo_assets to authenticated;

drop policy if exists "completed_pages_delete_author" on public.completed_pages;
create policy "completed_pages_delete_author"
on public.completed_pages for delete
to authenticated
using (author_id = auth.uid());

drop policy if exists "photo_assets_delete_author" on public.photo_assets;
create policy "photo_assets_delete_author"
on public.photo_assets for delete
to authenticated
using (coalesce(author_id, user_id) = auth.uid());

drop policy if exists "photo_assets_storage_delete_own_folder" on storage.objects;
create policy "photo_assets_storage_delete_own_folder"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'photo-assets'
  and exists (
    select 1 from public.space_members sm
    where sm.space_id::text = (storage.foldername(name))[1]
      and sm.user_id = auth.uid()
  )
);

drop policy if exists "completed_pages_storage_delete_own_folder" on storage.objects;
create policy "completed_pages_storage_delete_own_folder"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'completed-pages'
  and exists (
    select 1 from public.space_members sm
    where sm.space_id::text = (storage.foldername(name))[1]
      and sm.user_id = auth.uid()
  )
);
