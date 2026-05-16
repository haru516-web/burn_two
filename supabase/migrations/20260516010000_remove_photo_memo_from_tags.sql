update public.photo_assets
set tags = array_remove(tags, btrim(memo))
where memo is not null
  and btrim(memo) <> ''
  and tags @> array[btrim(memo)]::text[];
