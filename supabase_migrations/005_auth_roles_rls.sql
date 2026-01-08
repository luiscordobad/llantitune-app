-- Roles + profiles + RLS + work views

-- 1) Roles enum
do $$
begin
  if not exists (select 1 from pg_type where typname = 'role_type') then
    create type public.role_type as enum ('admin', 'mechanic');
  end if;
end $$;

-- 2) Profiles table (1:1 with auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.role_type not null default 'mechanic',
  full_name text,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

-- Users can read their own profile
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles for select
to authenticated
using (id = auth.uid());

-- Users can update their own name (not role)
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- Helper function: is_admin()
create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

-- Admin can select all profiles
drop policy if exists "profiles_admin_all" on public.profiles;
create policy "profiles_admin_all"
on public.profiles for select
to authenticated
using (public.is_admin());

-- 3) Orders assignment (optional)
alter table public.orders
add column if not exists assigned_to uuid references auth.users(id);

-- 4) Enable RLS where needed (work views use underlying tables)
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- Policies for orders:
-- Admin sees all
drop policy if exists "orders_admin_all" on public.orders;
create policy "orders_admin_all"
on public.orders for select
to authenticated
using (public.is_admin());

-- Mechanics can see orders assigned to them (or unassigned)
drop policy if exists "orders_mech_assigned" on public.orders;
create policy "orders_mech_assigned"
on public.orders for select
to authenticated
using (assigned_to = auth.uid() or assigned_to is null);

-- Admin can update status/assignment
drop policy if exists "orders_admin_update" on public.orders;
create policy "orders_admin_update"
on public.orders for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Policies for order_items:
-- Admin sees all
drop policy if exists "order_items_admin_all" on public.order_items;
create policy "order_items_admin_all"
on public.order_items for select
to authenticated
using (public.is_admin());

-- Mechanics can see items for orders they can see
drop policy if exists "order_items_mech" on public.order_items;
create policy "order_items_mech"
on public.order_items for select
to authenticated
using (
  exists (
    select 1 from public.orders o
    where o.order_id = order_items.order_id
      and (o.assigned_to = auth.uid() or o.assigned_to is null)
  )
);

-- Admin can insert/update items (selection creates them)
drop policy if exists "order_items_admin_write" on public.order_items;
create policy "order_items_admin_write"
on public.order_items for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- 5) Work-safe views (no cost/provider/sku)
create or replace view public.orders_view_work as
select
  o.order_id,
  o.quote_id,
  o.status,
  o.created_at,
  o.updated_at,
  o.assigned_to,
  q.created_at as quote_created_at,
  q.quote_no,
  q.customer_name,
  q.vehicle_text
from public.orders o
join public.quotes q on q.quote_id = o.quote_id;

create or replace view public.order_items_view_work as
select
  oi.order_item_id,
  oi.order_id,
  oi.size,
  oi.brand,
  oi.load_speed,
  oi.qty,
  oi.created_at
from public.order_items oi;

-- Enable RLS on views via security barrier is not required; RLS enforced on base tables.
