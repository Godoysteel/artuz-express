-- 24 famílias específicas dentro de "Cartões de Visita" (agradecimento,
-- laminação holográfica, tinta branca, kraft, hot stamping, transparente/
-- cristal em PVC, metal, metalizado, reciclato), a pedido do cliente.
delete from public.products where slug in (
  'cartao-de-agradecimento-couche-250g-verniz-total-frente-9x10cm-27f2c9f1',
  'cartao-de-agradecimento-couche-300g-laminacao-fosca-e-hot-stamping-9x10cm-4a756b7a',
  'cartao-de-agradecimento-couche-300g-laminacao-fosca-e-verniz-localizado-9x5cm-a1d2e063',
  'cartao-de-agradecimento-kraft-240g-sem-verniz-9x10cm-398c2b38',
  'cartao-de-agradecimento-supremo-metalizado-verniz-total-frente-9x10cm-2c3e71db',
  'cartao-de-visita-com-2-cantos-arredondados-couche-300g-laminacao-holografica-9x5-bc55a13e',
  'cartao-de-visita-com-4-cantos-arredondados-couche-300g-laminacao-holografica-9x5-b0d863ef',
  'cartao-de-visita-couche-300g-laminacao-holografica-9x5cm-bebb1e3d',
  'cartao-de-visita-com-4-cantos-arredondados-kraft-240g-com-tinta-branca-sem-verni-01889135',
  'cartao-de-visita-kraft-240g-com-tinta-branca-sem-verniz-9x5cm-da7a6569',
  'cartao-de-visita-com-4-cantos-arredondados-kraft-240g-sem-verniz-9x5cm-20ff202a',
  'cartao-de-visita-kraft-240g-sem-verniz-9x5cm-bc730c74',
  'cartao-de-visita-couche-300g-laminacao-fosca-verniz-localizado-hot-stamping-9x5c-f992dbeb',
  'cartao-de-visita-couche-300g-laminacao-fosca-e-hot-stamping-9x5cm-13d44cdc',
  'cartao-de-visita-em-pvc-0-3mm-transparente-branco-8-5x5-4cm-c40ab5e6',
  'cartao-de-visita-em-pvc-0-3mm-transparente-8-5x5-4cm-3a2593bd',
  'cartao-de-visita-em-pvc-0-5mm-cristal-frente-e-verso-8-5x5-4cm-aa4c84a1',
  'cartao-de-visita-em-pvc-0-5mm-cristal-frente-e-verso-fosco-8-5x5-4cm-ac21386d',
  'cartao-de-visita-em-pvc-0-76mm-cristal-frente-e-verso-8-5x5-4cm-62845053',
  'cartao-de-visita-em-pvc-0-76mm-cristal-frente-e-verso-fosco-8-5x5-4cm-53ca08cd',
  'cartao-de-visita-metal-premium-9x5cm-49c5bf38',
  'cartao-de-visita-supremo-metalizado-verniz-total-frente-9x5cm-1fddc49b',
  'cartao-de-visita-reciclato-240g-laminacao-fosca-9x5cm-57e745ef',
  'cartao-de-visita-reciclato-240g-sem-verniz-9x5cm-e26ff213'
);

-- Categorias inteiras a pedido do cliente (produtos primeiro, depois a categoria).
delete from public.products where category_id in (
  select id from public.categories where slug in ('eleicoes-2026','credito-pre-pago','kit-de-amostras','plotagem-de-projetos')
);
delete from public.categories where slug in ('eleicoes-2026','credito-pre-pago','kit-de-amostras','plotagem-de-projetos');
