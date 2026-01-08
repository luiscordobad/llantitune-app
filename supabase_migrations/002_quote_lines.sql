-- Add quote_lines table to support multiple sizes in one quote

create table if not exists quote_lines (
  line_id uuid primary key default gen_random_uuid(),
  quote_id uuid references quotes(quote_id) on delete cascade,
  line_no int not null,
  size text not null,
  quantity int not null default 1
);

create index if not exists idx_quote_lines_quote on quote_lines(quote_id);

-- Add line_id to quote_items (nullable for backwards compatibility)
alter table quote_items add column if not exists line_id uuid references quote_lines(line_id) on delete cascade;
create index if not exists idx_quote_items_line on quote_items(line_id);
