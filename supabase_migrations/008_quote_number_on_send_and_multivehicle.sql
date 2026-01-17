-- Upgrade 3 (part 2): Prevent consuming quote numbers until SENT + multi-vehicle via per-line vehicle fields

-- 1) Ensure quotes.quote_number can be NULL (drafts)
alter table public.quotes
  alter column quote_number drop not null;

-- Unique quote numbers only when present
drop index if exists public.quotes_quote_number_key;
create unique index if not exists quotes_quote_number_unique_notnull
on public.quotes(quote_number)
where quote_number is not null;

-- 2) Sequence for quote numbers
create sequence if not exists public.quote_number_seq;

-- 3) Function to generate next quote number (LLT-000001)
create or replace function public.next_quote_number()
returns text
language plpgsql
security definer
as $$
declare
  n bigint;
begin
  n := nextval('public.quote_number_seq');
  return 'LLT-' || lpad(n::text, 6, '0');
end $$;

-- 4) Multi-vehicle: store vehicle info per quote line (so one customer can have >1 car in one quote)
alter table public.quote_lines
  add column if not exists vehicle_make text,
  add column if not exists vehicle_model text,
  add column if not exists vehicle_year int;

-- 5) Optional: timeline event type for "quote_sent" etc is already supported; no changes.

