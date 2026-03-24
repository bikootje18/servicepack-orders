-- supabase/migrations/010_give_x_imports.sql
create table give_x_imports (
  id uuid primary key default gen_random_uuid(),
  klant_id uuid not null references klanten(id),
  documentnummer text not null unique,
  instructie_code text not null,
  leverdatum date,
  totaal_hoeveelheid int not null,
  totaal_rollen int,
  heeft_rollen boolean not null default false,
  order_id uuid references orders(id),
  aangemaakt_op timestamptz not null default now()
);

create index give_x_imports_klant_id_idx on give_x_imports(klant_id);
create index give_x_imports_order_id_idx on give_x_imports(order_id);
