-- As 34 categorias criadas pelo import do fornecedor nunca tiveram
-- categories.image_url preenchido (só as 13 originais tinham, desde a
-- migration 0005). O card de categoria na home usa esse campo, não
-- product_images diretamente — por isso apareciam sem imagem mesmo com
-- os produtos já tendo foto certa. Deriva automaticamente do primeiro
-- produto de cada categoria (mesmo padrão da 0005), o que também
-- atualiza "Lançamentos" para a foto nova (não mais a azul/branco antiga).

update public.categories c
set image_url = sub.url
from (
  select distinct on (p.category_id) p.category_id, pi.url
  from public.products p
  join public.product_images pi on pi.product_id = p.id
  order by p.category_id, p.sort_order, pi.sort_order
) sub
where sub.category_id = c.id;
