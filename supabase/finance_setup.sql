-- Initial private finance workspaces. Run in SQL Editor after existing schema.
-- Every import/review creates an immutable snapshot owned by the signed-in user.
begin;
create table if not exists public.finance_imports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  payload jsonb not null check (payload->>'version' = '1'),
  action text not null
);
alter table public.finance_imports enable row level security;
revoke all on public.finance_imports from anon, authenticated;
grant select, insert on public.finance_imports to authenticated;
drop policy if exists finance_read_own on public.finance_imports;
create policy finance_read_own on public.finance_imports for select to authenticated
using ((select auth.uid()) = user_id);
drop policy if exists finance_insert_own on public.finance_imports;
create policy finance_insert_own on public.finance_imports for insert to authenticated
with check ((select auth.uid()) = user_id);
create index if not exists finance_imports_user_date on public.finance_imports(user_id, created_at desc);
create table if not exists public.fixed_assets (
  id uuid primary key,
  user_id uuid not null references auth.users(id),
  payload jsonb not null
);
alter table public.fixed_assets enable row level security;
revoke all on public.fixed_assets from anon, authenticated;
grant select, insert, update on public.fixed_assets to authenticated;
drop policy if exists assets_read_own on public.fixed_assets;
create policy assets_read_own on public.fixed_assets for select to authenticated
using ((select auth.uid()) = user_id);
drop policy if exists assets_insert_own on public.fixed_assets;
create policy assets_insert_own on public.fixed_assets for insert to authenticated
with check ((select auth.uid()) = user_id);
drop policy if exists assets_update_own on public.fixed_assets;
create policy assets_update_own on public.fixed_assets for update to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
commit;
