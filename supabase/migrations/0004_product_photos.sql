-- Substitui as imagens placeholder pelos mockups reais dos produtos.

update public.product_images pi
set url = '/produtos/' || p.slug || '.png',
    alt = p.name
from public.products p
where pi.product_id = p.id;
