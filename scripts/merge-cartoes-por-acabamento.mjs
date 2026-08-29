// Funde produtos de "Cartões de Visita" que só variam por peso do papel
// (250g/300g/...), acabamento (Verniz Total Frente, Sem Verniz, Laminação
// Fosca, ...) e formato de cantos — movendo tudo para attributes.material /
// attributes.acabamento / attributes.padrao (formato de cantos) em cada
// variante (viram dropdown no configurador), do mesmo jeito que já fizemos
// com "tamanho". Escrevemos em "padrao" (não "cantos") porque só as chaves
// em ATTRIBUTE_KEY_ORDER (src/lib/product/attributes.ts) viram dropdown.
//
// Uso:
//   node --env-file=.env.local scripts/merge-cartoes-por-acabamento.mjs --dry-run --report=tmp/report.json
//   node --env-file=.env.local scripts/merge-cartoes-por-acabamento.mjs

import { createClient } from "@supabase/supabase-js";
import { writeFile } from "node:fs/promises";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias.");
}

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const reportPath = args.find((a) => a.startsWith("--report="))?.split("=")[1];

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const SIZE_RE = /\s+\d+[,.]?\d*\s*x\s*\d+[,.]?\d*\s*(?:cm)?$/i;

const CANTOS_RULES = [
  [/com\s+dois\s+cantos\s+arredondados/i, "Dois Cantos Arredondados"],
  [/com\s+2\s+cantos\s+arredondados/i, "Dois Cantos Arredondados"],
  [/com\s+4\s+cantos\s+arredondados/i, "4 Cantos Arredondados"],
  [/com\s+cantos\s+arredondados/i, "4 Cantos Arredondados"],
];

const ACABAMENTO_RULES = [
  [/laminação fosca com verniz localizado e hot stamping/i, "Laminação Fosca com Verniz Localizado e Hot Stamping"],
  [/laminação fosca e hot stamping/i, "Laminação Fosca e Hot Stamping"],
  [/laminação fosca e verniz localizado/i, "Laminação Fosca e Verniz Localizado"],
  [/laminação holográfica/i, "Laminação Holográfica"],
  [/laminação fosca/i, "Laminação Fosca"],
  [/verniz total frente e verso/i, "Verniz Total Frente e Verso"],
  [/verniz total frente/i, "Verniz Total Frente"],
  [/sem verniz/i, "Sem Verniz"],
];

function clean(s) {
  return s.replace(/\s+/g, " ").trim();
}

function extractCantos(name) {
  for (const [re, label] of CANTOS_RULES) {
    if (re.test(name)) return { cantos: label, rest: clean(name.replace(re, "")) };
  }
  return { cantos: "Reto", rest: name };
}

function extractAcabamento(text) {
  for (const [re, label] of ACABAMENTO_RULES) {
    if (re.test(text)) return { acabamento: label, rest: clean(text.replace(re, "")) };
  }
  return { acabamento: null, rest: text };
}

function extractMaterial(text) {
  let m = /\s*(\d+g(?:\s+com\s+tinta\s+branca)?)\s*$/i.exec(text);
  if (m) return { material: m[1].trim(), familyBase: clean(text.slice(0, m.index)) };
  m = /\s*(\d+[,.]?\d*mm\s+.+)$/i.exec(text);
  if (m) return { material: m[1].trim(), familyBase: clean(text.slice(0, m.index)) };
  return { material: null, familyBase: text };
}

function parseName(name) {
  const withoutSize = clean(name.replace(SIZE_RE, ""));
  const { cantos, rest: r1 } = extractCantos(withoutSize);
  const { acabamento, rest: r2 } = extractAcabamento(r1);
  const { material, familyBase } = extractMaterial(r2);
  return { cantos, acabamento, material, familyBase };
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

const { data: category, error: categoryError } = await supabase
  .from("categories")
  .select("id")
  .eq("slug", "cartoes-de-visita")
  .single();
if (categoryError) throw categoryError;

const products = await fetchAll("products", "id, slug, name", (q) => q.eq("category_id", category.id));

const groups = new Map();
for (const p of products) {
  const parsed = parseName(p.name);
  if (!parsed.familyBase) continue;
  const key = parsed.familyBase;
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push({ product: p, ...parsed });
}

const report = [];
let totalFamiliesMerged = 0;
let totalProductsRemoved = 0;

for (const [familyBase, members] of groups) {
  if (members.length < 2) continue;

  const materialValues = new Set(members.map((m) => m.material).filter(Boolean));
  const finalName = materialValues.size === 1 && /\d+g/i.test([...materialValues][0])
    ? `${familyBase} ${[...materialValues][0].replace(/\s+com\s+tinta\s+branca/i, "")}`
    : familyBase;

  const sorted = [...members].sort((a, b) => a.product.id.localeCompare(b.product.id));
  const canonical = sorted[0];
  const others = sorted.slice(1);

  report.push({
    familyBase,
    finalName,
    canonical_slug: canonical.product.slug,
    members: sorted.map((m) => ({
      slug: m.product.slug,
      name: m.product.name,
      material: m.material,
      acabamento: m.acabamento,
      cantos: m.cantos,
    })),
  });
  totalFamiliesMerged += 1;
  totalProductsRemoved += others.length;

  if (dryRun) continue;

  for (const m of sorted) {
    const variants = await fetchAll("product_variants", "id, attributes", (q) => q.eq("product_id", m.product.id));
    for (const v of variants) {
      const nextAttrs = { ...(v.attributes ?? {}) };
      if (m.material) nextAttrs.material = m.material;
      if (m.acabamento) nextAttrs.acabamento = m.acabamento;
      if (m.cantos) nextAttrs.padrao = m.cantos;
      const { error } = await supabase.from("product_variants").update({ attributes: nextAttrs }).eq("id", v.id);
      if (error) throw error;
    }
  }

  for (const m of others) {
    const { error } = await supabase
      .from("product_variants")
      .update({ product_id: canonical.product.id })
      .eq("product_id", m.product.id);
    if (error) throw error;
  }

  const mergedVariants = await fetchAll("product_variants", "id, price_cents, is_default", (q) =>
    q.eq("product_id", canonical.product.id),
  );
  if (mergedVariants.length > 0) {
    const cheapest = [...mergedVariants].sort((a, b) => a.price_cents - b.price_cents)[0];
    for (const v of mergedVariants) {
      const shouldBeDefault = v.id === cheapest.id;
      if (v.is_default !== shouldBeDefault) {
        const { error } = await supabase.from("product_variants").update({ is_default: shouldBeDefault }).eq("id", v.id);
        if (error) throw error;
      }
    }
  }

  {
    const { error } = await supabase.from("products").update({ name: finalName }).eq("id", canonical.product.id);
    if (error) throw error;
  }

  for (const m of others) {
    const { error } = await supabase.from("products").delete().eq("id", m.product.id);
    if (error) throw error;
  }
}

console.log(
  `${dryRun ? "[dry-run] " : ""}Famílias mescladas: ${totalFamiliesMerged}; produtos removidos: ${totalProductsRemoved}`,
);

if (reportPath) {
  await writeFile(reportPath, JSON.stringify(report, null, 2), "utf-8");
  console.log(`Relatório salvo em ${reportPath}`);
}
