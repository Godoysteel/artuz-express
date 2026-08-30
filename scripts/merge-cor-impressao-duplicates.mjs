// Funde pares "<produto> - 1 Cor de Impressão" / "<produto> - Impressão Colorida" na
// categoria Brindes Promocionais num produto só, com `attributes.cor` ("1x0"/"4x0")
// virando dropdown — mesmo padrão aplicado manualmente em "Balde de Gelo 5 Litros" e
// "Balde de Pipoca" em 2026-08-29. Só age em pares EXATOS (mesmo nome-base, 2
// produtos) — não tenta adivinhar em nomes que não batem exatamente com o sufixo.
//
// Uso:
//   node --env-file=.env.local scripts/merge-cor-impressao-duplicates.mjs --dry-run
//   node --env-file=.env.local scripts/merge-cor-impressao-duplicates.mjs

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const dryRun = process.argv.includes("--dry-run");
if (!supabaseUrl || !serviceRoleKey) throw new Error("Credenciais do Supabase são obrigatórias.");

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const SUFFIX_RE = / - (1 Cor de Impress[ãa]o|Impress[ãa]o Colorida)\s*$/i;
const baseName = (name) => name.replace(SUFFIX_RE, "").trim();
const cor = (name) => (/impress[ãa]o colorida/i.test(name) ? "4x0" : "1x0");

const { data: category, error: categoryError } = await supabase
  .from("categories").select("id").eq("slug", "brindes-promocionais").single();
if (categoryError) throw categoryError;

const { data: products, error: productError } = await supabase
  .from("products").select("id, name, slug").eq("category_id", category.id);
if (productError) throw productError;

const groups = new Map();
for (const product of products) {
  if (!SUFFIX_RE.test(product.name)) continue;
  const key = baseName(product.name);
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(product);
}

const pairs = [...groups.entries()].filter(([, members]) => members.length === 2);
const skipped = [...groups.entries()].filter(([, members]) => members.length !== 2);

console.log(`${pairs.length} pares encontrados; ${skipped.length} grupo(s) ignorado(s) (não são exatamente 2 produtos):`);
if (skipped.length) console.table(skipped.map(([key, members]) => ({ base_name: key, produtos: members.length })));

if (dryRun) {
  console.table(pairs.map(([key, members]) => ({ base_name: key, produtos: members.map((m) => m.name).join(" | ") })));
  process.exit(0);
}

for (const [name, members] of pairs) {
  // Canônico = o de menor preço mínimo (evita depender de ordem alfabética).
  const withMinPrice = await Promise.all(
    members.map(async (m) => {
      const { data } = await supabase
        .from("product_variants")
        .select("price_cents")
        .eq("product_id", m.id)
        .order("price_cents", { ascending: true })
        .limit(1)
        .single();
      return { ...m, minPrice: data?.price_cents ?? Infinity };
    }),
  );
  withMinPrice.sort((a, b) => a.minPrice - b.minPrice);
  const [canonical, other] = withMinPrice;

  await supabase.from("products").update({ name }).eq("id", canonical.id);

  const { data: canonicalVariants } = await supabase
    .from("product_variants").select("id, attributes").eq("product_id", canonical.id);
  for (const v of canonicalVariants ?? []) {
    await supabase.from("product_variants")
      .update({ attributes: { ...v.attributes, cor: cor(canonical.name) } })
      .eq("id", v.id);
  }

  const { data: otherVariants } = await supabase
    .from("product_variants").select("id, attributes").eq("product_id", other.id);
  for (const v of otherVariants ?? []) {
    await supabase.from("product_variants")
      .update({ attributes: { ...v.attributes, cor: cor(other.name) }, product_id: canonical.id })
      .eq("id", v.id);
  }

  await supabase.from("products").delete().eq("id", other.id);

  const { data: allVariants } = await supabase
    .from("product_variants").select("id, price_cents").eq("product_id", canonical.id)
    .order("price_cents", { ascending: true });
  const cheapestId = allVariants?.[0]?.id;
  for (const v of allVariants ?? []) {
    await supabase.from("product_variants")
      .update({ is_default: v.id === cheapestId })
      .eq("id", v.id);
  }

  console.log(`✓ ${name} (${withMinPrice.length} produtos fundidos, ${allVariants?.length ?? 0} variantes)`);
}

console.log(`${pairs.length} produtos fundidos.`);
