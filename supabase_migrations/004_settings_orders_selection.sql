-- Settings (editable defaults)
create table if not exists settings (
  key text primary key,
  value_numeric numeric,
  value_text text,
  updated_at timestamptz default now()
);

insert into settings(key, value_numeric) values
  ('default_markup_pct', 30),
  ('default_install_each', 1000),
  ('default_extras_each', 1000),
  ('default_min_stock', 8)
on conflict (key) do nothing;

alter table settings disable row level security;

-- Quote line selection
alter table quote_lines add column if not exists selected_quote_item_id uuid references quote_items(quote_item_id);
create index if not exists idx_quote_lines_selected on quote_lines(selected_quote_item_id);

-- Internal orders
create table if not exists orders (
  order_id uuid primary key default gen_random_uuid(),
  quote_id uuid unique references quotes(quote_id) on delete cascade,
  status text not null default 'DRAFT',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists order_items (
  order_item_id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(order_id) on delete cascade,
  line_id uuid references quote_lines(line_id) on delete cascade,
  quote_item_id uuid references quote_items(quote_item_id) on delete set null,
  provider text,
  sku text,
  size text,
  brand text,
  model text,
  load_speed text,
  qty int not null default 1,
  stock numeric,
  cost_each numeric,
  price_each numeric,
  total numeric,
  created_at timestamptz default now()
);

create index if not exists idx_order_items_order on order_items(order_id);
create index if not exists idx_order_items_quote_item on order_items(quote_item_id);

alter table orders disable row level security;
alter table order_items disable row level security;

-- updated_at trigger for orders
create or replace function set_updated_at_orders()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_orders_updated_at on orders;
create trigger trg_orders_updated_at
before update on orders
for each row execute function set_updated_at_orders();

create unique index if not exists ux_order_items_line on order_items(line_id);
