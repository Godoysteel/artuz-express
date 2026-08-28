-- Dados de exemplo: categorias, produtos e variantes de preço/quantidade.
-- Imagens são placeholders neutros (não reproduzem fotos do site de referência).

insert into public.categories (slug, name, description, image_url, sort_order) values
  ('cartoes-de-visita', 'Cartões de Visita', 'Cartões de visita em papel couché, verniz e laminação.', 'https://placehold.co/600x400/4F46E5/ffffff?text=Cart%C3%B5es+de+Visita', 1),
  ('eleicoes-2026', 'Eleições 2026', 'Material de campanha: santinhos, adesivos e banners.', 'https://placehold.co/600x400/4F46E5/ffffff?text=Elei%C3%A7%C3%B5es+2026', 2),
  ('lancamentos', 'Lançamentos', 'Novidades do catálogo Artuz Express.', 'https://placehold.co/600x400/4F46E5/ffffff?text=Lan%C3%A7amentos', 3),
  ('adesivo-dtf', 'Adesivo DTF', 'Adesivos DTF de alta durabilidade para qualquer superfície.', 'https://placehold.co/600x400/4F46E5/ffffff?text=Adesivo+DTF', 4),
  ('banners-e-lonas', 'Banners e Lonas', 'Banners e lonas de alta resistência para uso interno e externo.', 'https://placehold.co/600x400/4F46E5/ffffff?text=Banners+e+Lonas', 5),
  ('brindes-promocionais', 'Brindes Promocionais', 'Canetas, chaveiros e brindes personalizados.', 'https://placehold.co/600x400/4F46E5/ffffff?text=Brindes', 6),
  ('cardapios-e-comandas', 'Cardápios e Comandas', 'Cardápios plastificados e comandas numeradas.', 'https://placehold.co/600x400/4F46E5/ffffff?text=Card%C3%A1pios', 7),
  ('credito-pre-pago', 'Crédito Pré-Pago', 'Créditos pré-pagos para usar em qualquer pedido futuro.', 'https://placehold.co/600x400/4F46E5/ffffff?text=Cr%C3%A9dito', 8),
  ('gravacao-a-laser', 'Gravação a Laser', 'Gravação a laser em metal, madeira e acrílico.', 'https://placehold.co/600x400/4F46E5/ffffff?text=Grava%C3%A7%C3%A3o+a+Laser', 9),
  ('impressao-colorida-uv', 'Impressão Colorida UV', 'Impressão UV colorida em canecas, garrafas e objetos.', 'https://placehold.co/600x400/4F46E5/ffffff?text=Impress%C3%A3o+UV', 10),
  ('impressao-em-dtf', 'Impressão em DTF', 'Impressão DTF para canecas, garrafas e têxteis.', 'https://placehold.co/600x400/4F46E5/ffffff?text=Impress%C3%A3o+DTF', 11),
  ('impressao-em-tecido', 'Impressão em Tecido', 'Impressão direta em tecido para bandeiras e uniformes.', 'https://placehold.co/600x400/4F46E5/ffffff?text=Impress%C3%A3o+Tecido', 12),
  ('pastas', 'Pastas', 'Pastas personalizadas para apresentações e eventos.', 'https://placehold.co/600x400/4F46E5/ffffff?text=Pastas', 13);

-- Um produto principal por categoria, com 3 variantes de quantidade/preço cada.

insert into public.products (category_id, slug, name, description, sort_order)
select c.id, v.slug, v.name, v.description, 1
from public.categories c
join (values
  ('cartoes-de-visita', 'cartao-de-visita-couche-300g', 'Cartão de Visita Couché 300g', 'Impressão colorida frente e verso, verniz total, papel couché 300g.'),
  ('eleicoes-2026', 'santinho-eleitoral-4x0', 'Santinho Eleitoral 9x5cm', 'Papel couché 115g, impressão colorida frente ou frente e verso.'),
  ('lancamentos', 'copo-personalizado-500ml', 'Copo Personalizado 500ml', 'Copo plástico personalizado com sua arte, ideal para eventos.'),
  ('adesivo-dtf', 'adesivo-dtf-recorte', 'Adesivo DTF com Recorte', 'Adesivo DTF de alta durabilidade, resistente à água e ao sol.'),
  ('banners-e-lonas', 'banner-lona-40x60', 'Banner em Lona 60x90cm', 'Lona 440g com acabamento em bastão e ilhós.'),
  ('brindes-promocionais', 'caneta-personalizada', 'Caneta Personalizada', 'Caneta plástica com sua logo, ideal para brindes corporativos.'),
  ('cardapios-e-comandas', 'cardapio-plastificado-a4', 'Cardápio Plastificado A4', 'Cardápio em papel couché 250g com plastificação fosca.'),
  ('credito-pre-pago', 'credito-pre-pago-loja', 'Crédito Pré-Pago Artuz Express', 'Crédito para usar em qualquer produto da loja, sem validade.'),
  ('gravacao-a-laser', 'chaveiro-gravacao-laser', 'Chaveiro com Gravação a Laser', 'Chaveiro em metal ou acrílico com gravação a laser de precisão.'),
  ('impressao-colorida-uv', 'caneca-impressao-uv', 'Caneca com Impressão UV', 'Caneca de porcelana branca com impressão UV colorida direta.'),
  ('impressao-em-dtf', 'garrafa-impressao-dtf', 'Garrafa com Impressão DTF', 'Garrafa térmica com impressão DTF de alta durabilidade.'),
  ('impressao-em-tecido', 'bandeira-impressao-tecido', 'Bandeira em Tecido', 'Bandeira em tecido oxford com impressão digital direta.'),
  ('pastas', 'pasta-personalizada-eventos', 'Pasta Personalizada para Eventos', 'Pasta em papel couché 300g com verniz, ideal para congressos e eventos.')
) as v(cat_slug, slug, name, description) on v.cat_slug = c.slug;

-- Variantes de quantidade/preço (3 por produto).

insert into public.product_variants (product_id, label, quantity, price_cents, is_default, sort_order)
select p.id, v.label, v.quantity, v.price_cents, v.is_default, v.sort_order
from public.products p
join (values
  ('cartao-de-visita-couche-300g', '100 un.', 100, 2990, true, 1),
  ('cartao-de-visita-couche-300g', '250 un.', 250, 5990, false, 2),
  ('cartao-de-visita-couche-300g', '500 un.', 500, 9990, false, 3),

  ('santinho-eleitoral-4x0', '1 un.', 1, 2100, true, 1),
  ('santinho-eleitoral-4x0', '1000 un.', 1000, 15900, false, 2),
  ('santinho-eleitoral-4x0', '5000 un.', 5000, 59900, false, 3),

  ('copo-personalizado-500ml', '1 un.', 1, 1490, true, 1),
  ('copo-personalizado-500ml', '50 un.', 50, 59900, false, 2),
  ('copo-personalizado-500ml', '100 un.', 100, 99900, false, 3),

  ('adesivo-dtf-recorte', '1 un.', 1, 1290, true, 1),
  ('adesivo-dtf-recorte', '10 un.', 10, 9900, false, 2),
  ('adesivo-dtf-recorte', '50 un.', 50, 39900, false, 3),

  ('banner-lona-40x60', '1 un.', 1, 1900, true, 1),
  ('banner-lona-40x60', '3 un.', 3, 4900, false, 2),
  ('banner-lona-40x60', '5 un.', 5, 7900, false, 3),

  ('caneta-personalizada', '1 un.', 1, 200, true, 1),
  ('caneta-personalizada', '100 un.', 100, 12900, false, 2),
  ('caneta-personalizada', '500 un.', 500, 49900, false, 3),

  ('cardapio-plastificado-a4', '5 un.', 5, 12400, true, 1),
  ('cardapio-plastificado-a4', '10 un.', 10, 22900, false, 2),
  ('cardapio-plastificado-a4', '20 un.', 20, 39900, false, 3),

  ('credito-pre-pago-loja', 'R$ 50', 1, 5000, true, 1),
  ('credito-pre-pago-loja', 'R$ 100', 1, 10000, false, 2),
  ('credito-pre-pago-loja', 'R$ 200', 1, 20000, false, 3),

  ('chaveiro-gravacao-laser', '10 un.', 10, 2500, true, 1),
  ('chaveiro-gravacao-laser', '50 un.', 50, 9900, false, 2),
  ('chaveiro-gravacao-laser', '100 un.', 100, 17900, false, 3),

  ('caneca-impressao-uv', '1 un.', 1, 3990, true, 1),
  ('caneca-impressao-uv', '12 un.', 12, 39900, false, 2),
  ('caneca-impressao-uv', '24 un.', 24, 74900, false, 3),

  ('garrafa-impressao-dtf', '1 un.', 1, 2690, true, 1),
  ('garrafa-impressao-dtf', '12 un.', 12, 29900, false, 2),
  ('garrafa-impressao-dtf', '24 un.', 24, 54900, false, 3),

  ('bandeira-impressao-tecido', '1 un.', 1, 1990, true, 1),
  ('bandeira-impressao-tecido', '5 un.', 5, 8900, false, 2),
  ('bandeira-impressao-tecido', '10 un.', 10, 16900, false, 3),

  ('pasta-personalizada-eventos', '5 un.', 5, 3900, true, 1),
  ('pasta-personalizada-eventos', '20 un.', 20, 13900, false, 2),
  ('pasta-personalizada-eventos', '50 un.', 50, 29900, false, 3)
) as v(product_slug, label, quantity, price_cents, is_default, sort_order) on v.product_slug = p.slug;

-- Uma imagem de capa por produto (placeholder).

insert into public.product_images (product_id, url, alt, sort_order)
select p.id,
  'https://placehold.co/800x600/EEF2FF/4F46E5?text=' || replace(p.name, ' ', '+'),
  p.name,
  1
from public.products p;
