-- Suporte a acabamentos/serviços opcionais selecionados por linha de carrinho/pedido.
-- Snapshot (não referência viva) — mesmo padrão já usado para unit_price_cents,
-- product_name e variant_label: nunca re-junta ao product_addons ao vivo depois
-- de adicionado ao carrinho/pedido.

alter table public.cart_items
  add column selected_addons jsonb not null default '[]'::jsonb,
  add column addon_selection_key text not null default '';

alter table public.order_items
  add column selected_addons jsonb not null default '[]'::jsonb;

comment on column public.cart_items.addon_selection_key is
  'Ids de product_addons selecionados, ordenados e unidos por vírgula. '
  'Junto com product_variant_id, define a identidade de uma linha de carrinho — '
  'duas linhas com a mesma variante mas add-ons diferentes NÃO devem ser mescladas.';
