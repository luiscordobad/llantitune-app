-- Upgrade 2: CRM + statuses + timeline

-- 1) Quote status enum
do $$
begin
  if not exists (select 1 from pg_type where typname = 'quote_status_type') then
    create type public.quote_status_type as enum ('DRAFT','SENT','APPROVED','REJECTED');
  end if;
end $$;

-- 2) Add quote status + timestamps + deposit + notes
alter table public.quotes
  add column if not exists status public.quote_status_type not null default 'DRAFT',
  add column if not exists sent_at timestamptz,
  add column if not exists approved_at timestamptz,
  add column if not exists rejected_at timestamptz,
  add column if not exists deposit_amount numeric,
  add column if not exists promised_at date,
  add column if not exists internal_notes text;

-- 3) Order status enum (optional; keep text but constrain via check)
alter table public.orders
  add column if not exists promised_at date,
  add column if not exists internal_notes text,
  add column if not exists attended_by uuid references auth.users(id),
  add column if not exists deposit_amount numeric;

-- constrain status values (safe even if existing)
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'orders_status_check'
  ) then
    alter table public.orders
      add constraint orders_status_check
      check (status in ('DRAFT','ORDERED','RECEIVED','INSTALLED','CLOSED'));
  end if;
end $$;

-- 4) Timeline events
create table if not exists public.timeline_events (
  event_id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('QUOTE','ORDER')),
  entity_id uuid not null,
  event_type text not null, -- e.g. STATUS_CHANGE, NOTE
  from_status text,
  to_status text,
  note text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

create index if not exists idx_timeline_entity on public.timeline_events(entity_type, entity_id);
create index if not exists idx_timeline_created_at on public.timeline_events(created_at);

alter table public.timeline_events enable row level security;

-- 5) RLS for timeline
drop policy if exists "timeline_admin_all" on public.timeline_events;
create policy "timeline_admin_all"
on public.timeline_events for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "timeline_mech_select" on public.timeline_events;
create policy "timeline_mech_select"
on public.timeline_events for select
to authenticated
using (
  public.is_admin()
  or (
    entity_type = 'ORDER'
    and exists (
      select 1 from public.orders o
      where o.order_id = timeline_events.entity_id
        and (o.assigned_to = auth.uid() or o.assigned_to is null)
    )
  )
);

-- 6) RLS updates: allow mechanics to update orders they can see (status + notes) 
-- (Row-level only; UI will restrict fields)
drop policy if exists "orders_mech_update" on public.orders;
create policy "orders_mech_update"
on public.orders for update
to authenticated
using (
  not public.is_admin()
  and (assigned_to = auth.uid() or assigned_to is null)
)
with check (
  not public.is_admin()
  and (assigned_to = auth.uid() or assigned_to is null)
);

-- 7) Update work views to include promised_at and internal_notes (for work instructions)
create or replace view public.orders_view_work as
select
  o.order_id,
  o.quote_id,
  o.status,
  o.created_at,
  o.updated_at,
  o.assigned_to,
  o.promised_at,
  o.internal_notes,
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
