import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const dryRun = process.argv.includes("--dry-run");
if (!supabaseUrl || !serviceRoleKey) throw new Error("Credenciais do Supabase são obrigatórias.");

const rules = [
  [/balde de gelo/, "familia-brinde-balde-gelo.png"],
  [/balde de pipoca/, "familia-brinde-balde-pipoca.png"],
  [/baralho/, "familia-brinde-baralho.png"],
  [/bloco de anotacao.*caneta/, "familia-brinde-bloco-caneta.png"],
  [/caneca veicular/, "familia-brinde-caneca-veicular.png"],
  [/caneca de chopp/, "familia-brinde-caneca-chopp.png"],
  [/caneca/, "familia-brinde-caneca-cafe-polimero.png"],
  [/caneta ecologica/, "familia-brinde-caneta-ecologica.png"],
  [/caneta/, "familia-brinde-caneta-plastica.png"],
  [/chaveiro cordao/, "familia-brinde-chaveiro-cordao.png"],
  [/copo caldereta/, "familia-brinde-copo-caldereta.png"],
  [/copo com espremedor/, "familia-brinde-copo-espremedor.png"],
  [/copo long drink/, "familia-brinde-copo-long-drink.png"],
  [/copo nature/, "familia-brinde-copo-nature.png"],
  [/copo tornado/, "familia-brinde-copo-tornado.png"],
  [/copo twister/, "familia-brinde-copo-twister.png"],
  [/copo whisky/, "familia-brinde-copo-whisky.png"],
  [/garrafa retro/, "familia-brinde-garrafa-retro.png"],
  [/garrafa slim fit/, "familia-brinde-garrafa-slim-fit.png"],
  [/garrafa squeeze/, "familia-brinde-garrafa-squeeze.png"],
  [/mouse pad/, "familia-brinde-mouse-pad.png"],
  [/taca de champagne/, "familia-brinde-taca-champagne.png"],
  [/taca de gin/, "familia-brinde-taca-gin.png"],
  [/taca de vinho/, "familia-brinde-taca-vinho.png"],
  [/ventarola/, "familia-brinde-ventarola.png"],
  [/viseira/, "familia-brinde-viseira.png"],
  [/mascara/, "familia-brinde-mascara.png"],
  [/envelope/, "familia-envelopes.png"],
  [/manuais|catalogos/, "familia-catalogos-livretos.png"],
  [/marcador de pagina/, "familia-marcadores-reguas.png"],
  [/pasta com vinco/, "familia-pastas.png"],
];

const normalize = (value) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const resolveImage = (product) => rules.find(([pattern]) => pattern.test(normalize(`${product.name} ${product.slug ?? ""}`)))?.[1];

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const { data: category, error: categoryError } = await supabase
  .from("categories").select("id").eq("slug", "brindes-promocionais").single();
if (categoryError) throw categoryError;

const { data: products, error: productError } = await supabase
  .from("products").select("id, name, slug").eq("category_id", category.id).order("name");
if (productError) throw productError;

const unresolved = products.filter((product) => !resolveImage(product));
if (unresolved.length) {
  console.table(unresolved.map(({ name, slug }) => ({ name, slug })));
  throw new Error(`${unresolved.length} produtos sem regra de imagem.`);
}

const counts = products.reduce((result, product) => {
  const image = resolveImage(product);
  result[image] = (result[image] ?? 0) + 1;
  return result;
}, {});
console.table(counts);

if (dryRun) {
  console.log(`${products.length} produtos validados; nenhuma alteração realizada.`);
  process.exit(0);
}

const ids = products.map(({ id }) => id);
const { error: deleteError } = await supabase.from("product_images")
  .delete().in("product_id", ids).eq("sort_order", 0);
if (deleteError) throw deleteError;

const { error: insertError } = await supabase.from("product_images").insert(products.map((product) => ({
  product_id: product.id,
  url: `/produtos/catalogo-atualcard/${resolveImage(product)}`,
  alt: product.name,
  sort_order: 0,
})));
if (insertError) throw insertError;

console.log(`${products.length} produtos de brindes promocionais sincronizados.`);
