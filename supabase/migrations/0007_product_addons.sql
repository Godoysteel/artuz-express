-- Acabamentos/serviços opcionais por produto: adicionais de preço fixo,
-- ortogonais à matriz de atributos/quantidade de product_variants.

create table public.product_addons (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  kind text not null check (kind in ('addon', 'service')),
  label text not null,
  price_cents int not null check (price_cents >= 0),
  pricing_mode text not null default 'flat' check (pricing_mode in ('flat', 'per_unit')),
  extra_production_days int not null default 0 check (extra_production_days >= 0),
  help_text text,
  is_active boolean not null default true,
  sort_order int not null default 0
);

create index product_addons_product_id_idx on public.product_addons(product_id);

alter table public.product_addons enable row level security;

create policy "product addons are publicly readable" on public.product_addons
  for select using (
    is_active and exists (select 1 from public.products p where p.id = product_id and p.is_active)
  );
