-- Adds vehicle info to quote_lines so history + messages can show the car
alter table public.quote_lines
  add column if not exists vehicle_index integer,
  add column if not exists vehicle_make text,
  add column if not exists vehicle_model text,
  add column if not exists vehicle_year integer;

create index if not exists idx_quote_lines_vehicle_index
on public.quote_lines(vehicle_index);

-- Optional: store per-vehicle service settings (internal)
-- (keeps existing per-tire keys for backward compatibility)
insert into public.settings(key, value_numeric)
values
  ('install_per_vehicle', 0),
  ('extras_per_vehicle', 0)
on conflict (key) do nothing;
