// Adiciona de volta as quantidades abaixo de 10 que o catálogo do fornecedor
// (Atual Card) oferece mas que uma regra antiga do pipeline de import
// (`build-atualcard-catalog.ps1`, removida) descartava sempre que a mesma
// configuração também tinha um lote de 10+. Isso deixava a Artuz vendendo só
// a partir de 10 un. em vários produtos (ex: Roll Up) mesmo quando o
// fornecedor vende a partir de 1 un.
//
// Só ADICIONA variantes que faltam (nunca apaga/renomeia nada) — cada nova
// variante herda os mesmos atributos (material/acabamento/tamanho/padrão)
// de uma variante-irmã já existente com a mesma `specification`, então
// funciona mesmo em produtos que já foram fundidos/renomeados manualmente.
//
// Uso:
//   node --env-file=.env.local scripts/backfill-quantidades-minimas.mjs --dry-run --report=tmp/report.json
//   node --env-file=.env.local scripts/backfill-quantidades-minimas.mjs

import { createClient } from "@supabase/supabase-js";
import { readFile, writeFile } from "node:fs/promises";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias.");
}

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const reportPath = args.find((a) => a.startsWith("--report="))?.split("=")[1];
const catalogPath =
  args.find((a) => a.startsWith("--catalog="))?.split("=")[1] ??
  "data/supplier/atualcard-catalog-unfiltered.json";

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function fetchAll(table, select, filterFn) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    let q = supabase.from(table).select(select).range(from, from + 999);
    if (filterFn) q = filterFn(q);
    const { data, error } = await q;
    if (error) throw error;
    rows.push(...data);
    if (data.length < 1000) break;
  }
  return rows;
}

const catalogRaw = await readFile(catalogPath, "utf-8");
const catalog = JSON.parse(catalogRaw.charCodeAt(0) === 0xfeff ? catalogRaw.slice(1) : catalogRaw);

const existingVariants = await fetchAll(
  "product_variants",
  "id, product_id, quantity, attributes",
  (q) => q.not("attributes->>specification", "is", null),
);

const productNameById = new Map(
  (await fetchAll("products", "id, name")).map((p) => [p.id, p.name.trim().toLowerCase()]),
);

// specification -> { productIds: Set, sampleAttributes }
const bySpec = new Map();
// "spec||productId" -> Set(quantities) já existentes para aquele produto específico
const quantitiesBySpecAndProduct = new Map();

for (const v of existingVariants) {
  const spec = v.attributes?.specification;
  if (!spec) continue;
  if (!bySpec.has(spec)) {
    bySpec.set(spec, { productIds: new Set(), sampleAttributes: v.attributes });
  }
  bySpec.get(spec).productIds.add(v.product_id);

  const key = `${spec}||${v.product_id}`;
  if (!quantitiesBySpecAndProduct.has(key)) quantitiesBySpecAndProduct.set(key, new Set());
  quantitiesBySpecAndProduct.get(key).add(v.quantity);
}

const CARRY_OVER_KEYS = ["material", "cor", "cobertura", "tamanho", "acabamento", "padrao"];

const toInsert = [];
const skippedAmbiguous = [];
const skippedNoMatch = [];

for (const product of catalog.products) {
  for (const variant of product.variants) {
    const spec = variant.attributes.specification;
    const entry = bySpec.get(spec);

    // Só age quando essa specification exata pertence, hoje, a um único
    // produto no Supabase — critério conservador: o catálogo ainda tem
    // muita fragmentação (produtos quase-duplicados fora de Cartões de
    // Visita que não passaram por merge nesta sessão), então tentar casar
    // pelo "conjunto de specs do produto" dá ruído pior que isso.
    if (!entry) {
      skippedNoMatch.push({ product: product.name, spec, quantity: variant.quantity });
      continue;
    }

    let productId;
    if (entry.productIds.size === 1) {
      productId = [...entry.productIds][0];
    } else {
      // Specification ambígua (compartilhada por produtos diferentes) —
      // tenta desempatar pelo nome exato: produtos que nunca foram
      // fundidos/renomeados manualmente ainda têm o mesmo nome do
      // catálogo bruto do fornecedor.
      const rawName = product.name.trim().toLowerCase();
      const nameMatches = [...entry.productIds].filter((pid) => productNameById.get(pid) === rawName);
      if (nameMatches.length === 1) {
        productId = nameMatches[0];
      } else {
        skippedAmbiguous.push({ product: product.name, spec, quantity: variant.quantity, productIds: [...entry.productIds] });
        continue;
      }
    }
    const existingQuantities = quantitiesBySpecAndProduct.get(`${spec}||${productId}`);
    if (existingQuantities?.has(variant.quantity)) continue; // já existe

    const sampleAttributes = entry.sampleAttributes;
    const nextAttributes = { ...variant.attributes };
    for (const key of CARRY_OVER_KEYS) {
      if (sampleAttributes[key] != null) nextAttributes[key] = sampleAttributes[key];
    }

    toInsert.push({
      product_id: productId,
      label: variant.label,
      quantity: variant.quantity,
      price_cents: variant.price_cents,
      attributes: nextAttributes,
      is_default: false,
      is_active: true,
      sort_order: 0,
    });
  }
}

console.log(
  `${dryRun ? "[dry-run] " : ""}Variantes a inserir: ${toInsert.length}; sem produto correspondente: ${skippedNoMatch.length}; specification ambígua (mais de 1 produto): ${skippedAmbiguous.length}`,
);

if (reportPath) {
  await writeFile(
    reportPath,
    JSON.stringify({ toInsert, skippedAmbiguous, skippedNoMatch }, null, 2),
    "utf-8",
  );
  console.log(`Relatório salvo em ${reportPath}`);
}

if (dryRun || toInsert.length === 0) process.exit(0);

const affectedProductIds = new Set(toInsert.map((v) => v.product_id));

for (let i = 0; i < toInsert.length; i += 300) {
  const { error } = await supabase.from("product_variants").insert(toInsert.slice(i, i + 300));
  if (error) throw error;
}

for (const productId of affectedProductIds) {
  const variants = await fetchAll("product_variants", "id, price_cents, is_default", (q) =>
    q.eq("product_id", productId),
  );
  const cheapest = [...variants].sort((a, b) => a.price_cents - b.price_cents)[0];
  for (const v of variants) {
    const shouldBeDefault = v.id === cheapest.id;
    if (v.is_default !== shouldBeDefault) {
      const { error } = await supabase
        .from("product_variants")
        .update({ is_default: shouldBeDefault })
        .eq("id", v.id);
      if (error) throw error;
    }
  }
}

console.log(`Inseridas ${toInsert.length} variantes em ${affectedProductIds.size} produtos; is_default recalculado.`);
