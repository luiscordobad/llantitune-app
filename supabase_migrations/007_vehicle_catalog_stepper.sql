-- Upgrade 3 (part 1): Vehicle catalog (best balance) + required vehicle fields

-- Tables
create table if not exists public.vehicle_makes (
  make_id uuid primary key default gen_random_uuid(),
  make_name text not null unique
);

create table if not exists public.vehicle_models (
  model_id uuid primary key default gen_random_uuid(),
  make_id uuid not null references public.vehicle_makes(make_id) on delete cascade,
  model_name text not null,
  unique(make_id, model_name)
);

create table if not exists public.vehicle_years (
  year_id uuid primary key default gen_random_uuid(),
  model_id uuid not null references public.vehicle_models(model_id) on delete cascade,
  year int not null,
  unique(model_id, year)
);

-- Required vehicle fields on quotes
alter table public.quotes
  add column if not exists vehicle_make text,
  add column if not exists vehicle_model text,
  add column if not exists vehicle_year int;

-- Make vehicle required for new quotes at app level; DB constraint optional:
-- Uncomment after you are sure you always capture it.
-- alter table public.quotes
--   add constraint quotes_vehicle_required_chk check (
--     vehicle_make is not null and vehicle_model is not null and vehicle_year is not null
--   );

-- RLS
alter table public.vehicle_makes enable row level security;
alter table public.vehicle_models enable row level security;
alter table public.vehicle_years enable row level security;

drop policy if exists "makes_admin_all" on public.vehicle_makes;
create policy "makes_admin_all" on public.vehicle_makes
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "models_admin_all" on public.vehicle_models;
create policy "models_admin_all" on public.vehicle_models
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "years_admin_all" on public.vehicle_years;
create policy "years_admin_all" on public.vehicle_years
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Seed (basic Mexico-common brands + a few models; expand anytime)
-- Safe inserts (ignore duplicates)
insert into public.vehicle_makes(make_name) values
('Ford'),('Nissan'),('Volkswagen'),('Chevrolet'),('Toyota'),('Mazda'),('Kia'),('Hyundai'),('Honda'),('Renault'),('Suzuki'),('Jeep'),('Dodge'),('BMW'),('Mercedes-Benz'),('Audi')
on conflict do nothing;

-- Helper to insert model
do $$
declare
  mk uuid;
begin
  select make_id into mk from public.vehicle_makes where make_name='Ford';
  if mk is not null then
    insert into public.vehicle_models(make_id, model_name) values
    (mk,'Focus'),(mk,'Fiesta'),(mk,'Escape'),(mk,'Explorer'),(mk,'Ranger'),(mk,'Mustang')
    on conflict do nothing;
  end if;

  select make_id into mk from public.vehicle_makes where make_name='Nissan';
  if mk is not null then
    insert into public.vehicle_models(make_id, model_name) values
    (mk,'Versa'),(mk,'Sentra'),(mk,'March'),(mk,'Altima'),(mk,'Kicks'),(mk,'X-Trail'),(mk,'NP300')
    on conflict do nothing;
  end if;

  select make_id into mk from public.vehicle_makes where make_name='Volkswagen';
  if mk is not null then
    insert into public.vehicle_models(make_id, model_name) values
    (mk,'Jetta'),(mk,'Vento'),(mk,'Golf'),(mk,'Polo'),(mk,'Tiguan'),(mk,'Taos')
    on conflict do nothing;
  end if;

  select make_id into mk from public.vehicle_makes where make_name='Chevrolet';
  if mk is not null then
    insert into public.vehicle_models(make_id, model_name) values
    (mk,'Aveo'),(mk,'Onix'),(mk,'Sonic'),(mk,'Cruze'),(mk,'Spark'),(mk,'Tracker'),(mk,'Equinox'),(mk,'Captiva')
    on conflict do nothing;
  end if;

  select make_id into mk from public.vehicle_makes where make_name='Toyota';
  if mk is not null then
    insert into public.vehicle_models(make_id, model_name) values
    (mk,'Corolla'),(mk,'Yaris'),(mk,'Camry'),(mk,'RAV4'),(mk,'Hilux'),(mk,'Tacoma'),(mk,'Avanza')
    on conflict do nothing;
  end if;

  select make_id into mk from public.vehicle_makes where make_name='Mazda';
  if mk is not null then
    insert into public.vehicle_models(make_id, model_name) values
    (mk,'Mazda2'),(mk,'Mazda3'),(mk,'CX-3'),(mk,'CX-5'),(mk,'CX-30'),(mk,'CX-9'),(mk,'MX-5')
    on conflict do nothing;
  end if;

  select make_id into mk from public.vehicle_makes where make_name='Kia';
  if mk is not null then
    insert into public.vehicle_models(make_id, model_name) values
    (mk,'Rio'),(mk,'Forte'),(mk,'K3'),(mk,'Soul'),(mk,'Seltos'),(mk,'Sportage'),(mk,'Sorento')
    on conflict do nothing;
  end if;

  select make_id into mk from public.vehicle_makes where make_name='Hyundai';
  if mk is not null then
    insert into public.vehicle_models(make_id, model_name) values
    (mk,'i10'),(mk,'i20'),(mk,'Elantra'),(mk,'Accent'),(mk,'Creta'),(mk,'Tucson'),(mk,'Santa Fe')
    on conflict do nothing;
  end if;

  select make_id into mk from public.vehicle_makes where make_name='Honda';
  if mk is not null then
    insert into public.vehicle_models(make_id, model_name) values
    (mk,'Civic'),(mk,'City'),(mk,'Accord'),(mk,'CR-V'),(mk,'HR-V')
    on conflict do nothing;
  end if;

end $$;

-- Seed years (2005-2026) for all models for simplicity; you can narrow later
insert into public.vehicle_years(model_id, year)
select m.model_id, y
from public.vehicle_models m
cross join generate_series(2005, 2026) as y
on conflict do nothing;
