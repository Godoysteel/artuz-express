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
