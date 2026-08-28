import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

const catalogPath = process.argv[2] ?? "data/supplier/atualcard-catalog.json";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias.",
  );
}

const catalog = JSON.parse(await readFile(catalogPath, "utf8"));
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function chunks(items, size) {
  const result = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
}

const categoryNames = new Map(
  catalog.products.map((product) => [
    product.category_slug,
    product.category_name,
  ]),
);
const categoryRows = [...categoryNames].map(([slug, name], index) => ({
  slug,
  name,
  description: `Produtos ${name.toLocaleLowerCase("pt-BR")} sob demanda.`,
  sort_order: 100 + index,
  is_active: true,
}));

const { error: categoryUpsertError } = await supabase
  .from("categories")
  .upsert(categoryRows, { onConflict: "slug" });

if (categoryUpsertError) throw categoryUpsertError;

const { data: categories, error: categoryReadError } = await supabase
  .from("categories")
  .select("id, slug")
  .in(
    "slug",
    categoryRows.map((category) => category.slug),
  );

if (categoryReadError) throw categoryReadError;

const categoryIdBySlug = new Map(
  categories.map((category) => [category.slug, category.id]),
);
const productIdBySlug = new Map();

for (const [batchIndex, productBatch] of chunks(catalog.products, 200).entries()) {
  const rows = productBatch.map((product, index) => ({
    category_id: categoryIdBySlug.get(product.category_slug),
    slug: product.slug,
    name: product.name,
    description: product.description,
    is_active: true,
    sort_order: batchIndex * 200 + index + 10,
  }));

  const { data, error } = await supabase
    .from("products")
    .upsert(rows, { onConflict: "slug" })
    .select("id, slug");

  if (error) throw error;
  for (const product of data) productIdBySlug.set(product.slug, product.id);
  console.log(`Produtos: ${productIdBySlug.size}/${catalog.products.length}`);
}

for (const productIdBatch of chunks([...productIdBySlug.values()], 100)) {
  const { error } = await supabase
    .from("product_variants")
    .delete()
    .in("product_id", productIdBatch);

  if (error) throw error;
}

const variantRows = [];

for (const product of catalog.products) {
  const productId = productIdBySlug.get(product.slug);
  const sortedVariants = [...product.variants].sort(
    (left, right) => left.price_cents - right.price_cents,
  );

  sortedVariants.forEach((variant, index) => {
    variantRows.push({
      product_id: productId,
      label: variant.label,
      quantity: variant.quantity,
      price_cents: variant.price_cents,
      attributes: {
        ...variant.attributes,
        supplier_source: catalog.source,
        supplier_price_date: catalog.price_date,
      },
      is_default: index === 0,
      is_active: true,
      sort_order: index + 1,
    });
  });
}

let insertedVariants = 0;
for (const variantBatch of chunks(variantRows, 300)) {
  const { error } = await supabase
    .from("product_variants")
    .insert(variantBatch);

  if (error) throw error;
  insertedVariants += variantBatch.length;
  console.log(`Variantes: ${insertedVariants}/${variantRows.length}`);
}

console.log(
  `Sincronização concluída: ${categoryRows.length} categorias, ${catalog.products.length} produtos e ${variantRows.length} variantes.`,
);
