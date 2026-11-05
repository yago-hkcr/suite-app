create table if not exists public.app_data (
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_key text not null check (length(storage_key) between 1 and 120),
  value jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, storage_key)
);

alter table public.app_data enable row level security;
revoke all on public.app_data from anon;
grant select, insert, update, delete on public.app_data to authenticated;

create policy "Users can read their own app data" on public.app_data
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can create their own app data" on public.app_data
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users can update their own app data" on public.app_data
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users can delete their own app data" on public.app_data
  for delete to authenticated using ((select auth.uid()) = user_id);
