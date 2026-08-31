// Reorganiza "Catálogos e Livretos" pra bater com a página do fornecedor
// (atualcard.com.br/catalogos-e-livretos/9664), que mostra só 3 produtos
// (Catálogos, Livretos, Manuais) — na prática o MESMO SKU vendido sob 3
// nomes de marketing (mesmo preço, mesma matriz Material×Cobertura×
// Tamanho×Páginas nos 3).
//
// A categoria no nosso banco virou um balde de despejo: 222 produtos, dos
// quais só ~188 são realmente catálogo/manual/jornal (o resto é campanha
// eleitoral miscategorizada: Adesivo Político, Banner Político, Cartão de
// Visita Político, etc. — ver MISC_TARGETS abaixo).
//
// O que este script faz:
//   1. Extrai material/cobertura/tamanho/paginas do NOME de cada produto
//      "Manuais e Catálogos ..." / "Manuais e Catálogos Horizontal ..." e
//      grava como atributos de variante (não existiam antes, só no nome).
//   2. "Jornais Eleitorais ..." tem preço idêntico, combo a combo, aos de
//      "Manuais e Catálogos" — são a mesma peça duplicada. Detecta por
//      chave de spec (não por nome): duplicata exata é apagada; o único
//      combo que não existe do lado "Manuais e Catálogos" é preservado.
//   3. Funde tudo (Manuais e Catálogos + Horizontal + o 1 Jornais único)
//      num produto canônico único.
//   4. Clona esse canônico (produto + variantes) em 2 produtos irmãos —
//      "Livretos" e "Manuais" — pra bater visualmente com os 3 cards do
//      fornecedor (mesma matriz 3x, decisão explícita do cliente: as 3
//      opções batem 100% em vez de virar 1 produto só).
//   5. "Plano de Governo" (6 produtos, matriz Material×Tamanho própria,
//      Páginas sempre 4) funde num produto só, mas fica como 4º produto
//      na categoria — não faz parte da matriz Catálogos/Livretos/Manuais
//      e não existe categoria melhor pra ele.
//   6. Move os produtos políticos miscategorizados pra categoria correta
//      (MISC_TARGETS) — sem tentar fundir com equivalentes não-políticos
//      ainda (fica pra uma leva futura, ver README).
//
// Uso:
//   node --env-file=.env.local scripts/merge-catalogos-livretos.mjs --dry-run
//   node --env-file=.env.local scripts/merge-catalogos-livretos.mjs

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias.");
}

const dryRun = process.argv.includes("--dry-run");

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

function parseSpec(rawName, stripPrefixRe) {
  const name = rawName.replace(stripPrefixRe, "");
  const materialMatch = name.match(/(Couchê \d+g|Couche \d+g|Reciclato \d+g)/);
  const material = materialMatch ? materialMatch[1].replace("Couche ", "Couchê ") : null;
  const cobertura = /sem verniz/i.test(name) ? "Sem Verniz" : "Verniz Total Frente e Verso";
  const tamanhoMatch = name.match(/(\d+,?\d*\s*x\s*\d+,?\d*\s*cm)/);
  const tamanho = tamanhoMatch ? tamanhoMatch[1].replace(/\s+/g, "") : null;
  const paginasMatch = name.match(/(\d+)\s*Páginas/);
  const paginas = paginasMatch ? paginasMatch[1] : null;
  return { material, cobertura, tamanho, paginas };
}

function specKey(spec) {
  return `${spec.material}|${spec.cobertura}|${spec.tamanho}|${spec.paginas}`;
}

const MAIN_PREFIX_RE = /^(Manuais e Catálogos Horizontal|Manuais e Catálogos)\s+/;
const JORNAIS_PREFIX_RE = /^Jornais Eleitorais\s+/;
const PLANO_PREFIX_RE = /^Plano de Governo\s+/;

function parsePlanoSpec(name) {
  const stripped = name.replace(PLANO_PREFIX_RE, "");
  const materialMatch = stripped.match(/(Couchê \d+g)/);
  const tamanhoMatch = stripped.match(/(\d+,?\d*\s*x\s*\d+,?\d*\s*cm)/);
  return {
    material: materialMatch ? materialMatch[1] : null,
    tamanho: tamanhoMatch ? tamanhoMatch[1].replace(/\s+/g, "") : null,
  };
}

// produtos "políticos" miscategorizados: nome -> categoria correta.
// não tenta fundir com equivalente não-político ainda, só move.
const MISC_TARGETS = [
  { test: (n) => /^Adesivo Político/.test(n) || /^Pragão Político/.test(n) || /^Praguinha Política/.test(n), category: "adesivos" },
  { test: (n) => /^Banner Político/.test(n) || /^Lona Política/.test(n), category: "banners-e-lonas" },
  { test: (n) => /^Cartão de Visita Político/.test(n), category: "cartoes-de-visita" },
  { test: (n) => /^Cartaz Político/.test(n), category: "cartazes-e-posters" },
  { test: (n) => /^Mala Direta Política/.test(n) || /^Panfleto Político/.test(n), category: "folder-flyer-e-panfleto" },
  { test: (n) => /^Colinha Política/.test(n) || /^Santão Político/.test(n) || /^Santinho Político/.test(n), category: "convites-e-postais" },
];

async function moveVariantsAndTagAttributes(products, parseFn, canonicalId) {
  for (const p of products) {
    const spec = parseFn(p.name);
    const variants = await fetchAll("product_variants", "id, attributes, product_id", (q) => q.eq("product_id", p.id));
    for (const v of variants) {
      const nextAttrs = { ...(v.attributes ?? {}), ...spec };
      const update = { attributes: nextAttrs };
      if (p.id !== canonicalId) update.product_id = canonicalId;
      if (!dryRun) {
        const { error } = await supabase.from("product_variants").update(update).eq("id", v.id);
        if (error) throw error;
      }
    }
  }
}

async function deleteProductsOneByOne(ids) {
  for (const id of ids) {
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) throw error;
  }
}

async function updateCategoryOneByOne(ids, categoryId) {
  for (const id of ids) {
    const { error } = await supabase.from("products").update({ category_id: categoryId }).eq("id", id);
    if (error) throw error;
  }
}

async function fixDefaultVariant(productId) {
  const variants = await fetchAll("product_variants", "id, price_cents, is_default", (q) => q.eq("product_id", productId));
  if (variants.length === 0) return;
  const cheapest = [...variants].sort((a, b) => a.price_cents - b.price_cents)[0];
  for (const v of variants) {
    const shouldBeDefault = v.id === cheapest.id;
    if (v.is_default !== shouldBeDefault && !dryRun) {
      const { error } = await supabase.from("product_variants").update({ is_default: shouldBeDefault }).eq("id", v.id);
      if (error) throw error;
    }
  }
}

async function cloneProduct(sourceId, { category_id, slug, name, description, is_active, sort_order }) {
  if (dryRun) {
    console.log(`[dry-run] cloneProduct -> ${name} (${slug})`);
    return null;
  }
  const { data: created, error: createError } = await supabase
    .from("products")
    .insert({ category_id, slug, name, description, is_active, sort_order })
    .select("id")
    .single();
  if (createError) throw createError;

  const variants = await fetchAll("product_variants", "label, quantity, price_cents, attributes, is_default, is_active, sort_order, weight_grams", (q) =>
    q.eq("product_id", sourceId),
  );
  if (variants.length > 0) {
    const rows = variants.map((v) => ({ ...v, product_id: created.id }));
    const { error: insertError } = await supabase.from("product_variants").insert(rows);
    if (insertError) throw insertError;
  }

  const images = await fetchAll("product_images", "url, alt, sort_order", (q) => q.eq("product_id", sourceId));
  if (images.length > 0) {
    const rows = images.map((i) => ({ ...i, product_id: created.id }));
    const { error: imgError } = await supabase.from("product_images").insert(rows);
    if (imgError) throw imgError;
  }

  return created.id;
}

function randomSuffix() {
  return Math.random().toString(16).slice(2, 10);
}

async function main() {
  const { data: category, error: catError } = await supabase
    .from("categories")
    .select("id")
    .eq("slug", "catalogos-e-livretos")
    .single();
  if (catError) throw catError;

  const products = await fetchAll("products", "id, slug, name, category_id, description, is_active, sort_order", (q) =>
    q.eq("category_id", category.id),
  );

  const mainFamily = products.filter((p) => MAIN_PREFIX_RE.test(p.name));
  const jornaisAll = products.filter((p) => JORNAIS_PREFIX_RE.test(p.name));
  const planoDeGoverno = products.filter((p) => PLANO_PREFIX_RE.test(p.name));
  const misc = products.filter((p) => MISC_TARGETS.some((t) => t.test(p.name)));

  const accounted = new Set([...mainFamily, ...jornaisAll, ...planoDeGoverno, ...misc].map((p) => p.id));
  const unaccounted = products.filter((p) => !accounted.has(p.id));
  if (unaccounted.length > 0) {
    console.log("ATENÇÃO — produtos não classificados por nenhuma regra (não mexidos):");
    for (const p of unaccounted) console.log(`  - ${p.name} (${p.slug})`);
  }

  // separa Jornais Eleitorais em duplicata exata (apaga) vs combo único (funde)
  const mainSpecKeys = new Set(mainFamily.map((p) => specKey(parseSpec(p.name, MAIN_PREFIX_RE))));
  const jornaisUnique = [];
  const jornaisDuplicate = [];
  for (const p of jornaisAll) {
    const key = specKey(parseSpec(p.name, JORNAIS_PREFIX_RE));
    (mainSpecKeys.has(key) ? jornaisDuplicate : jornaisUnique).push(p);
  }

  console.log(`Manuais e Catálogos (+ Horizontal): ${mainFamily.length} produtos`);
  console.log(`Jornais Eleitorais: ${jornaisAll.length} (${jornaisDuplicate.length} duplicata exata, ${jornaisUnique.length} combo único a fundir)`);
  console.log(`Plano de Governo: ${planoDeGoverno.length} produtos`);
  console.log(`Políticos miscategorizados: ${misc.length} produtos`);

  // --- 1) família principal: funde tudo no canônico ---
  const sortedMain = [...mainFamily].sort((a, b) => a.id.localeCompare(b.id));
  const canonical = sortedMain[0];
  const mainOthers = sortedMain.slice(1);
  console.log(`Canônico escolhido: ${canonical.name} (${canonical.slug})`);

  await moveVariantsAndTagAttributes([canonical, ...mainOthers], (n) => parseSpec(n, MAIN_PREFIX_RE), canonical.id);
  await moveVariantsAndTagAttributes(jornaisUnique, (n) => parseSpec(n, JORNAIS_PREFIX_RE), canonical.id);

  const idsToDelete = [...mainOthers.map((p) => p.id), ...jornaisUnique.map((p) => p.id), ...jornaisDuplicate.map((p) => p.id)];
  console.log(`Apagando ${idsToDelete.length} produtos (variantes já movidas ou duplicata exata)...`);
  if (!dryRun && idsToDelete.length > 0) {
    await deleteProductsOneByOne(idsToDelete);
  }

  await fixDefaultVariant(canonical.id);

  if (!dryRun) {
    const { error } = await supabase.from("products").update({ name: "Catálogos" }).eq("id", canonical.id);
    if (error) throw error;
  }
  console.log(`Canônico renomeado para "Catálogos".`);

  // --- 2) clona em Livretos e Manuais ---
  for (const name of ["Livretos", "Manuais"]) {
    const slug = `${name.toLowerCase()}-${randomSuffix()}`;
    const newId = await cloneProduct(canonical.id, {
      category_id: canonical.category_id,
      slug,
      name,
      description: canonical.description,
      is_active: canonical.is_active,
      sort_order: canonical.sort_order,
    });
    console.log(`Clonado "${name}" -> ${slug} (${newId ?? "[dry-run]"})`);
  }

  // --- 3) Plano de Governo: funde 6 -> 1 ---
  if (planoDeGoverno.length > 0) {
    const sortedPlano = [...planoDeGoverno].sort((a, b) => a.id.localeCompare(b.id));
    const planoCanonical = sortedPlano[0];
    const planoOthers = sortedPlano.slice(1);
    await moveVariantsAndTagAttributes([planoCanonical, ...planoOthers], parsePlanoSpec, planoCanonical.id);
    const planoDeleteIds = planoOthers.map((p) => p.id);
    if (!dryRun && planoDeleteIds.length > 0) {
      await deleteProductsOneByOne(planoDeleteIds);
    }
    await fixDefaultVariant(planoCanonical.id);
    if (!dryRun) {
      const { error } = await supabase.from("products").update({ name: "Plano de Governo" }).eq("id", planoCanonical.id);
      if (error) throw error;
    }
    console.log(`Plano de Governo: ${planoDeGoverno.length} -> 1 produto.`);
  }

  // --- 4) move políticos miscategorizados ---
  const categorySlugs = [...new Set(MISC_TARGETS.map((t) => t.category))];
  const categoryIdBySlug = new Map();
  for (const slug of categorySlugs) {
    const { data, error } = await supabase.from("categories").select("id").eq("slug", slug).single();
    if (error) throw error;
    categoryIdBySlug.set(slug, data.id);
  }
  for (const target of MISC_TARGETS) {
    const ids = misc.filter((p) => target.test(p.name)).map((p) => p.id);
    if (ids.length === 0) continue;
    console.log(`Movendo ${ids.length} produto(s) -> ${target.category}`);
    if (!dryRun) {
      await updateCategoryOneByOne(ids, categoryIdBySlug.get(target.category));
    }
  }

  console.log(dryRun ? "\n[dry-run] nada foi alterado." : "\nConcluído.");
}

await main();
