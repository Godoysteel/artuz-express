-- Eventos anônimos de navegação para o painel administrativo.
create table public.analytics_events (
  id bigint generated always as identity primary key,
  event_type text not null check (event_type in (
    'page_view', 'product_click', 'product_view', 'add_to_cart', 'whatsapp_click'
  )),
  visitor_id uuid not null,
  product_id uuid references public.products(id) on delete set null,
  product_slug text,
  product_name text,
  path text not null,
  referrer text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index analytics_events_created_at_idx on public.analytics_events(created_at desc);
create index analytics_events_type_created_at_idx on public.analytics_events(event_type, created_at desc);
create index analytics_events_product_created_at_idx on public.analytics_events(product_id, created_at desc);
create index analytics_events_visitor_created_at_idx on public.analytics_events(visitor_id, created_at desc);

alter table public.analytics_events enable row level security;
-- Sem policies: navegador não acessa a tabela. Inserção e leitura passam pelo servidor.
