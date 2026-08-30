import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const onlyLona = process.argv.includes("--only=lona");
const onlyTagGarrafa = process.argv.includes("--only=tag-garrafa");
if (!supabaseUrl || !serviceRoleKey) throw new Error("Credenciais do Supabase são obrigatórias.");

const imageRules = [
  [/tag para garrafa/, "familia-tag-garrafa-couche.png"],
  [/lona grande formato.*com ilhos/, "familia-lona-grande-formato.png"],
  [/lona.*com ilhos/, "familia-lona-impressa.png"],
  [/lona grande formato/, "familia-lona-sem-ilhos.png"],
  [/banner com suporte tripe|banner.*tripe/, "familia-banner-tripe.png"],
  [/mini banner/, "familia-mini-banner.png"],
  [/wind banner/, "familia-wind-banner-real.png"],
  [/bandeiras|bandeirolas/, "familia-bandeiras-bandeirolas-real.png"],
  [/backdrop/, "familia-backdrop-lona.png"],
  [/cavalete/, "familia-cavalete.png"],
  [/faixa/, "familia-faixa-lona.png"],
  [/roll[ -]?up/, "familia-roll-up.png"],
  [/banner/, "familia-banner-bastao.png"],
  [/lona/, "familia-lona-sem-ilhos.png"],
];

const normalize = (value) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const resolveImage = (product) => {
  const searchable = normalize(`${product.name} ${product.slug ?? ""}`);
  return imageRules.find(([pattern]) => pattern.test(searchable))?.[1] ?? "familia-lona-impressa.png";
};

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const products = [];
for (let offset = 0; ; offset += 1000) {
  let query = supabase.from("products").select("id, name, slug");
  if (onlyTagGarrafa) {
    query = query.ilike("name", "Tag para Garrafa%");
  } else {
    const { data: category, error: categoryError } = await supabase
      .from("categories").select("id").eq("slug", "banners-e-lonas").single();
    if (categoryError) throw categoryError;
    query = query.eq("category_id", category.id);
  }
  const { data, error } = await query.range(offset, offset + 999);
  if (error) throw error;
  products.push(...data);
  if (data.length < 1000) break;
}

const targetProducts = onlyTagGarrafa
  ? products.filter((product) => normalize(product.name).startsWith("tag para garrafa"))
  : onlyLona
    ? products.filter((product) => normalize(product.name).startsWith("lona "))
    : products;

for (let index = 0; index < targetProducts.length; index += 200) {
  const batch = targetProducts.slice(index, index + 200);
  const ids = batch.map(({ id }) => id);
  const { error: deleteError } = await supabase.from("product_images")
    .delete().in("product_id", ids).eq("sort_order", 0);
  if (deleteError) throw deleteError;
  const { error: insertError } = await supabase.from("product_images").insert(batch.map((product) => ({
    product_id: product.id,
    url: `/produtos/catalogo-atualcard/${resolveImage(product)}`,
    alt: product.name,
    sort_order: 0,
  })));
  if (insertError) throw insertError;
}

const counts = targetProducts.reduce((result, product) => {
  const image = resolveImage(product);
  result[image] = (result[image] ?? 0) + 1;
  return result;
}, {});
console.log(`${targetProducts.length} produtos de banners e lonas sincronizados.`);
console.table(counts);
