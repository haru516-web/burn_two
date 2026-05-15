alter table public.photo_assets
  add column if not exists price text not null default '',
  add column if not exists time_of_day text not null default '',
  add column if not exists atmosphere text not null default '',
  add column if not exists weather text not null default '',
  add column if not exists mood text not null default '',
  add column if not exists tags text[] not null default '{}';

update public.photo_assets
set tags = array_remove(array[
    nullif(trim(place), ''),
    nullif(trim(memo), ''),
    nullif(trim(price), ''),
    nullif(trim(time_of_day), ''),
    nullif(trim(atmosphere), ''),
    nullif(trim(weather), ''),
    nullif(trim(mood), '')
  ], null)
where tags is null or cardinality(tags) = 0;

create index if not exists photo_assets_tags_gin_idx
on public.photo_assets using gin (tags);
