with candidate_pages as (
  select
    cp.id,
    cp.editor_snapshot_json,
    case
      when jsonb_typeof(cp.editor_snapshot_json #> '{composeData,recordMemoryIds}') = 'array'
        then cp.editor_snapshot_json #> '{composeData,recordMemoryIds}'
      when jsonb_typeof(cp.editor_snapshot_json -> 'recordMemoryIds') = 'array'
        then cp.editor_snapshot_json -> 'recordMemoryIds'
      else '[]'::jsonb
    end as record_memory_ids
  from public.completed_pages cp
  where cp.editor_snapshot_json ? 'recordPhotoTags'
     or cp.editor_snapshot_json #> '{composeData,recordPhotoTags}' is not null
     or cp.editor_snapshot_json ? 'freeTags'
),
page_photo_memos as (
  select
    candidate_pages.id,
    array_agg(distinct btrim(photo_assets.memo)) filter (where btrim(photo_assets.memo) <> '') as memos
  from candidate_pages
  join lateral jsonb_array_elements_text(candidate_pages.record_memory_ids) as memory_ids(photo_id) on true
  join public.photo_assets
    on photo_assets.id::text = memory_ids.photo_id
  group by candidate_pages.id
),
cleaned_pages as (
  select
    candidate_pages.id,
    candidate_pages.editor_snapshot_json,
    (
      select coalesce(jsonb_agg(to_jsonb(tag) order by ord), '[]'::jsonb)
      from jsonb_array_elements_text(
        case
          when jsonb_typeof(candidate_pages.editor_snapshot_json -> 'recordPhotoTags') = 'array'
            then candidate_pages.editor_snapshot_json -> 'recordPhotoTags'
          else '[]'::jsonb
        end
      ) with ordinality as tags(tag, ord)
      where not (tag = any(coalesce(page_photo_memos.memos, '{}'::text[])))
    ) as clean_record_tags,
    (
      select coalesce(jsonb_agg(to_jsonb(tag) order by ord), '[]'::jsonb)
      from jsonb_array_elements_text(
        case
          when jsonb_typeof(candidate_pages.editor_snapshot_json #> '{composeData,recordPhotoTags}') = 'array'
            then candidate_pages.editor_snapshot_json #> '{composeData,recordPhotoTags}'
          else '[]'::jsonb
        end
      ) with ordinality as tags(tag, ord)
      where not (tag = any(coalesce(page_photo_memos.memos, '{}'::text[])))
    ) as clean_compose_record_tags,
    (
      select coalesce(jsonb_agg(to_jsonb(tag) order by ord), '[]'::jsonb)
      from jsonb_array_elements_text(
        case
          when jsonb_typeof(candidate_pages.editor_snapshot_json -> 'freeTags') = 'array'
            then candidate_pages.editor_snapshot_json -> 'freeTags'
          else '[]'::jsonb
        end
      ) with ordinality as tags(tag, ord)
      where not (tag = any(coalesce(page_photo_memos.memos, '{}'::text[])))
    ) as clean_free_tags
  from candidate_pages
  join page_photo_memos on page_photo_memos.id = candidate_pages.id
),
patched_record_tags as (
  select
    cleaned_pages.id,
    case
      when cleaned_pages.editor_snapshot_json ? 'recordPhotoTags'
        then jsonb_set(cleaned_pages.editor_snapshot_json, '{recordPhotoTags}', cleaned_pages.clean_record_tags, true)
      else cleaned_pages.editor_snapshot_json
    end as editor_snapshot_json,
    cleaned_pages.clean_compose_record_tags,
    cleaned_pages.clean_free_tags
  from cleaned_pages
),
patched_compose_tags as (
  select
    patched_record_tags.id,
    case
      when patched_record_tags.editor_snapshot_json #> '{composeData,recordPhotoTags}' is not null
        then jsonb_set(patched_record_tags.editor_snapshot_json, '{composeData,recordPhotoTags}', patched_record_tags.clean_compose_record_tags, true)
      else patched_record_tags.editor_snapshot_json
    end as editor_snapshot_json,
    patched_record_tags.clean_free_tags
  from patched_record_tags
),
patched_pages as (
  select
    patched_compose_tags.id,
    case
      when patched_compose_tags.editor_snapshot_json ? 'freeTags'
        then jsonb_set(patched_compose_tags.editor_snapshot_json, '{freeTags}', patched_compose_tags.clean_free_tags, true)
      else patched_compose_tags.editor_snapshot_json
    end as editor_snapshot_json
  from patched_compose_tags
)
update public.completed_pages
set editor_snapshot_json = patched_pages.editor_snapshot_json,
    updated_at = now()
from patched_pages
where completed_pages.id = patched_pages.id
  and completed_pages.editor_snapshot_json is distinct from patched_pages.editor_snapshot_json;
