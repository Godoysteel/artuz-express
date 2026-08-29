import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias.",
  );
}

const familyImages = {
  adesivos: "familia-adesivos.png",
  "agendas-e-cadernos": "familia-agendas-cadernos.png",
  "balcoes-totens-e-urnas": "familia-balcoes-totens-urnas.png",
  "bandeiras-e-bandeirolas": "familia-bandeiras-bandeirolas.png",
  "banners-e-lonas": "familia-banners-e-lonas.png",
  baralhos: "familia-baralhos.png",
  "blocos-recibos-e-taloes": "familia-blocos-recibos-taloes.png",
  "brindes-promocionais": "familia-brindes-promocionais.png",
  "capachos-e-tapetes": "familia-capachos-tapetes.png",
  "cardapios-e-comandas": "familia-cardapios-e-comandas.png",
  carimbos: "familia-carimbos.png",
  "carteirinhas-e-fidelidade": "familia-carteirinhas-fidelidade.png",
  "cartazes-e-posters": "familia-cartazes-posters.png",
  "cartoes-de-visita": "familia-cartoes-de-visita.png",
  "catalogos-e-livretos": "familia-catalogos-livretos.png",
  certificados: "familia-certificados.png",
  "convites-e-postais": "familia-convites-postais.png",
  "crachas-e-credenciais": "familia-crachas-credenciais.png",
  "credito-pre-pago": "familia-credito-pre-pago.png",
  displays: "familia-displays.png",
  "embalagens-e-sacolas": "familia-embalagens-sacolas.png",
  envelopes: "familia-envelopes.png",
  "entrega-12-horas": "familia-entrega-12-horas.png",
  "folder-flyer-e-panfleto": "familia-folder-flyer-panfleto.png",
  "grandes-formatos": "familia-grandes-formatos.png",
  imas: "familia-imas.png",
  "ingressos-e-pulseiras": "familia-ingressos-pulseiras.png",
  "kit-de-amostras": "familia-kit-amostras.png",
  "marcadores-e-reguas": "familia-marcadores-reguas.png",
  "mobiles-stoppers-e-wobblers": "familia-mobiles-stoppers-wobblers.png",
  "outros-produtos": "familia-outros-produtos.png",
  "papel-timbrado": "familia-papel-timbrado.png",
  pastas: "familia-pastas.png",
  "pequenas-tiragens": "familia-pequenas-tiragens.png",
  "placas-personalizadas": "familia-placas-personalizadas.png",
  "plotagem-de-projetos": "familia-plotagem-projetos.png",
  "porta-copo": "familia-porta-copo.png",
  "quadros-e-decoracoes": "familia-quadros-decoracoes.png",
  "tags-e-cartelas": "familia-tags-cartelas.png",
  "wind-banners": "familia-wind-banners.png",
};

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const categorySlugs = Object.keys(familyImages);
const { data: categories, error: categoryError } = await supabase
  .from("categories")
  .select("id, slug")
  .in("slug", categorySlugs);

if (categoryError) throw categoryError;

const categoryById = new Map(
  categories.map((category) => [category.id, category.slug]),
);

const products = [];
for (let offset = 0; ; offset += 1000) {
  const { data, error } = await supabase
    .from("products")
    .select("id, name, category_id")
    .in("category_id", [...categoryById.keys()])
    .range(offset, offset + 999);

  if (error) throw error;
  products.push(...data);
  if (data.length < 1000) break;
}

const productIds = products.map((product) => product.id);

for (let index = 0; index < productIds.length; index += 200) {
  const batch = productIds.slice(index, index + 200);
  const { error } = await supabase
    .from("product_images")
    .delete()
    .in("product_id", batch)
    .eq("sort_order", 0);

  if (error) throw error;
}

const rows = products.map((product) => {
  const categorySlug = categoryById.get(product.category_id);
  return {
    product_id: product.id,
    url: `/produtos/catalogo-atualcard/${familyImages[categorySlug]}`,
    alt: product.name,
    sort_order: 0,
  };
});

for (let index = 0; index < rows.length; index += 300) {
  const { error } = await supabase
    .from("product_images")
    .insert(rows.slice(index, index + 300));

  if (error) throw error;
}

console.log(
  `${rows.length} produtos associados a ${categories.length} imagens de família.`,
);
