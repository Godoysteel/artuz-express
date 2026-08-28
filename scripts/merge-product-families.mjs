// Agrupa produtos importados do fornecedor que só variam por tamanho no nome
// (ex: "Cartão de Agradecimento Couchê 250g Verniz Total Frente 9x5cm" /
// "...9x10cm" / "...4,25x4,8cm") em um único produto, movendo o tamanho para
// um atributo "tamanho" em cada variante — assim a família vira um card só
// na grade, e o tamanho é escolhido no configurador (lista de faixas).
//
// Uso:
//   node scripts/merge-product-families.mjs --category=cartoes-de-visita --dry-run
//   node scripts/merge-product-families.mjs --category=cartoes-de-visita
//   node scripts/merge-product-families.mjs                 (todas as categorias, aplica de verdade)

import { createClient } from "@supabase/supabase-js";
import { writeFile } from "node:fs/promises";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias.");
}

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const categoryArg = args.find((a) => a.startsWith("--category="));
const onlyCategorySlug = categoryArg ? categoryArg.split("=")[1] : null;
const reportPath = args.find((a) => a.startsWith("--report="))?.split("=")[1];

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const SIZE_RE = /\s+(\d+[,.]?\d*\s*x\s*\d+[,.]?\d*\s*cm)$/i;
const AREA_RE = /\s+(por\s*cm2|por\s*m2|por\s*m²)$/i;

function splitFamilyAndSize(name) {
  const m = SIZE_RE.exec(name);
  if (m) return { family: name.slice(0, m.index).trim(), tamanho: m[1].replace(/\s+/g, " ").trim() };
  const m2 = AREA_RE.exec(name);
  if (m2) return { family: name.slice(0, m2.index).trim(), tamanho: m2[1].replace(/\s+/g, " ").trim() };
  return { family: name, tamanho: null };
}

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

let categories = await fetchAll("categories", "id, slug, name");
if (onlyCategorySlug) categories = categories.filter((c) => c.slug === onlyCategorySlug);

const report = [];
let totalFamiliesMerged = 0;
let totalProductsRemoved = 0;

for (const category of categories) {
  const products = await fetchAll(
    "products",
    "id, slug, name",
    (q) => q.eq("category_id", category.id),
  );
  if (products.length < 2) continue;

  const groups = new Map(); // family name -> [{product, tamanho}]
  for (const p of products) {
    const { family, tamanho } = splitFamilyAndSize(p.name);
    if (!tamanho) continue; // sem tamanho detectável no nome: não agrupa
    const key = family;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ product: p, tamanho });
  }

  for (const [familyName, members] of groups) {
    if (members.length < 2) continue; // só 1 produto: nada a mesclar

    // canônico = o de menor id (determinístico), renomeado para o nome da família
    const sorted = [...members].sort((a, b) => a.product.id.localeCompare(b.product.id));
    const canonical = sorted[0];
    const others = sorted.slice(1);

    report.push({
      category: category.name,
      family: familyName,
      canonical_slug: canonical.product.slug,
      members: sorted.map((m) => ({ slug: m.product.slug, tamanho: m.tamanho })),
    });
    totalFamiliesMerged += 1;
    totalProductsRemoved += others.length;

    if (dryRun) continue;

    // 1) marca "tamanho" nas variantes de cada membro (incluindo o canônico)
    for (const m of sorted) {
      const variants = await fetchAll("product_variants", "id, attributes", (q) =>
        q.eq("product_id", m.product.id),
      );
      for (const v of variants) {
        const nextAttrs = { ...(v.attributes ?? {}), tamanho: m.tamanho };
        const { error } = await supabase
          .from("product_variants")
          .update({ attributes: nextAttrs })
          .eq("id", v.id);
        if (error) throw error;
      }
    }

    // 2) reparenta as variantes dos membros não-canônicos para o canônico
    for (const m of others) {
      const { error } = await supabase
        .from("product_variants")
        .update({ product_id: canonical.product.id })
        .eq("product_id", m.product.id);
      if (error) throw error;
    }

    // 3) garante exatamente uma variante is_default = true (a de menor preço)
    const mergedVariants = await fetchAll(
      "product_variants",
      "id, price_cents, is_default",
      (q) => q.eq("product_id", canonical.product.id),
    );
    if (mergedVariants.length > 0) {
      const cheapest = [...mergedVariants].sort((a, b) => a.price_cents - b.price_cents)[0];
      for (const v of mergedVariants) {
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

    // 4) renomeia o canônico para o nome da família (sem o tamanho)
    {
      const { error } = await supabase
        .from("products")
        .update({ name: familyName })
        .eq("id", canonical.product.id);
      if (error) throw error;
    }

    // 5) apaga os produtos não-canônicos (cascade cuida de product_images;
    //    as variantes já foram movidas, então nada de variante é perdido)
    for (const m of others) {
      const { error } = await supabase.from("products").delete().eq("id", m.product.id);
      if (error) throw error;
    }
  }
}

console.log(
  `${dryRun ? "[dry-run] " : ""}Famílias mescladas: ${totalFamiliesMerged}; produtos removidos: ${totalProductsRemoved}`,
);

if (reportPath) {
  await writeFile(reportPath, JSON.stringify(report, null, 2), "utf-8");
  console.log(`Relatório salvo em ${reportPath}`);
}
