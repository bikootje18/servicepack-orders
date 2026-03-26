

-- Bijlagen tabel
create table order_bijlagen (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  bestandsnaam text not null,
  opslag_pad text not null,
  bestandsgrootte bigint,
  mime_type text,
  aangemaakt_op timestamptz default now()
);

-- RLS
alter table order_bijlagen enable row level security;
create policy "authenticated users can manage bijlagen"
  on order_bijlagen for all to authenticated
  using (true) with check (true);

-- Storage bucket
insert into storage.buckets (id, name, public)
values ('order-bijlagen', 'order-bijlagen', false)
on conflict (id) do nothing;

-- Storage RLS
create policy "authenticated users can upload bijlagen"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'order-bijlagen');

create policy "authenticated users can read bijlagen"
  on storage.objects for select to authenticated
  using (bucket_id = 'order-bijlagen');

create policy "authenticated users can delete bijlagen"
  on storage.objects for delete to authenticated
  using (bucket_id = 'order-bijlagen');
