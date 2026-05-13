create table if not exists public.love_mobby_diagnosis_results (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  result_code text not null default '',
  result_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.love_mobby_diagnosis_results
  add column if not exists result_code text not null default '',
  add column if not exists result_json jsonb not null default '{}'::jsonb,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.love_mobby_diagnosis_results enable row level security;

grant select, insert, update, delete on public.love_mobby_diagnosis_results to authenticated;

drop policy if exists "love_mobby_diagnosis_results_select_own" on public.love_mobby_diagnosis_results;
create policy "love_mobby_diagnosis_results_select_own"
on public.love_mobby_diagnosis_results for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "love_mobby_diagnosis_results_insert_own" on public.love_mobby_diagnosis_results;
create policy "love_mobby_diagnosis_results_insert_own"
on public.love_mobby_diagnosis_results for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "love_mobby_diagnosis_results_update_own" on public.love_mobby_diagnosis_results;
create policy "love_mobby_diagnosis_results_update_own"
on public.love_mobby_diagnosis_results for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "love_mobby_diagnosis_results_delete_own" on public.love_mobby_diagnosis_results;
create policy "love_mobby_diagnosis_results_delete_own"
on public.love_mobby_diagnosis_results for delete
to authenticated
using (user_id = auth.uid());
