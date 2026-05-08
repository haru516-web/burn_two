-- BURN Supabase schema snapshot.
-- Safe to re-run: no destructive drop/truncate/delete statements are used.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.memory_spaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null default 'My BURN',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.space_members (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.memory_spaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  created_at timestamptz not null default now(),
  unique (space_id, user_id)
);

create table if not exists public.completed_pages (
  id uuid primary key default gen_random_uuid(),
  page_id text,
  space_id uuid not null references public.memory_spaces(id) on delete cascade,
  display_space_id uuid references public.memory_spaces(id) on delete set null,
  author_id uuid not null references public.profiles(id) on delete cascade,
  display_scope text not null default 'couple' check (display_scope in ('personal', 'couple')),
  title text not null default 'Untitled',
  final_image_path text,
  is_locked boolean not null default true,
  final_base_image_path text,
  final_preview_image_path text,
  editor_snapshot_json jsonb not null default '{}'::jsonb,
  text_layers_json jsonb not null default '{}'::jsonb,
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.completed_pages
  add column if not exists page_id text,
  add column if not exists space_id uuid references public.memory_spaces(id) on delete cascade,
  add column if not exists display_space_id uuid references public.memory_spaces(id) on delete set null,
  add column if not exists author_id uuid references public.profiles(id) on delete set null,
  add column if not exists save_scope text not null default 'couple' check (save_scope in ('personal', 'couple')),
  add column if not exists display_scope text not null default 'couple' check (display_scope in ('personal', 'couple')),
  add column if not exists title text not null default 'Untitled',
  add column if not exists final_image_path text,
  add column if not exists is_locked boolean not null default true,
  add column if not exists final_base_image_path text,
  add column if not exists final_preview_image_path text,
  add column if not exists editor_snapshot_json jsonb not null default '{}'::jsonb,
  add column if not exists text_layers_json jsonb not null default '{}'::jsonb,
  add column if not exists completed_at timestamptz not null default now(),
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

update public.completed_pages
set save_scope = 'couple'
where save_scope is null;

update public.completed_pages
set display_scope = coalesce(display_scope, save_scope, 'couple')
where display_scope is null;

update public.completed_pages
set display_space_id = space_id
where display_scope = 'couple'
  and display_space_id is null;

alter table public.completed_pages
  alter column save_scope set default 'couple',
  alter column save_scope set not null;

alter table public.completed_pages
  alter column display_scope set default 'couple',
  alter column display_scope set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'completed_pages_save_scope_check'
  ) then
    alter table public.completed_pages
      add constraint completed_pages_save_scope_check
      check (save_scope in ('personal', 'couple'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'completed_pages_display_scope_check'
  ) then
    alter table public.completed_pages
      add constraint completed_pages_display_scope_check
      check (display_scope in ('personal', 'couple'));
  end if;
end $$;

create table if not exists public.photo_assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  space_id uuid references public.memory_spaces(id) on delete set null,
  memory_space_id uuid references public.memory_spaces(id) on delete set null,
  source_type text not null check (source_type in ('camera', 'album')),
  storage_path text not null,
  thumbnail_path text,
  used_in_page_id uuid references public.completed_pages(id) on delete set null,
  captured_at timestamptz not null default now(),
  expires_at timestamptz not null,
  deleted_at timestamptz,
  retention_days integer not null default 3,
  is_protected_by_plan boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.photo_assets
  add column if not exists space_id uuid references public.memory_spaces(id) on delete set null,
  add column if not exists memory_space_id uuid references public.memory_spaces(id) on delete set null,
  add column if not exists thumbnail_path text,
  add column if not exists expires_at timestamptz,
  add column if not exists retention_days integer not null default 3,
  add column if not exists deleted_at timestamptz;

update public.photo_assets
set space_id = coalesce(space_id, memory_space_id),
    memory_space_id = coalesce(memory_space_id, space_id)
where space_id is null
   or memory_space_id is null;

create or replace function public.sync_photo_asset_space_ids()
returns trigger
language plpgsql
as $$
begin
  new.space_id := coalesce(new.space_id, new.memory_space_id);
  new.memory_space_id := coalesce(new.memory_space_id, new.space_id);
  return new;
end;
$$;

drop trigger if exists sync_photo_asset_space_ids on public.photo_assets;
create trigger sync_photo_asset_space_ids
before insert or update on public.photo_assets
for each row
execute function public.sync_photo_asset_space_ids();

create table if not exists public.page_text_layers (
  id uuid primary key default gen_random_uuid(),
  completed_page_id uuid not null references public.completed_pages(id) on delete cascade,
  layer_key text not null,
  text text not null default '',
  style_json jsonb not null default '{}'::jsonb,
  z_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  memory_space_id uuid references public.memory_spaces(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null default '',
  target_type text,
  target_id uuid,
  delivery_channels_json jsonb not null default '["in_app"]'::jsonb,
  scheduled_for timestamptz,
  sent_at timestamptz,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.space_invites (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.memory_spaces(id) on delete cascade,
  inviter_id uuid not null references public.profiles(id) on delete cascade,
  invitee_email text,
  token text not null unique,
  accepted_by uuid references public.profiles(id) on delete set null,
  accepted_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.space_invites
  add column if not exists space_id uuid references public.memory_spaces(id) on delete cascade,
  add column if not exists inviter_id uuid references public.profiles(id) on delete cascade,
  add column if not exists invitee_email text,
  add column if not exists token text,
  add column if not exists accepted_by uuid references public.profiles(id) on delete set null,
  add column if not exists accepted_at timestamptz,
  add column if not exists expires_at timestamptz,
  add column if not exists created_at timestamptz not null default now();

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'space_invites'
      and column_name = 'invited_by'
  ) then
    update public.space_invites
    set inviter_id = invited_by
    where inviter_id is null
      and invited_by is not null;
  end if;
end;
$$;

create table if not exists public.invite_links (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.memory_spaces(id) on delete cascade,
  inviter_id uuid not null references public.profiles(id) on delete cascade,
  code text not null unique,
  accepted_by uuid references public.profiles(id) on delete set null,
  accepted_at timestamptz,
  used_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.invite_links
  add column if not exists couple_id uuid references public.memory_spaces(id) on delete cascade,
  add column if not exists inviter_id uuid references public.profiles(id) on delete cascade,
  add column if not exists code text,
  add column if not exists accepted_by uuid references public.profiles(id) on delete set null,
  add column if not exists accepted_at timestamptz,
  add column if not exists used_at timestamptz,
  add column if not exists expires_at timestamptz,
  add column if not exists created_at timestamptz not null default now();

create unique index if not exists invite_links_code_key on public.invite_links (code);

alter table public.profiles enable row level security;
alter table public.memory_spaces enable row level security;
alter table public.space_members enable row level security;
alter table public.completed_pages enable row level security;
alter table public.photo_assets enable row level security;
alter table public.page_text_layers enable row level security;
alter table public.notifications enable row level security;
alter table public.space_invites enable row level security;
alter table public.invite_links enable row level security;

grant usage on schema public to authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update on public.memory_spaces to authenticated;
grant select, insert, update on public.space_members to authenticated;
grant select, insert, update on public.completed_pages to authenticated;
grant select, insert, update on public.photo_assets to authenticated;
grant select, insert, update on public.page_text_layers to authenticated;
grant select, insert, update on public.notifications to authenticated;
grant select, insert, update on public.space_invites to authenticated;
grant select, insert, update on public.invite_links to authenticated;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles for select
to authenticated
using (id = auth.uid());

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles for insert
to authenticated
with check (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "space_members_select_member" on public.space_members;
create policy "space_members_select_member"
on public.space_members for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "space_members_insert_self" on public.space_members;
create policy "space_members_insert_self"
on public.space_members for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "memory_spaces_select_member" on public.memory_spaces;
create policy "memory_spaces_select_member"
on public.memory_spaces for select
to authenticated
using (
  owner_id = auth.uid()
  or exists (
    select 1 from public.space_members sm
    where sm.space_id = memory_spaces.id
      and sm.user_id = auth.uid()
  )
);

drop policy if exists "memory_spaces_insert_owner" on public.memory_spaces;
create policy "memory_spaces_insert_owner"
on public.memory_spaces for insert
to authenticated
with check (owner_id = auth.uid());

drop policy if exists "completed_pages_select_member" on public.completed_pages;
create policy "completed_pages_select_member"
on public.completed_pages for select
to authenticated
using (
  author_id = auth.uid()
  or exists (
    select 1 from public.space_members sm
    where sm.space_id = completed_pages.display_space_id
      and sm.user_id = auth.uid()
  )
);

drop policy if exists "completed_pages_insert_author" on public.completed_pages;
create policy "completed_pages_insert_author"
on public.completed_pages for insert
to authenticated
with check (
  author_id = auth.uid()
  and exists (
    select 1 from public.space_members sm
    where sm.space_id = completed_pages.space_id
      and sm.user_id = auth.uid()
  )
  and (
    completed_pages.display_space_id is null
    or exists (
      select 1 from public.space_members sm
      where sm.space_id = completed_pages.display_space_id
        and sm.user_id = auth.uid()
    )
  )
);

drop policy if exists "completed_pages_update_author" on public.completed_pages;
create policy "completed_pages_update_author"
on public.completed_pages for update
to authenticated
using (author_id = auth.uid())
with check (
  author_id = auth.uid()
  and (
    completed_pages.display_space_id is null
    or exists (
      select 1 from public.space_members sm
      where sm.space_id = completed_pages.display_space_id
        and sm.user_id = auth.uid()
    )
  )
);

drop policy if exists "photo_assets_select_owner_or_member" on public.photo_assets;
create policy "photo_assets_select_owner_or_member"
on public.photo_assets for select
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1 from public.space_members sm
    where sm.space_id = coalesce(photo_assets.space_id, photo_assets.memory_space_id)
      and sm.user_id = auth.uid()
  )
);

drop policy if exists "photo_assets_insert_owner" on public.photo_assets;
create policy "photo_assets_insert_owner"
on public.photo_assets for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.space_members sm
    where sm.space_id = coalesce(photo_assets.space_id, photo_assets.memory_space_id)
      and sm.user_id = auth.uid()
  )
);

drop policy if exists "notifications_select_recipient" on public.notifications;
create policy "notifications_select_recipient"
on public.notifications for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "space_invites_select_related" on public.space_invites;
create policy "space_invites_select_related"
on public.space_invites for select
to authenticated
using (
  inviter_id = auth.uid()
  or accepted_by = auth.uid()
  or exists (
    select 1 from public.space_members sm
    where sm.space_id = space_invites.space_id
      and sm.user_id = auth.uid()
  )
);

drop policy if exists "invite_links_select_related" on public.invite_links;
create policy "invite_links_select_related"
on public.invite_links for select
to authenticated
using (
  inviter_id = auth.uid()
  or accepted_by = auth.uid()
  or exists (
    select 1 from public.space_members sm
    where sm.space_id = invite_links.couple_id
      and sm.user_id = auth.uid()
  )
);

drop policy if exists "invite_links_insert_member" on public.invite_links;
create policy "invite_links_insert_member"
on public.invite_links for insert
to authenticated
with check (
  inviter_id = auth.uid()
  and exists (
    select 1 from public.space_members sm
    where sm.space_id = invite_links.couple_id
      and sm.user_id = auth.uid()
  )
);

create or replace function public.create_invite_link(target_couple_id uuid)
returns table(code text, expires_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  generated_code text;
  link_expires_at timestamptz := now() + interval '7 days';
begin
  if auth.uid() is null then
    raise exception 'ログインが必要です';
  end if;

  if not exists (
    select 1 from public.space_members sm
    where sm.space_id = target_couple_id
      and sm.user_id = auth.uid()
  ) then
    raise exception 'このスペースの招待リンクは発行できません';
  end if;

  loop
    generated_code := upper(substr(md5(random()::text || clock_timestamp()::text || auth.uid()::text), 1, 12));
    exit when not exists (
      select 1 from public.invite_links il
      where il.code = generated_code
    );
  end loop;

  insert into public.invite_links (
    couple_id,
    inviter_id,
    code,
    expires_at
  )
  values (
    target_couple_id,
    auth.uid(),
    generated_code,
    link_expires_at
  );

  code := generated_code;
  expires_at := link_expires_at;
  return next;
end;
$$;

create or replace function public.accept_invite_link(invite_code text)
returns table(couple_id uuid, status text)
language plpgsql
security definer
set search_path = public
as $$
declare
  invite_record public.invite_links%rowtype;
begin
  if auth.uid() is null then
    raise exception 'ログインが必要です';
  end if;

  select *
  into invite_record
  from public.invite_links il
  where il.code = upper(trim(invite_code))
  for update;

  if not found then
    raise exception '招待リンクが見つかりません';
  end if;

  if invite_record.used_at is not null then
    raise exception 'この招待リンクは使用済みです';
  end if;

  if invite_record.expires_at is not null and invite_record.expires_at < now() then
    raise exception 'この招待リンクは期限切れです';
  end if;

  if invite_record.inviter_id = auth.uid() then
    raise exception '自分の招待リンクは承認できません';
  end if;

  insert into public.space_members (
    space_id,
    user_id,
    role
  )
  values (
    invite_record.couple_id,
    auth.uid(),
    'member'
  )
  on conflict (space_id, user_id) do nothing;

  update public.invite_links
  set accepted_by = auth.uid(),
      accepted_at = now(),
      used_at = now()
  where id = invite_record.id;

  couple_id := invite_record.couple_id;
  status := 'accepted';
  return next;
end;
$$;

grant execute on function public.create_invite_link(uuid) to authenticated;
grant execute on function public.accept_invite_link(text) to authenticated;

create or replace function public.delete_current_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() is null then
    raise exception 'ログインが必要です';
  end if;

  delete from auth.users
  where id = auth.uid();
end;
$$;

grant execute on function public.delete_current_account() to authenticated;

alter table public.profiles
  add column if not exists birthday date;

create or replace function public.get_partner_profile()
returns table(
  has_partner boolean,
  user_id uuid,
  display_name text,
  email text,
  birthday date
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_space_id uuid;
begin
  if auth.uid() is null then
    raise exception 'ログインが必要です';
  end if;

  select sm.space_id
  into current_space_id
  from public.space_members sm
  where sm.user_id = auth.uid()
  order by sm.created_at
  limit 1;

  if current_space_id is null then
    has_partner := false;
    user_id := null;
    display_name := null;
    email := null;
    birthday := null;
    return next;
    return;
  end if;

  return query
  select
    true as has_partner,
    p.id as user_id,
    p.display_name,
    p.email,
    p.birthday
  from public.space_members sm
  join public.profiles p on p.id = sm.user_id
  where sm.space_id = current_space_id
    and sm.user_id <> auth.uid()
  order by sm.created_at
  limit 1;

  if not found then
    has_partner := false;
    user_id := null;
    display_name := null;
    email := null;
    birthday := null;
    return next;
  end if;
end;
$$;

grant execute on function public.get_partner_profile() to authenticated;

create or replace function public.disconnect_shared_space(target_space_id uuid)
returns table(new_space_id uuid, status text)
language plpgsql
security definer
set search_path = public
as $$
declare
  member_count integer;
  created_space_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Login required.';
  end if;

  if target_space_id is null then
    raise exception 'Shared space is missing.';
  end if;

  if not exists (
    select 1
    from public.space_members sm
    where sm.space_id = target_space_id
      and sm.user_id = auth.uid()
  ) then
    raise exception 'You are not a member of this shared space.';
  end if;

  select count(*)
  into member_count
  from public.space_members sm
  where sm.space_id = target_space_id;

  update public.completed_pages
  set display_scope = 'personal',
      save_scope = 'personal',
      display_space_id = null,
      editor_snapshot_json = coalesce(editor_snapshot_json, '{}'::jsonb)
        || jsonb_build_object(
          'storageScope', 'personal',
          'saveScope', 'personal',
          'displayScope', 'personal'
        ),
      updated_at = now()
  where author_id = auth.uid()
    and display_scope = 'couple'
    and display_space_id = target_space_id;

  if member_count > 1 then
    delete from public.space_members
    where space_id = target_space_id
      and user_id = auth.uid();
  end if;

  insert into public.memory_spaces (owner_id, title)
  values (auth.uid(), 'My BURN')
  returning id into created_space_id;

  insert into public.space_members (space_id, user_id, role)
  values (created_space_id, auth.uid(), 'owner')
  on conflict (space_id, user_id) do nothing;

  new_space_id := created_space_id;
  status := case when member_count > 1 then 'disconnected' else 'personal_space_created' end;
  return next;
end;
$$;

grant execute on function public.disconnect_shared_space(uuid) to authenticated;

insert into storage.buckets (id, name, public)
values
  ('photo-assets', 'photo-assets', false),
  ('completed-pages', 'completed-pages', false)
on conflict (id) do nothing;

drop policy if exists "photo_assets_storage_select_own_folder" on storage.objects;
create policy "photo_assets_storage_select_own_folder"
on storage.objects for select
to authenticated
using (
  bucket_id = 'photo-assets'
  and exists (
    select 1 from public.space_members sm
    where sm.space_id::text = (storage.foldername(name))[1]
      and sm.user_id = auth.uid()
  )
);

drop policy if exists "photo_assets_storage_insert_own_folder" on storage.objects;
create policy "photo_assets_storage_insert_own_folder"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'photo-assets'
  and exists (
    select 1 from public.space_members sm
    where sm.space_id::text = (storage.foldername(name))[1]
      and sm.user_id = auth.uid()
  )
);

drop policy if exists "completed_pages_storage_select_own_folder" on storage.objects;
create policy "completed_pages_storage_select_own_folder"
on storage.objects for select
to authenticated
using (
  bucket_id = 'completed-pages'
  and (
    exists (
      select 1 from public.space_members sm
      where sm.space_id::text = (storage.foldername(name))[1]
        and sm.user_id = auth.uid()
    )
    or exists (
      select 1
      from public.completed_pages cp
      where (
          cp.final_image_path = storage.objects.name
          or cp.final_base_image_path = storage.objects.name
          or cp.final_preview_image_path = storage.objects.name
        )
        and (
          cp.author_id = auth.uid()
          or exists (
            select 1 from public.space_members sm
            where sm.space_id = cp.display_space_id
              and sm.user_id = auth.uid()
          )
        )
    )
  )
);

drop policy if exists "completed_pages_storage_insert_own_folder" on storage.objects;
create policy "completed_pages_storage_insert_own_folder"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'completed-pages'
  and exists (
    select 1 from public.space_members sm
    where sm.space_id::text = (storage.foldername(name))[1]
      and sm.user_id = auth.uid()
  )
);
