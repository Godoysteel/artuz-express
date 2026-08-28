-- Artuz Express — schema inicial: catálogo, carrinho, pedidos, perfis, RLS.

create extension if not exists pgcrypto;

-- ============ CATÁLOGO ============

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  image_url text,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete restrict,
  slug text not null unique,
  name text not null,
  description text,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index products_category_id_idx on public.products(category_id);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  url text not null,
  alt text,
  sort_order int not null default 0
);

create index product_images_product_id_idx on public.product_images(product_id);

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  label text not null,
  quantity int not null check (quantity > 0),
  price_cents int not null check (price_cents >= 0),
  attributes jsonb not null default '{}'::jsonb,
  is_default boolean not null default false,
  is_active boolean not null default true,
  sort_order int not null default 0
);

create index product_variants_product_id_idx on public.product_variants(product_id);

-- "A partir de R$ X" — menor preço ativo por produto / categoria
create view public.product_starting_prices as
select
  p.id as product_id,
  min(v.price_cents) as min_price_cents,
  (array_agg(v.label order by v.price_cents asc))[1] as min_variant_label
from public.products p
join public.product_variants v on v.product_id = p.id and v.is_active
where p.is_active
group by p.id;

create view public.category_starting_prices as
select
  c.id as category_id,
  min(v.price_cents) as min_price_cents,
  (array_agg(v.label order by v.price_cents asc))[1] as min_variant_label
from public.categories c
join public.products p on p.category_id = c.id and p.is_active
join public.product_variants v on v.product_id = p.id and v.is_active
where c.is_active
group by c.id;

-- ============ PERFIS ============

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  cpf text,
  created_at timestamptz not null default now()
);

create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============ ENDEREÇOS ============

create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text,
  cep text not null,
  logradouro text not null,
  numero text not null,
  complemento text,
  bairro text not null,
  cidade text not null,
  uf text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create index addresses_user_id_idx on public.addresses(user_id);

-- ============ CARRINHO (visitante + autenticado) ============

create table public.carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  guest_token uuid unique,
  status text not null default 'active' check (status in ('active','converted','abandoned')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint carts_owner_check check (user_id is not null or guest_token is not null)
);

create index carts_user_id_idx on public.carts(user_id);

create table public.cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.carts(id) on delete cascade,
  product_variant_id uuid not null references public.product_variants(id) on delete restrict,
  quantity int not null default 1 check (quantity > 0),
  unit_price_cents int not null check (unit_price_cents >= 0),
  created_at timestamptz not null default now()
);

create index cart_items_cart_id_idx on public.cart_items(cart_id);

-- ============ PEDIDOS ============

create sequence public.order_number_seq start 1;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  order_number text not null unique default ('AE-' || lpad(nextval('public.order_number_seq')::text, 6, '0')),
  status text not null default 'pending' check (status in ('pending','paid','processing','shipped','completed','cancelled','payment_failed')),
  email text not null,
  phone text,
  subtotal_cents int not null check (subtotal_cents >= 0),
  shipping_cents int not null default 0 check (shipping_cents >= 0),
  total_cents int not null check (total_cents >= 0),
  shipping_address jsonb,
  mp_preference_id text,
  mp_payment_id text,
  mp_payment_status text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index orders_user_id_idx on public.orders(user_id);
create index orders_mp_payment_id_idx on public.orders(mp_payment_id);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_variant_id uuid references public.product_variants(id) on delete set null,
  product_name text not null,
  variant_label text not null,
  quantity int not null check (quantity > 0),
  unit_price_cents int not null check (unit_price_cents >= 0),
  total_price_cents int not null check (total_price_cents >= 0)
);

create index order_items_order_id_idx on public.order_items(order_id);

create function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger carts_set_updated_at before update on public.carts
  for each row execute function public.set_updated_at();

create trigger orders_set_updated_at before update on public.orders
  for each row execute function public.set_updated_at();

-- ============ ROW LEVEL SECURITY ============

alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.product_variants enable row level security;
alter table public.profiles enable row level security;
alter table public.addresses enable row level security;
alter table public.carts enable row level security;
alter table public.cart_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- Catálogo: leitura pública de linhas ativas. Escrita só via service-role (migrations/seed).
create policy "categories are publicly readable" on public.categories
  for select using (is_active);

create policy "products are publicly readable" on public.products
  for select using (is_active);

create policy "product images are publicly readable" on public.product_images
  for select using (
    exists (select 1 from public.products p where p.id = product_id and p.is_active)
  );

create policy "product variants are publicly readable" on public.product_variants
  for select using (
    is_active and exists (select 1 from public.products p where p.id = product_id and p.is_active)
  );

-- Perfis
create policy "users can view own profile" on public.profiles
  for select using (auth.uid() = id);
create policy "users can update own profile" on public.profiles
  for update using (auth.uid() = id);

-- Endereços
create policy "users manage own addresses" on public.addresses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Carrinho: carrinho autenticado acessível ao dono via client anon/auth.
-- Carrinho de visitante (user_id null) só é lido/escrito por rota server-side com
-- service-role key, identificado pelo cookie guest_token — nunca pelo client anon.
create policy "users manage own cart" on public.carts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "users manage own cart items" on public.cart_items
  for all using (
    exists (select 1 from public.carts c where c.id = cart_id and c.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.carts c where c.id = cart_id and c.user_id = auth.uid())
  );

-- Pedidos: somente leitura do próprio pedido. Toda escrita (criação, status de
-- pagamento) acontece via rota server-side com service-role, nunca client-side.
create policy "users view own orders" on public.orders
  for select using (auth.uid() = user_id);

create policy "users view own order items" on public.order_items
  for select using (
    exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())
  );
