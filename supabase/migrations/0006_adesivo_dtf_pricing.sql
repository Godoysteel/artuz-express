-- Preço real informado pelo cliente: Adesivo DTF Roupas e Tecidos,
-- mínimo de 10 unidades por R$ 349,50.

delete from public.product_variants
where product_id = (select id from public.products where slug = 'adesivo-dtf-recorte');

insert into public.product_variants (product_id, label, quantity, price_cents, is_default, sort_order)
select id, '10 un. (mínimo)', 10, 34950, true, 1
from public.products where slug = 'adesivo-dtf-recorte';
