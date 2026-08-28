-- Troca as capas de categoria (antes placehold.co) pelas fotos reais do
-- produto principal de cada categoria — remove a dependência externa e usa
-- imagens consistentes com as páginas de produto.

update public.categories c
set image_url = pi.url
from public.products p
join public.product_images pi on pi.product_id = p.id
where p.category_id = c.id;
