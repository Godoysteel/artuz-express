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
| `MERCADOPAGO_ACCESS_TOKEN` | [Painel de devs do Mercado Pago](https://www.mercadopago.com.br/developers/panel) → aplicação → Credenciais de teste/produção. **Ainda não configurado** — o checkout falha de forma controlada até essa variável existir. |
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

### Pós-processamento do catálogo importado

Depois de um `catalog:sync`, dois problemas recorrentes precisam ser corrigidos manualmente (ou re-rodando os scripts abaixo):

- **Produtos duplicados por tamanho** — o fornecedor cadastra cada tamanho como um produto separado (ex: "Adesivo em Vinil Transparente 13x19", "32x45", "40x40mm" ...). `scripts/merge-product-families.mjs` funde esses duplicados em um produto só, movendo o tamanho para `product_variants.attributes.tamanho` (vira dropdown no configurador em vez de card repetido na grade). Rodar sempre com `--dry-run --report=<arquivo>` primeiro para conferir o que seria mesclado:
  ```bash
  node --env-file=.env.local scripts/merge-product-families.mjs --dry-run --report=tmp/merge-report.json
  node --env-file=.env.local scripts/merge-product-families.mjs
  ```
  O regex de tamanho (`SIZE_RE`/`AREA_RE` no topo do arquivo) só reconhece alguns formatos (`NxN`, `NxNcm`, `NxNmm`, `por cm2`/`m2`). Se aparecer um novo formato de tamanho no fim do nome do produto e ele não for detectado, é preciso estender esse regex — **não** existe uma correção genérica automática. Produtos "por cm²" (preço por peso/área, sem lista de tamanho fixo) são um caso à parte e não devem ser fundidos com a versão de tamanho fixo do mesmo produto.
  ⚠️ Se rodar isso depois que uma família já tiver sido mesclada antes com um formato de tamanho diferente (ex: "3x3cm" numa mesclagem antiga e "13x19" numa nova), pode nascer um produto duplicado com o mesmo nome — confira sempre com a query abaixo depois de rodar:
  ```sql
  select category_id, name, count(*) from products group by category_id, name having count(*) > 1;
  ```
- **Produtos duplicados por peso do papel/acabamento (categoria Cartões de Visita)** — o fornecedor também cadastra cada combinação de peso ("250g"/"300g"/...), acabamento ("Verniz Total Frente", "Sem Verniz", "Laminação Fosca", ...) e formato de cantos como um produto separado, todos com a mesma foto (o mesmo problema do tamanho, mas com 3 dimensões em vez de 1). `scripts/merge-cartoes-por-acabamento.mjs` extrai essas 3 dimensões do nome via listas de regex fechadas (`CANTOS_RULES`/`ACABAMENTO_RULES` no topo do arquivo) e funde em `attributes.material` / `attributes.acabamento` / `attributes.padrao` (formato de cantos vai em `padrao`, não `cantos` — só chaves em `ATTRIBUTE_KEY_ORDER` de `src/lib/product/attributes.ts` viram dropdown). Rodou uma vez em 2026-08-29: 61 produtos → 17. Específico da categoria (nomes de acabamento não se repetem em outras categorias do mesmo jeito) — não é um script genérico como o de tamanho; se aparecer um acabamento novo que não bata com nenhuma regra, o produto vira seu próprio grupo (não mescla, não quebra nada, só não consolida).
  ```bash
  node --env-file=.env.local scripts/merge-cartoes-por-acabamento.mjs --dry-run --report=tmp/report.json
  node --env-file=.env.local scripts/merge-cartoes-por-acabamento.mjs
  ```
- **SKUs reduzidos por decisão do cliente** — a categoria Adesivos tinha 36 produtos "Adesivo para Vitrine Transparente ..." e 38 "Adesivo para Vitrine Vinil ..." (um por tema/tamanho fixo: Natal, Dia das Mães, Dia dos Pais, Volta às Aulas, Copa 2026, formatos, etc.), todos com 1 variante só. A pedido do cliente, mantivemos só o genérico de cada um (precificado por m²): "Adesivo Transparente" (slug `adesivo-para-vitrine-transparente-por-m-bf4c6630`) e "Adesivo para Vitrine Vinil" (slug `adesivo-para-vitrine-vinil-por-m-45f10527`) — os outros 35 + 37 foram apagados. **Um novo `catalog:sync` recriaria esses SKUs a partir da planilha do fornecedor** — se isso acontecer, apagar de novo em vez de manter. (Não confundir com "Adesivo em Vinil"/"Adesivo Eleitoral para Vitrine Vinil", produtos diferentes que não foram tocados.)
- **Imagens por família/subfamília** — `scripts/sync-atualcard-family-images.mjs` (todas as categorias) e `scripts/sync-atualcard-business-card-images.mjs` (só Cartões de Visita) mapeiam produto → imagem por palavra-chave no nome. Ao adicionar imagens novas em `public/produtos/catalogo-atualcard/`, atualizar o mapa de regras no script correspondente antes de rodar.

## Configurador de produto

- `src/lib/product/attributes.ts` — lógica compartilhada (client + server): deriva quais atributos viram dropdown (só os que têm mais de um valor distinto no produto), casa a combinação selecionada com a variante certa, calcula o total de adicionais.
- `src/components/product/` — `AttributeSelect`, `QuantityTierList`, `AddonChecklist`, `CategoryProductJump`, orquestrados por `AddToCartForm`.
- Identidade de linha do carrinho = variante + combinação de adicionais selecionados (`cart_items.addon_selection_key`) — duas linhas com a mesma variante mas adicionais diferentes não se mesclam.

## Pagamento (Mercado Pago)

Checkout Pro (redirecionamento): `src/lib/checkout/create-order.ts` recalcula tudo no servidor, cria o pedido (`status: pending`) e a preferência de pagamento; `src/app/api/webhooks/mercadopago/route.ts` recebe a confirmação e atualiza o status do pedido. Depende de `MERCADOPAGO_ACCESS_TOKEN` — sem essa variável, o checkout falha com uma mensagem clara em vez de quebrar silenciosamente.

## Deploy

```bash
vercel deploy --prod
```

Projeto Vercel: `godoysteels-projects/artuz-express`. Variáveis de ambiente já configuradas no projeto (Settings → Environment Variables) — não precisa passar via `-e`/`-b` a cada deploy.
