-- Exemplo: "Cartão Fidelidade com Arte Única" — demonstra o configurador
-- orientado a atributos. Varia apenas Material (2 valores) para manter o
-- seed pequeno; Cor e Cobertura ficam fixos (não geram dropdown, mas
-- provam que attributes com valor único não renderizam seletor).
-- Preços da 2ª opção de material são +R$10,00 arbitrário (placeholder) —
-- substituir pelo custo real do fornecedor antes de publicar.

insert into public.products (category_id, slug, name, description, sort_order)
select id, 'cartao-fidelidade-arte-unica', 'Cartão Fidelidade com Arte Única',
  'Cartão fidelidade em PVC, arte exclusiva, resistente à água e ao uso diário.', 2
from public.categories where slug = 'lancamentos';

insert into public.product_variants (product_id, label, quantity, price_cents, attributes, is_default, sort_order)
select p.id, v.label, v.quantity, v.price_cents, v.attributes::jsonb, v.is_default, v.sort_order
from public.products p
join (values
  ('cartao-fidelidade-arte-unica', '50 un.',   50,   12300, '{"material":"PVC 0,5mm - Cristal","cor":"4x0","cobertura":"Verniz Cristal Frente e Verso"}', true,  1),
  ('cartao-fidelidade-arte-unica', '100 un.',  100,  17900, '{"material":"PVC 0,5mm - Cristal","cor":"4x0","cobertura":"Verniz Cristal Frente e Verso"}', false, 2),
  ('cartao-fidelidade-arte-unica', '200 un.',  200,  30500, '{"material":"PVC 0,5mm - Cristal","cor":"4x0","cobertura":"Verniz Cristal Frente e Verso"}', false, 3),
  ('cartao-fidelidade-arte-unica', '500 un.',  500,  49500, '{"material":"PVC 0,5mm - Cristal","cor":"4x0","cobertura":"Verniz Cristal Frente e Verso"}', false, 4),
  ('cartao-fidelidade-arte-unica', '1.000 un.', 1000, 84900, '{"material":"PVC 0,5mm - Cristal","cor":"4x0","cobertura":"Verniz Cristal Frente e Verso"}', false, 5),
  ('cartao-fidelidade-arte-unica', '5.000 un.', 5000, 414800,'{"material":"PVC 0,5mm - Cristal","cor":"4x0","cobertura":"Verniz Cristal Frente e Verso"}', false, 6),
  ('cartao-fidelidade-arte-unica', '50 un.',   50,   13300, '{"material":"PVC 0,76mm - Cristal","cor":"4x0","cobertura":"Verniz Cristal Frente e Verso"}', false, 7),
  ('cartao-fidelidade-arte-unica', '100 un.',  100,  18900, '{"material":"PVC 0,76mm - Cristal","cor":"4x0","cobertura":"Verniz Cristal Frente e Verso"}', false, 8),
  ('cartao-fidelidade-arte-unica', '200 un.',  200,  31500, '{"material":"PVC 0,76mm - Cristal","cor":"4x0","cobertura":"Verniz Cristal Frente e Verso"}', false, 9),
  ('cartao-fidelidade-arte-unica', '500 un.',  500,  50500, '{"material":"PVC 0,76mm - Cristal","cor":"4x0","cobertura":"Verniz Cristal Frente e Verso"}', false, 10),
  ('cartao-fidelidade-arte-unica', '1.000 un.', 1000, 85900, '{"material":"PVC 0,76mm - Cristal","cor":"4x0","cobertura":"Verniz Cristal Frente e Verso"}', false, 11),
  ('cartao-fidelidade-arte-unica', '5.000 un.', 5000, 415800,'{"material":"PVC 0,76mm - Cristal","cor":"4x0","cobertura":"Verniz Cristal Frente e Verso"}', false, 12)
) as v(product_slug, label, quantity, price_cents, attributes, is_default, sort_order) on v.product_slug = p.slug;

insert into public.product_addons (product_id, kind, label, price_cents, pricing_mode, extra_production_days, help_text, sort_order)
select p.id, v.kind, v.label, v.price_cents, v.pricing_mode, v.extra_production_days, v.help_text, v.sort_order
from public.products p
join (values
  ('cartao-fidelidade-arte-unica', 'addon',   'Tarja para Assinatura', 250,   'per_unit', 1, null, 1),
  ('cartao-fidelidade-arte-unica', 'addon',   'Furo para Presilha',    2500,  'flat',     0, null, 2),
  ('cartao-fidelidade-arte-unica', 'service', 'Checagem Profissional', 1600,  'flat',     0,
    'Nossa equipe revisa sua arte antes da impressão, verificando sangria, resolução e cores para evitar retrabalho.', 1)
) as v(product_slug, kind, label, price_cents, pricing_mode, extra_production_days, help_text, sort_order) on v.product_slug = p.slug;

insert into public.product_images (product_id, url, alt, sort_order)
select id, 'https://placehold.co/800x600/4D81CB/ffffff?text=Cart%C3%A3o+Fidelidade', name, 1
from public.products where slug = 'cartao-fidelidade-arte-unica';
