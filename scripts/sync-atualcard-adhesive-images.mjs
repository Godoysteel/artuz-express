import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias.",
  );
}

const imageRules = [
  [/cartao de credito/, "familia-adesivo-cartao-credito.png"],
  [/cartela de adesivo/, "familia-cartela-adesivos.png"],
  [/casca de ovo/, "familia-adesivo-casca-ovo.png"],
  [/(cd|dvd)/, "familia-adesivo-cd-dvd.png"],
  [/dtf|termocolante/, "familia-adesivo-dtf-recorte.png"],
  [/troca de oleo/, "familia-adesivo-troca-oleo.png"],
  [/eletrostatico/, "familia-adesivo-eletrostatico.png"],
  [/fecha sacola/, "familia-adesivo-fecha-sacola.png"],
  [/lacre de seguranca/, "familia-lacre-seguranca.png"],
  [/para-?choque|parachoque/, "familia-adesivo-parachoque.png"],
  [/perfurado/, "familia-adesivo-perfurado.png"],
  [/quadrado|retangular/, "familia-adesivo-quadrado-retangular.png"],
  [/redondo/, "familia-adesivo-redondo.png"],
  [/resinado/, "familia-adesivo-resinado.png"],
  [/rotulo/, "familia-rotulos-adesivos.png"],
  [/transparente/, "familia-adesivo-vinil-transparente.png"],
  [/vitrine/, "familia-adesivo-vitrine.png"],
  [/etiquetas escolares/, "familia-kit-etiquetas-escolares.png"],
  [/papel/, "familia-adesivo-papel.png"],
  [/vinil|personalizado por m|por m2/, "familia-adesivo-vinil.png"],
];

function normalize(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function resolveImage(product) {
  const searchable = normalize(`${product.name} ${product.slug ?? ""}`);
  return (
    imageRules.find(([pattern]) => pattern.test(searchable))?.[1] ??
    "familia-adesivos.png"
  );
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: category, error: categoryError } = await supabase
  .from("categories")
  .select("id")
  .eq("slug", "adesivos")
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

for (let index = 0; index < products.length; index += 200) {
  const batch = products.slice(index, index + 200);
  const ids = batch.map((product) => product.id);
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

const counts = products.reduce((result, product) => {
  const image = resolveImage(product);
  result[image] = (result[image] ?? 0) + 1;
  return result;
}, {});

console.log(`${products.length} adesivos sincronizados.`);
console.table(counts);
