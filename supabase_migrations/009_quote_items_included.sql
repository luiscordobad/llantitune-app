-- 009: allow selecting which options are sent to customer
alter table public.quote_items
  add column if not exists included boolean;

update public.quote_items
set included = true
where included is null;

alter table public.quote_items
  alter column included set default true;

create index if not exists idx_quote_items_included
on public.quote_items(included);
