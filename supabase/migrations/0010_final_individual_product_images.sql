-- Substitui as últimas 7 fotos originais (estilo azul/branco da marca) pelas
-- imagens coloridas geradas pelo pipeline de fornecedor, por produto (essas
-- categorias têm um único produto cada, então não usam imagem de família).

update public.product_images set url = '/produtos/catalogo-atualcard/familia-adesivo-dtf-recorte.png'
where product_id = (select id from public.products where slug = 'adesivo-dtf-recorte');

update public.product_images set url = '/produtos/catalogo-atualcard/familia-bandeira-tecido.png'
where product_id = (select id from public.products where slug = 'bandeira-impressao-tecido');

update public.product_images set url = '/produtos/catalogo-atualcard/familia-caneca-impressao-uv.png'
where product_id = (select id from public.products where slug = 'caneca-impressao-uv');

update public.product_images set url = '/produtos/catalogo-atualcard/familia-chaveiro-gravacao-laser.png'
where product_id = (select id from public.products where slug = 'chaveiro-gravacao-laser');

update public.product_images set url = '/produtos/catalogo-atualcard/familia-copo-personalizado-500ml.png'
where product_id = (select id from public.products where slug = 'copo-personalizado-500ml');

update public.product_images set url = '/produtos/catalogo-atualcard/familia-garrafa-impressao-dtf.png'
where product_id = (select id from public.products where slug = 'garrafa-impressao-dtf');

update public.product_images set url = '/produtos/catalogo-atualcard/familia-santinho-eleitoral-9x5.png'
where product_id = (select id from public.products where slug = 'santinho-eleitoral-4x0');

update public.categories set image_url = '/produtos/catalogo-atualcard/familia-adesivo-dtf-recorte.png' where slug = 'adesivo-dtf';
update public.categories set image_url = '/produtos/catalogo-atualcard/familia-bandeira-tecido.png' where slug = 'impressao-em-tecido';
update public.categories set image_url = '/produtos/catalogo-atualcard/familia-caneca-impressao-uv.png' where slug = 'impressao-colorida-uv';
update public.categories set image_url = '/produtos/catalogo-atualcard/familia-chaveiro-gravacao-laser.png' where slug = 'gravacao-a-laser';
update public.categories set image_url = '/produtos/catalogo-atualcard/familia-garrafa-impressao-dtf.png' where slug = 'impressao-em-dtf';
update public.categories set image_url = '/produtos/catalogo-atualcard/familia-santinho-eleitoral-9x5.png' where slug = 'eleicoes-2026';
