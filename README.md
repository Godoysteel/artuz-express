# Artuz Express

Loja virtual da Artuz Express — gráfica online (cartões de visita, banners, adesivos, brindes e outros produtos impressos). Next.js + Supabase, hospedada na Vercel.

- **Site em produção**: https://artuz-express.vercel.app
- **Stack**: Next.js 16 (App Router, TypeScript), Tailwind CSS v4, Supabase (Postgres + Auth), Mercado Pago (Checkout Pro), Vercel.

## Visão geral

O catálogo é orientado a dados: produtos podem opcionalmente ter **atributos** (material, cor, cobertura, tamanho…) e **adicionais opcionais** (acabamentos/serviços com preço fixo). Produtos simples (sem atributos/adicionais) continuam funcionando com só um seletor de quantidade. Preços de fornecedor podem ser sincronizados em massa via os scripts em `scripts/`.

## Como rodar localmente

```bash
npm install
cp .env.local.example .env.local   # preencher as variáveis abaixo
npm run dev
```

Abre em [http://localhost:3000](http://localhost:3000).

### Variáveis de ambiente (`.env.local`)

| Variável | Onde conseguir |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Painel Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Painel Supabase → Project Settings → API (publishable key) |
| `SUPABASE_SERVICE_ROLE_KEY` | Painel Supabase → Project Settings → API (**secret**, nunca expor ao client) |
| `MERCADOPAGO_ACCESS_TOKEN` | [Painel de devs do Mercado Pago](https://www.mercadopago.com.br/developers/panel) → aplicação "Artuz express" → Credenciais de teste/produção. Configurado em 2026-08-29 com credenciais de **produção** (a ativação de credenciais de teste/sandbox trava com erro `DXT40` recorrente no painel do Mercado Pago — produção funcionou normalmente pelo mesmo painel). Como é produção, qualquer teste de checkout usa dinheiro de verdade se completado; verificar só até a tela de pagamento do Mercado Pago é suficiente pra confirmar que a integração funciona. |
| `NEXT_PUBLIC_SITE_URL` | URL pública do site (usada nos `back_urls`/webhook do Mercado Pago) |

Veja `.env.local.example` para o formato completo.

## Banco de dados (Supabase)

Schema e dados versionados em `supabase/migrations/`, aplicados via MCP (`apply_migration`) — não há CLI local configurada, as migrations são aplicadas diretamente no projeto Supabase remoto.

Tabelas principais: `categories`, `products`, `product_images`, `product_variants` (cada linha = uma combinação de atributos + faixa de quantidade/preço, ver `attributes jsonb`), `product_addons` (acabamentos/serviços opcionais, `pricing_mode` = `flat` ou `per_unit`), `carts`/`cart_items` (visitante via cookie `guest_token` ou usuário autenticado), `orders`/`order_items`, `profiles`, `addresses`.

RLS habilitado em tudo: catálogo tem leitura pública de linhas ativas; carrinho/pedidos são escritos só por rotas server-side com a service-role key (nunca confiam em preço vindo do client — tudo é recalculado a partir de `product_variants`/`product_addons` no momento de cada operação).

Depois de qualquer migration de schema, regenerar os tipos TypeScript (`src/lib/types/database.ts`) via a ferramenta MCP `generate_typescript_types` do Supabase.

## Catálogo de fornecedor (scripts/)

A Artuz Express revende produção terceirizada pela Atual Card (fornecedor). O preço público do fornecedor já embute a margem dele; a Artuz Express aplica seu próprio markup (200%, ou seja, preço final = 3× o preço do fornecedor) por cima.

```bash
npm run catalog:download   # baixa as planilhas de preço do fornecedor (data/supplier/atualcard/*.xls, gitignored)
npm run catalog:build      # monta data/supplier/atualcard-catalog.json com o markup aplicado (gitignored)
npm run catalog:sync       # sincroniza esse catálogo com o banco Supabase (categorias/produtos/variantes)
```

Os arquivos baixados/gerados (`data/`, `tmp/`) não são versionados — só os scripts. Produtos importados do fornecedor geralmente não têm foto ainda; o site mostra um ícone de placeholder até a imagem real ser adicionada em `product_images`.

`build-atualcard-catalog.ps1` não impõe mais quantidade mínima de 10 (regra antiga removida em 2026-08-29) — a Artuz vende a partir da mesma quantidade mínima que a Atual Card oferece pra cada configuração. **Precisa ter uma BOM UTF-8 no início do arquivo `.ps1`** para o Windows PowerShell 5.1 (`powershell.exe`, sem `pwsh` instalado nesta máquina) ler os acentos/travessões corretamente — sem BOM ele lê como ANSI e quebra o parser no meio de uma string. Se editar esse script, resalvar preservando a BOM (`[System.IO.File]::WriteAllText($path, $content, [System.Text.UTF8Encoding]::new($true))`).

`scripts/backfill-quantidades-minimas.mjs` foi rodado uma vez (2026-08-29) pra recuperar, nos produtos que **já existiam**, as quantidades abaixo de 10 que a regra antiga tinha descartado (ex: Roll Up só vendia a partir de 10 un., Atual Card vende a partir de 1). Casa cada linha do catálogo bruto do fornecedor com o produto atual pela `specification` exata; quando a mesma specification aparece em mais de um produto (materiais/acabamentos genéricos reaproveitados em linhas de produto diferentes), tenta desempatar pelo nome e, se não conseguir, **não insere nada** — prefere deixar de fora a arriscar grudar a variante no produto errado. Só ADICIONA variantes (nunca apaga/renomeia), então é seguro rodar de novo. Rodada de 2026-08-29: 1192 variantes inseridas em 340 produtos; ~10500 ficaram de fora por ambiguidade — isso só se resolve de verdade fundindo os produtos quase-duplicados dessas categorias (mesmo trabalho já feito em Cartões de Visita), não é algo que esse script tenta consertar sozinho.

### Planilha comparativo de preços

`npm run catalog:price-comparison [caminho-saida.xlsx]` gera um `.xlsx` com 1 linha por produto ativo: categoria, quantidade mínima e preço da Artuz lado a lado com a quantidade e preço equivalente do fornecedor (lidos de `product_variants.attributes.supplier_cost_cents`/`markup_percent` da variante mais barata). Produtos sem esses campos (cadastrados manualmente, sem origem no fornecedor) ficam com as colunas do Atual Card em branco. Usa o pacote `xlsx` (devDependency) — não altera o banco, só lê.

### Pós-processamento do catálogo importado

Depois de um `catalog:sync`, dois problemas recorrentes precisam ser corrigidos manualmente (ou re-rodando os scripts abaixo):

- **Produtos duplicados por tamanho** — o fornecedor cadastra cada tamanho como um produto separado (ex: "Adesivo em Vinil Transparente 13x19", "32x45", "40x40mm" ...). `scripts/merge-product-families.mjs` funde esses duplicados em um produto só, movendo o tamanho para `product_variants.attributes.tamanho` (vira dropdown no configurador em vez de card repetido na grade). Rodar sempre com `--dry-run --report=<arquivo>` primeiro para conferir o que seria mesclado:
  ```bash
  node --env-file=.env.local scripts/merge-product-families.mjs --dry-run --report=tmp/merge-report.json
  node --env-file=.env.local scripts/merge-product-families.mjs
  ```
  O regex de tamanho (`SIZE_RE`/`AREA_RE` no topo do arquivo) só reconhece alguns formatos (`NxN`, `NxNcm`, `NxNmm`, `por cm2`/`m2`). Se aparecer um novo formato de tamanho no fim do nome do produto e ele não for detectado, é preciso estender esse regex — **não** existe uma correção genérica automática. Produtos "por cm²" (preço por peso/área, sem lista de tamanho fixo) são um caso à parte e não devem ser fundidos com a versão de tamanho fixo do mesmo produto.
  ⚠️ Se rodar isso depois que uma família já tiver sido mesclada antes com um formato de tamanho diferente (ex: "3x3cm" numa mesclagem antiga e "13x19" numa nova), pode nascer um produto duplicado com o mesmo nome — confira sempre com a query abaixo depois de rodar:
  ⚠️ Esses merges de produto (esse e o de acabamento, abaixo) apagam os produtos não-canônicos, e junto vai a `product_images` deles (`on delete cascade`). Se algum desses produtos tinha uma foto única/bonita (não a genérica da família), ela vira órfã — nenhum produto mais aponta pra ela, mesmo o arquivo continuando em `public/`. Foi o que aconteceu na mesclagem de Cartões de Visita em 2026-08-29 (fotos de holográfico, hot stamping, verniz localizado, cantos arredondados, metal premium sumiram da vitrine): resolvido inserindo essas imagens de volta como fotos extras (`product_images` com `sort_order` > 0) no produto que sobreviveu, e criando `src/components/product/ImageGallery.tsx` (miniaturas clicáveis) já que a página de produto só mostrava `images[0]` antes disso. Ao rodar um merge novo, sempre conferir se algum membro teria uma imagem diferente do canônico e, se sim, adicionar como imagem extra antes de aceitar a exclusão como definitiva.
  ```sql
  select category_id, name, count(*) from products group by category_id, name having count(*) > 1;
  ```
- **Produtos duplicados por peso do papel/acabamento (categoria Cartões de Visita)** — o fornecedor também cadastra cada combinação de peso ("250g"/"300g"/...), acabamento ("Verniz Total Frente", "Sem Verniz", "Laminação Fosca", ...) e formato de cantos como um produto separado, todos com a mesma foto (o mesmo problema do tamanho, mas com 3 dimensões em vez de 1). `scripts/merge-cartoes-por-acabamento.mjs` extrai essas 3 dimensões do nome via listas de regex fechadas (`CANTOS_RULES`/`ACABAMENTO_RULES` no topo do arquivo) e funde em `attributes.material` / `attributes.acabamento` / `attributes.padrao` (formato de cantos vai em `padrao`, não `cantos` — só chaves em `ATTRIBUTE_KEY_ORDER` de `src/lib/product/attributes.ts` viram dropdown). Rodou uma vez em 2026-08-29: 61 produtos → 17. Específico da categoria (nomes de acabamento não se repetem em outras categorias do mesmo jeito) — não é um script genérico como o de tamanho; se aparecer um acabamento novo que não bata com nenhuma regra, o produto vira seu próprio grupo (não mescla, não quebra nada, só não consolida).
  ```bash
  node --env-file=.env.local scripts/merge-cartoes-por-acabamento.mjs --dry-run --report=tmp/report.json
  node --env-file=.env.local scripts/merge-cartoes-por-acabamento.mjs
  ```
- **Cartão Duplo: material também virou dropdown, não script** — depois do merge acima ainda sobravam 5 produtos "Cartão Duplo Couchê/Kraft/Reciclato/Supremo/Supremo Metalizado", todos com a mesma foto de dobra (nenhuma foto de material mostra a dobra do Duplo, ver ponto abaixo sobre imagens). A pedido do cliente, fundidos manualmente (SQL direto, sem script — caso único) em um produto só "Cartão Duplo", com o nome do papel virando `attributes.material` (ex: "Couchê 300g", "Kraft 240g com Tinta Branca", "Supremo Metalizado" — o nome do papel precisa ir *dentro* do valor, senão "300g" sozinho seria ambíguo entre Couchê e Supremo). "Cartão Duplo Metal Premium" ficou de fora de propósito (linha mais exclusiva, mantém produto e foto próprios). Se aparecer um novo material de Cartão Duplo no catálogo do fornecedor, repetir o mesmo padrão manualmente (não há script pronto pra isso).
- **Produto feito à mão com preço desatualizado ("Cartão de Visita Couché 300g")** — antes de importar preço real do fornecedor, esse produto seed (sem `attributes`, 3 faixas de quantidade) tinha preço muito abaixo do real pro mesmo papel/acabamento (R$29,90 vs R$135 por 100un). Fundido em 2026-08-29 dentro de "Cartão de Visita Couchê" corrigindo o `price_cents` pro valor real (300g, Sem Verniz, 4x0) *antes* de mesclar — nunca reaproveitar um preço assim sem conferir contra o preço real equivalente primeiro. Uma das 3 variantes estava presa a um `order_items` pendente: reparentou a variante (manteve o mesmo `id`) em vez de apagar e recriar, porque `order_items.product_variant_id` é `on delete set null` — apagar teria perdido essa referência à toa. O preço histórico do pedido em si (`order_items.total_price_cents`) não foi alterado, só o preço do catálogo daqui pra frente.
- **Fallback de imagem por formato, não só por material (Cartões de Visita)** — em `businessCardImageRules` (nos dois scripts de sync), a regra `cartao duplo` vem *antes* das regras de material comuns (kraft/metalizado/supremo/reciclato): nenhuma foto de material mostra o cartão dobrado, então pra esse formato uma foto genérica (a de dobra) é mais correta que uma foto de material errada sobre a forma. Única exceção é `metal premium`, que fica antes até de `cartao duplo` porque tem foto própria e é uma linha mais exclusiva. Ao adicionar um novo formato "dobrado"/diferente do cartão padrão, considerar se as fotos de material fazem sentido pra ele antes de deixá-las ganhar prioridade.
- **SKUs reduzidos por decisão do cliente** — a categoria Adesivos tinha 36 produtos "Adesivo para Vitrine Transparente ..." e 38 "Adesivo para Vitrine Vinil ..." (um por tema/tamanho fixo: Natal, Dia das Mães, Dia dos Pais, Volta às Aulas, Copa 2026, formatos, etc.), todos com 1 variante só. A pedido do cliente, mantivemos só o genérico de cada um (precificado por m²): "Adesivo Transparente" (slug `adesivo-para-vitrine-transparente-por-m-bf4c6630`) e "Adesivo para Vitrine Vinil" (slug `adesivo-para-vitrine-vinil-por-m-45f10527`) — os outros 35 + 37 foram apagados. **Um novo `catalog:sync` recriaria esses SKUs a partir da planilha do fornecedor** — se isso acontecer, apagar de novo em vez de manter. (Não confundir com "Adesivo em Vinil"/"Adesivo Eleitoral para Vitrine Vinil", produtos diferentes que não foram tocados.)
- **Imagens por família/subfamília** — `scripts/sync-atualcard-family-images.mjs` (todas as categorias) e `scripts/sync-atualcard-business-card-images.mjs` (só Cartões de Visita) mapeiam produto → imagem por palavra-chave no nome. Ao adicionar imagens novas em `public/produtos/catalogo-atualcard/`, atualizar o mapa de regras no script correspondente antes de rodar.

## Configurador de produto

- `src/lib/product/attributes.ts` — lógica compartilhada (client + server): deriva quais atributos viram dropdown (só os que têm mais de um valor distinto no produto), casa a combinação selecionada com a variante certa, calcula o total de adicionais.
- `src/components/product/` — `AttributeSelect`, `QuantityTierList`, `AddonChecklist`, `CategoryProductJump`, orquestrados por `AddToCartForm`.
- Identidade de linha do carrinho = variante + combinação de adicionais selecionados (`cart_items.addon_selection_key`) — duas linhas com a mesma variante mas adicionais diferentes não se mesclam.

## Pagamento (Mercado Pago)

Checkout Pro (redirecionamento): `src/lib/checkout/create-order.ts` recalcula tudo no servidor, cria o pedido (`status: pending`) e a preferência de pagamento; `src/app/api/webhooks/mercadopago/route.ts` recebe a confirmação e atualiza o status do pedido. Depende de `MERCADOPAGO_ACCESS_TOKEN` — sem essa variável, o checkout falha com uma mensagem clara em vez de quebrar silenciosamente.

`NEXT_PUBLIC_SITE_URL` **precisa** ser uma URL pública em HTTPS (ex: `https://artuzexpress.com.br`) — o Mercado Pago rejeita a criação da preferência (`invalid_auto_return`) se `back_urls.success` apontar pra `localhost`. Configurado na Vercel (produção) em 2026-08-29; localmente o `.env.local` também aponta pro domínio real (não `localhost:3000`) pelo mesmo motivo — o retorno automático depois do pagamento só funciona voltando pro domínio de verdade de qualquer forma.

Testado ponta a ponta em 2026-08-29 (produção): pedido criado → preferência criada → redirecionou pra tela real de pagamento do Mercado Pago com o item/valor corretos. Não foi concluído nenhum pagamento de teste (credenciais são de produção, então completar geraria uma cobrança real).

## Deploy

```bash
vercel deploy --prod
```

Projeto Vercel: `godoysteels-projects/artuz-express`. Variáveis de ambiente já configuradas no projeto (Settings → Environment Variables) — não precisa passar via `-e`/`-b` a cada deploy.
