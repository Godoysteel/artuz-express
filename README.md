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
- **Produtos com categoria errada, herdando imagem de outra categoria** — o fornecedor às vezes cadastra um produto na seção errada do catálogo; isso passou despercebido pelos scripts de imagem (que confiam em `category_id`) e resultou em produtos completamente sem relação com banners/lonas mostrando essa foto. Encontrados e corrigidos em 2026-08-29 (categoria + `product_images.url` atualizados manualmente via SQL, sem script — é preciso olhar produto a produto, não tem regra genérica pra detectar isso): "Banner para Roll Up..." e "Roll Up com Lona..." estavam em `agendas-e-cadernos`/`balcoes-totens-e-urnas` → movidos pra `banners-e-lonas`; "Postal Kraft 240g Sem Verniz 9x10cm" (um postal de papel) estava em `banners-e-lonas` → movido pra `convites-e-postais`; "Tag para Garrafa Couchê 300g..." (uma tag de papel) também estava em `banners-e-lonas` → movido pra `tags-e-cartelas`, com foto própria (`familia-tag-garrafa-couche.png`) em vez da genérica de tags/cartelas. Se a categoria "Banners e Lonas" (ou qualquer outra) voltar a mostrar produto com foto visivelmente errada, o primeiro lugar a olhar é `products.category_id` — pode ser miscategorização do fornecedor, não erro nas regras de imagem.
- **Duplicatas por cor de impressão (Brindes Promocionais)** — o fornecedor cadastra "1 Cor de Impressão" e "Impressão Colorida" (4x0) do mesmo produto como 2 produtos separados, cada um mostrando seu próprio "a partir de", quando deveria ser 1 produto com "Cor" no dropdown e o preço mínimo real (o da opção 1 cor, mais barata). `scripts/merge-cor-impressao-duplicates.mjs` detecta pares exatos pelo sufixo do nome (`" - 1 Cor de Impressão"` / `" - Impressão Colorida"`) e funde automaticamente — **só age em pares exatos de 2 produtos**, não tenta adivinhar em grupos com 1 ou 3+. Rodado em 2026-08-29 (Brindes Promocionais): 32 pares fundidos. "Balde de Gelo 5 Litros" e "Balde de Pipoca" foram fundidos manualmente antes (padrão um pouco diferente, com `tamanho` além de `cor`) e serviram de validação do critério antes de escrever o script. Casos como a família "Caneca de Café" (10 produtos com formatos de caneca genuinamente diferentes, não só cor) foram deixados de fora de propósito — são produtos distintos, não duplicata.
  ```bash
  node --env-file=.env.local scripts/merge-cor-impressao-duplicates.mjs --dry-run
  node --env-file=.env.local scripts/merge-cor-impressao-duplicates.mjs
  ```
- **Produto-seed obsoleto apagado** — "Banner em Lona 60x90cm" (`attributes` vazio, 3 faixas de quantidade 1/3/5 un. a R$19/49/79) era um placeholder anterior à importação do fornecedor real; a versão real (dentro do produto "Lona"/"Banner 280g") só vende a partir de 10 un. e a preços bem diferentes. Sem nenhum pedido/carrinho referenciando — apagado em 2026-08-29 (mesmo padrão do "Cartão de Visita Couché 300g" corrigido antes: produto-seed com preço/quantidade fictícios, sem correspondência real pra reaproveitar).
- **Imagens por família/subfamília** — `scripts/sync-atualcard-family-images.mjs` (todas as categorias), `scripts/sync-atualcard-business-card-images.mjs` (só Cartões de Visita), `scripts/sync-atualcard-banner-images.mjs` (só Banners e Lonas) e `scripts/sync-atualcard-promotional-gift-images.mjs` (só Brindes Promocionais) mapeiam produto → imagem por palavra-chave no nome. Ao adicionar imagens novas em `public/produtos/catalogo-atualcard/`, atualizar o mapa de regras no script correspondente antes de rodar. O script de brindes é mais estrito que os outros: falha (`throw`) se algum produto da categoria não bater com nenhuma regra, em vez de cair num fallback genérico — rodar sempre com `--dry-run` primeiro pra ver a tabela de contagem por imagem antes de aplicar. Rodado em 2026-08-29: 115 produtos sincronizados, imagens preparadas pelo Codex.
- **Produtos duplicados por material/formato (Lona, categoria Banners e Lonas)** — "Lona 280g" (tamanho fixo), "Lona 280g p/ m²" e "Lona 440g por m²" eram 3 produtos com a mesma foto; "Lona Grande Formato 280g p/ m²" e "Lona Grande Formato 440g por m²" eram **duplicatas exatas** (mesma specification, mesmo preço) das duas últimas — descartadas sem migrar variantes. Fundidos em 2026-08-29 num produto só "Lona", com `attributes.material` ("280g"/"440g") e `attributes.tamanho` (tamanhos reais + o valor literal `"Por m²"` pras variantes por metro quadrado, mesmo padrão já usado alhures pra "por cm²"/"por m²") virando dropdowns. Mesmo tratamento pra "Lona 440g por m² com Ilhós Metálico" (mantida separada — ilhós só existe em 440g, não faz sentido fundir com a sem-ilhós) + sua duplicata "Lona Grande Formato ... com Ilhós Metálico" (descartada); aproveitado pra adicionar `attributes.cor` (4x0/4x4) nessas 2 variantes, que antes não tinham nenhum atributo diferenciador (2 variantes com quantity=1 e preços diferentes, sem como saber qual era qual na UI).
  ⚠️ **Erro cometido e corrigido na hora**: ao mover variantes de um produto não-canônico pro canônico, apaguei só os produtos que ficaram *sem* variante nenhuma originalmente (as duplicatas exatas) mas esqueci de apagar os 2 produtos-origem que *tiveram* variantes migradas pra fora (ficaram cascas vazias, sem variante, mas a linha em `products` continuava lá, poluindo o dropdown de navegação e a grade da categoria). Corrigido logo em seguida. Ao fazer esse tipo de merge, sempre conferir depois que **todo** produto não-canônico envolvido (não só os que nunca tiveram variante migrada) foi de fato apagado.
- **Produtos duplicados por bastão (categoria Banners e Lonas)** — mesmo problema de tamanho/acabamento de outras categorias, mas com "bastão" (a haste que prende o banner): "Banner 280g", "Banner com Bastão Estreito 280g" e "Banner com Bastão Largo 280g" eram 3 produtos com a mesma foto; idem "Mini Banner 280g" e "Mini Banner Bastão Largo 280g". Fundidos manualmente (SQL direto, sem script — caso único, como o Cartão Duplo) em 2026-08-29 num produto cada, com `attributes.bastao` ("Sem bastão"/"Estreito"/"Largo") virando dropdown — nova chave adicionada em `ATTRIBUTE_KEY_ORDER`/`ATTRIBUTE_LABELS` (`src/lib/product/attributes.ts`). Diferente de tamanho/acabamento, aqui os atributos **não formam um cross-product completo** (cada bastão só existe em alguns tamanhos) — isso expôs um bug real no `AddToCartForm`: trocar um dropdown pra uma combinação que não existe deixava a página em "Produto indisponível" sem chance de recuperação. Corrigido em `handleAttributeChange` — quando a combinação nova não existe, mantém só o atributo que acabou de mudar e adota os demais valores de uma variante real que o tenha (em vez de tentar preservar todos os valores anteriores).

### Peso das variantes (`product_variants.weight_grams`)

A planilha de preços do fornecedor já vem com peso por variante (`attributes.weight_kg`, gravado desde sempre pelo `catalog:sync` mas nunca usado). Em 2026-08-29, adicionada a coluna `product_variants.weight_grams` (migration `add_weight_grams_to_product_variants`) e populada com `round(weight_kg * 1000)` pra tudo que já tinha o dado: 24.384 de 24.427 variantes (99,8%). As 43 que ficaram sem peso são produtos cadastrados manualmente sem origem no fornecedor (seeds/exemplos como "Cartão Fidelidade com Arte Única", "Copo Personalizado" etc.) — não têm `attributes.specification` nem `weight_kg`. Um novo `catalog:sync` grava `attributes.weight_kg` de novo nas variantes que ele recria; se isso acontecer, precisa rodar de novo o mesmo `update ... where attributes ? 'weight_kg'` pra preencher `weight_grams` nas novas linhas. Existe pra viabilizar cálculo de frete real (Melhor Envio) — ainda não está ligado no checkout.

## Configurador de produto

- `src/lib/product/attributes.ts` — lógica compartilhada (client + server): deriva quais atributos viram dropdown (só os que têm mais de um valor distinto no produto), casa a combinação selecionada com a variante certa, calcula o total de adicionais.
- `src/components/product/` — `AttributeSelect`, `QuantityTierList`, `AddonChecklist`, `CategoryProductJump`, orquestrados por `AddToCartForm`.
- Identidade de linha do carrinho = variante + combinação de adicionais selecionados (`cart_items.addon_selection_key`) — duas linhas com a mesma variante mas adicionais diferentes não se mesclam.

## Pagamento (Mercado Pago)

Checkout Pro (redirecionamento): `src/lib/checkout/create-order.ts` recalcula tudo no servidor, cria o pedido (`status: pending`) e a preferência de pagamento; `src/app/api/webhooks/mercadopago/route.ts` recebe a confirmação e atualiza o status do pedido. Depende de `MERCADOPAGO_ACCESS_TOKEN` — sem essa variável, o checkout falha com uma mensagem clara em vez de quebrar silenciosamente.

`NEXT_PUBLIC_SITE_URL` **precisa** ser uma URL pública em HTTPS (ex: `https://artuzexpress.com.br`) — o Mercado Pago rejeita a criação da preferência (`invalid_auto_return`) se `back_urls.success` apontar pra `localhost`. Configurado na Vercel (produção) em 2026-08-29; localmente o `.env.local` também aponta pro domínio real (não `localhost:3000`) pelo mesmo motivo — o retorno automático depois do pagamento só funciona voltando pro domínio de verdade de qualquer forma.

Testado ponta a ponta em 2026-08-29 (produção): pedido criado → preferência criada → redirecionou pra tela real de pagamento do Mercado Pago com o item/valor corretos. Cliente completou um pagamento real (pedido AE-000005, R$12,00) e o webhook atualizou o status pra "paid" automaticamente — confirma que o fluxo inteiro funciona.

## Frete (Melhor Envio)

`src/lib/melhor-envio/client.ts` — integração OAuth2 (app "Artuz Express" cadastrado em `app.melhorenvio.com.br/integracoes/area-dev`, client_id/secret em `MELHOR_ENVIO_CLIENT_ID`/`MELHOR_ENVIO_CLIENT_SECRET`). Autorização é manual e única: acessar `/api/integrations/melhor-envio/authorize` logado como admin, aprovar na tela do Melhor Envio — o callback (`/api/integrations/melhor-envio/callback`) troca o `code` por `access_token`/`refresh_token` e grava na tabela `melhor_envio_tokens` (linha única, `id boolean primary key`). `getValidAccessToken()` renova sozinho via refresh_token quando falta menos de 1 dia pra expirar (access_token dura 30 dias, refresh_token 45).

`calculateShipping(cep, itens)` cota frete somando todos os itens numa única caixa (aproximação: superestima peso/dimensão total em vez de arriscar subestimar). Dois dados que faltam no catálogo:

- **Peso**: resolvido em 2026-08-29, ver seção "Peso das variantes" acima — usa `product_variants.weight_grams`.
- **Dimensão da caixa**: nenhum produto tem isso cadastrado (fornecedor só informa peso). `src/lib/melhor-envio/box-tiers.ts` mapeia `category_slug` → caixa-padrão (pequena/média/grande/tubo), aprovado pelo cliente em 2026-08-29 como aproximação aceitável — frete fica uma estimativa, não exato. Categoria sem mapeamento explícito cai no `DEFAULT_BOX` (caixa média).

CEP de origem fixo em `ORIGIN_POSTAL_CODE` (89205-800) — mesmo padrão de constante fixa usado em `src/lib/whatsapp.ts`, não é variável de ambiente.

Ligado no checkout: `CheckoutForm.tsx` chama `POST /api/checkout/shipping-quote` no blur do CEP (`src/lib/melhor-envio/quote.ts` monta os itens a partir do carrinho ativo) e mostra as opções (PAC/SEDEX/...) num radio, com o total atualizado ao vivo. No submit, `create-order.ts` **recota o frete no servidor** com o mesmo carrinho/CEP e usa o preço da opção cujo `serviceId` bate com o escolhido pelo cliente — nunca confia no preço vindo do client (mesma postura do resto do checkout). Se a opção não existir mais na recotação (frete mudou entre o cliente ver e finalizar), rejeita com `CheckoutError` pedindo pra recalcular. O frete vira mais um item na preferência do Mercado Pago (`title: "Frete — <serviço> (<transportadora>)"`).

Testado ponta a ponta em 2026-08-29 (dev local, contra a API real de produção do Melhor Envio): CEP 01310-200 → PAC R$22,08 (6 dias), SEDEX R$34,62 (2 dias); pedido criado com `shipping_cents`/`total_cents` corretos e preferência do Mercado Pago gerada normalmente (pedido de teste apagado depois).

## Painel de admin (`/admin/pedidos`)

Dono único do negócio, sem sistema de papéis — `src/lib/admin/auth.ts` libera acesso só pra quem loga com o e-mail em `ADMIN_EMAIL` (variável de ambiente; padrão `godoysteelframe@gmail.com` se não definida). Redireciona pro login se deslogado, 404 se logado mas não for o admin.

Lista todos os pedidos (`/admin/pedidos`) e o detalhe de cada um (itens, endereço, contato, ID do pagamento no Mercado Pago), com um seletor pra mudar o status manualmente (Pago → Em produção → Enviado → Concluído, ou Cancelado). Pedidos com status `pending`/`payment_failed` não têm seletor — só viram gerenciáveis depois que o pagamento é confirmado. Usa `createServiceClient()` (ignora RLS) porque a policy de `orders` só deixa cada usuário ver os próprios pedidos; o próprio `requireAdmin()`/`updateOrderStatusAction` que faz a checagem de admin no lugar da RLS.

Conta de admin criada em 2026-08-29 (`godoysteelframe@gmail.com`, auth.users). Se precisar recriar ou trocar a senha, usar `supabase.auth.admin.createUser`/`updateUserById` com a service role key — não existe fluxo de "esqueci minha senha" no site ainda.

## Nota fiscal

Emissão ainda é **manual** (decisão do cliente: começar sem custo de emissor automático, migrar depois). Pra viabilizar isso, o checkout coleta CPF do cliente (`orders.cpf`, obrigatório, validado com o algoritmo real de dígito verificador em `isValidCpf` — `src/lib/format.ts`) e mostra no detalhe do pedido no admin (`/admin/pedidos/[id]`), pra quem for emitir a nota ter o dado à mão. Quando migrar pra emissão automática (Focus NFe, NFe.io, Bling...), o ponto de entrada natural é o webhook do Mercado Pago (`src/app/api/webhooks/mercadopago/route.ts`), que já é onde o pedido vira `paid` — disparar a chamada de emissão ali.

## Upload de arte e serviço de design

**Obrigatório**: todo item do carrinho precisa ter uma arte enviada OU o adicional "Nossos designers fazem a arte pra você" selecionado — sem isso não dá pra finalizar a compra. Isso é a exigência de negócio (2026-08-29); a checagem existe em dois lugares:
- Client (`AddToCartForm.tsx`): botão "Adicionar ao carrinho" fica desabilitado até ter um dos dois.
- Servidor (`create-order.ts`): valida de novo antes de criar o pedido, mesmo que o carrinho já tenha itens antigos sem arte — nunca confia só no client pra travar o checkout.

Upload principal acontece **na página do produto**, antes de existir carrinho/pedido (`ArtworkUpload.tsx`, logo acima de "Serviços Opcionais" no configurador) — não exige login, pra funcionar também no carrinho de visitante. Fluxo: um token aleatório (`crypto.randomUUID()`) é gerado no client; o arquivo sobe direto do navegador pro Storage via signed upload URL (`src/lib/orders/draft-upload-actions.ts`), ficando registrado em `draft_artwork` (chave = o token, sem dono ainda). Ao clicar "Adicionar ao carrinho", o token vai junto em `cart_items.artwork_token`. Na finalização da compra (`create-order.ts`), cada `order_item` recém-criado "reclama" o arquivo do rascunho correspondente (vira uma linha em `order_item_files`, apontando pro mesmo arquivo já enviado) e a linha em `draft_artwork` é apagada — o arquivo em si não precisa ser movido de lugar no Storage.

Cliente também pode enviar (ou enviar mais) arquivos depois da compra, em `/pedidos/[id]`, mas só depois que o pagamento é confirmado (`pending`/`payment_failed` não liberam) e exige estar logado — usa `src/lib/orders/upload-actions.ts` (fluxo separado do de rascunho, já que aqui o `order_item_id` já existe de verdade e dá pra confirmar dono via `orders.user_id = auth.uid()`). Os dois fluxos convergem pra mesma tabela `order_item_files`, então a página do pedido e o admin mostram tudo junto, não importa por qual caminho a arte chegou.

Bucket `artes-pedidos` no Storage é **privado**, sem nenhuma policy de RLS liberando client direto — toda leitura/escrita passa por server actions que fazem a checagem de dono (ou, no caso do rascunho antes da compra, confiam só no token ser um UUID imprevisível, mesmo padrão já usado pro `guest_token` do carrinho). Download (cliente e admin) usa signed URL (5 min de validade). Formatos aceitos: PDF, PNG, JPG, JPEG, AI, PSD, SVG, CDR, EPS; até 25 MB (`src/lib/orders/files.ts`).

Adicional "Nossos designers fazem a arte pra você" (R$70,00 fixo + 3 dias) foi inserido em todo produto ativo em 2026-08-29 via SQL direto (não tem script — se precisar re-rodar pra produtos novos, repetir o mesmo `insert ... select id from products where is_active`). A checagem "esse item já tem designer, não precisa de arte" compara o texto exato do `label` contra `DESIGN_SERVICE_LABEL` (`src/lib/product/design-service.ts`, importada tanto no client quanto em `create-order.ts`) — mudar o texto do adicional no banco quebra essa comparação, teria que atualizar a constante junto.

## Estatísticas (Cloudflare Web Analytics)

Site cadastrado em 2026-08-29 no Cloudflare Web Analytics (conta `godoysteelframe@gmail.com`) — só o produto "Web Analytics" (snippet JS, privacy-first), sem migrar o DNS do domínio pra Cloudflare. Snippet injetado em `src/app/layout.tsx` via `next/script` (`strategy="afterInteractive"`), token do beacon fixo no código (não é segredo — é só um identificador de site, o mesmo padrão do resto de config pública do Cloudflare). Dashboard: Cloudflare → Analytics → Web Analytics → artuzexpress.com.br. Métricas aparecem com alguns minutos de atraso depois do primeiro acesso real ao site em produção.

## Deploy

```bash
vercel deploy --prod
```

Projeto Vercel: `godoysteels-projects/artuz-express`. Variáveis de ambiente já configuradas no projeto (Settings → Environment Variables) — não precisa passar via `-e`/`-b` a cada deploy.
