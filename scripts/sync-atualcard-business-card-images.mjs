import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const onlySupremo = process.argv.includes("--only=supremo");
if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Credenciais do Supabase são obrigatórias.");
}

// Ordem importa: regras de material/acabamento específico vêm primeiro,
// os fallbacks genéricos ("mini cartão", "cartão duplo", "couchê/supremo")
// ficam por último — senão um "Cartão Duplo Kraft" ou "Mini Cartões
// Reciclato" cai no fallback genérico antes de chegar na regra certa.
const imageRules = [
  [/verniz localizado.*hot stamping|hot stamping.*verniz localizado/, "familia-cartao-verniz-hot-stamping.png"],
  [/dois cantos arredondados/, "familia-cartao-dois-cantos.png"],
  [/cantos arredondados/, "familia-cartao-cantos-arredondados.png"],
  [/cartao de agradecimento/, "familia-cartao-agradecimento.png"],
  [/cartao de retrovisor/, "familia-cartao-retrovisor.png"],
  [/cartao fidelidade/, "familia-cartao-fidelidade.png"],
  [/verniz localizado|uv localizado/, "familia-cartao-verniz-localizado.png"],
  [/holografic/, "familia-cartao-holografico.png"],
  [/hot stamping/, "familia-cartao-hot-stamping.png"],
  [/kraft/, "familia-cartao-kraft.png"],
  [/metal premium/, "familia-cartao-metal-premium.png"],
  [/metalizado/, "familia-cartao-metalizado.png"],
  [/ultra premium|700g/, "familia-cartao-ultra-premium.png"],
  [/premium|600g/, "familia-cartao-premium.png"],
  [/pvc/, "familia-cartao-pvc.png"],
  [/reciclato/, "familia-cartao-reciclato.png"],
  [/supremo/, "familia-cartao-supremo.png"],
  [/mini cart/, "familia-mini-cartao-visita.png"],
  [/cartao duplo/, "familia-cartao-duplo.png"],
  [/couche|cartoes de visita|cartao de visita/, "familia-cartao-couche.png"],
];

function normalize(value) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function resolveImage(product) {
  const searchable = normalize(`${product.name} ${product.slug ?? ""}`);
  return imageRules.find(([pattern]) => pattern.test(searchable))?.[1] ?? "familia-cartoes-de-visita.png";
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: category, error: categoryError } = await supabase
  .from("categories")
  .select("id")
  .eq("slug", "cartoes-de-visita")
  .single();
if (categoryError) throw categoryError;

const products = [];
for (let offset = 0; ; offset += 1000) {
  const { data, error } = await supabase
    .from("products")
    .select("id, name, slug")
    .eq("category_id", category.id)
    .range(offset, offset + 999);
  if (error) throw error;
  products.push(...data);
  if (data.length < 1000) break;
}

const targetProducts = onlySupremo
  ? products.filter((product) => normalize(`${product.name} ${product.slug ?? ""}`).includes("supremo"))
  : products;

for (let index = 0; index < targetProducts.length; index += 200) {
  const batch = targetProducts.slice(index, index + 200);
  const ids = batch.map(({ id }) => id);
  const { error: deleteError } = await supabase
    .from("product_images")
    .delete()
    .in("product_id", ids)
    .eq("sort_order", 0);
  if (deleteError) throw deleteError;

  const { error: insertError } = await supabase.from("product_images").insert(
    batch.map((product) => ({
      product_id: product.id,
      url: `/produtos/catalogo-atualcard/${resolveImage(product)}`,
      alt: product.name,
      sort_order: 0,
    })),
  );
  if (insertError) throw insertError;
}

const counts = targetProducts.reduce((result, product) => {
  const image = resolveImage(product);
  result[image] = (result[image] ?? 0) + 1;
  return result;
}, {});
console.log(`${targetProducts.length} cartões de visita sincronizados.`);
console.table(counts);
