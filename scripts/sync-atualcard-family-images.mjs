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

const exactProductImages = {
  "adesivo-dtf-recorte": "familia-adesivo-dtf-recorte.png",
  "santinho-eleitoral-4x0": "familia-santinho-eleitoral-9x5.png",
  "chaveiro-gravacao-laser": "familia-chaveiro-gravacao-laser.png",
  "caneca-impressao-uv": "familia-caneca-impressao-uv.png",
  "garrafa-impressao-dtf": "familia-garrafa-impressao-dtf.png",
  "bandeira-impressao-tecido": "familia-bandeira-tecido.png",
  "copo-personalizado-500ml": "familia-copo-personalizado-500ml.png",
};

const adhesiveImageRules = [
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

// Ordem importa: regras de material/acabamento específico vêm primeiro,
// os fallbacks genéricos ("mini cartão", "cartão duplo", "couchê/supremo")
// ficam por último — senão um "Cartão Duplo Kraft" ou "Mini Cartões
// Reciclato" cai no fallback genérico antes de chegar na regra certa.
// Exceção: "cartao duplo" (formato dobrado) vem ANTES das regras de
// material comuns (kraft/metalizado/supremo/reciclato), porque nenhuma
// dessas fotos mostra a dobra — uma foto só pra "Cartão Duplo", material
// vira só texto no dropdown. "metal premium" fica antes até de "cartao
// duplo" porque é uma linha mais exclusiva e mantém foto própria.
const businessCardImageRules = [
  [/verniz localizado.*hot stamping|hot stamping.*verniz localizado/, "familia-cartao-verniz-hot-stamping.png"],
  [/dois cantos arredondados/, "familia-cartao-dois-cantos.png"],
  [/cantos arredondados/, "familia-cartao-cantos-arredondados.png"],
  [/cartao de agradecimento/, "familia-cartao-agradecimento.png"],
  [/cartao de retrovisor/, "familia-cartao-retrovisor.png"],
  [/cartao fidelidade/, "familia-cartao-fidelidade.png"],
  [/verniz localizado|uv localizado/, "familia-cartao-verniz-localizado.png"],
  [/holografic/, "familia-cartao-holografico.png"],
  [/hot stamping/, "familia-cartao-hot-stamping.png"],
  [/metal premium/, "familia-cartao-metal-premium.png"],
  [/cartao duplo/, "familia-cartao-duplo.png"],
  [/kraft/, "familia-cartao-kraft.png"],
  [/metalizado/, "familia-cartao-metalizado.png"],
  [/ultra premium|700g/, "familia-cartao-ultra-premium.png"],
  [/premium|600g/, "familia-cartao-premium.png"],
  [/pvc/, "familia-cartao-pvc.png"],
  [/reciclato/, "familia-cartao-reciclato.png"],
  [/supremo/, "familia-cartao-supremo.png"],
  [/mini cart/, "familia-mini-cartao-visita.png"],
  [/couche|cartoes de visita|cartao de visita/, "familia-cartao-couche.png"],
];

const bannerImageRules = [
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

const promotionalGiftImageRules = [
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

function normalize(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function resolveAdhesiveImage(product) {
  const searchable = normalize(`${product.name} ${product.slug ?? ""}`);
  return adhesiveImageRules.find(([pattern]) => pattern.test(searchable))?.[1];
}

function resolveBusinessCardImage(product) {
  const searchable = normalize(`${product.name} ${product.slug ?? ""}`);
  return businessCardImageRules.find(([pattern]) => pattern.test(searchable))?.[1];
}

function resolveBannerImage(product) {
  const searchable = normalize(`${product.name} ${product.slug ?? ""}`);
  return bannerImageRules.find(([pattern]) => pattern.test(searchable))?.[1];
}

function resolvePromotionalGiftImage(product) {
  const searchable = normalize(`${product.name} ${product.slug ?? ""}`);
  return promotionalGiftImageRules.find(([pattern]) => pattern.test(searchable))?.[1];
}

function resolveSpecialProductImage(product) {
  const searchable = normalize(`${product.name} ${product.slug ?? ""}`);
  if (/tag para garrafa/.test(searchable)) return "familia-tag-garrafa-couche.png";
}

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
    .select("id, name, slug, category_id")
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
  const image = resolveSpecialProductImage(product) ?? (categorySlug === "adesivos"
    ? resolveAdhesiveImage(product) ?? familyImages[categorySlug]
    : categorySlug === "cartoes-de-visita"
      ? resolveBusinessCardImage(product) ?? familyImages[categorySlug]
      : categorySlug === "banners-e-lonas"
        ? resolveBannerImage(product) ?? familyImages[categorySlug]
      : categorySlug === "brindes-promocionais"
        ? resolvePromotionalGiftImage(product) ?? familyImages[categorySlug]
      : familyImages[categorySlug]);
  return {
    product_id: product.id,
    url: `/produtos/catalogo-atualcard/${image}`,
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

const { data: exactProducts, error: exactProductError } = await supabase
  .from("products")
  .select("id, slug, name")
  .in("slug", Object.keys(exactProductImages));

if (exactProductError) throw exactProductError;

const exactProductIds = exactProducts.map((product) => product.id);
if (exactProductIds.length > 0) {
  const { error: exactDeleteError } = await supabase
    .from("product_images")
    .delete()
    .in("product_id", exactProductIds)
    .eq("sort_order", 0);

  if (exactDeleteError) throw exactDeleteError;

  const { error: exactInsertError } = await supabase
    .from("product_images")
    .insert(
      exactProducts.map((product) => ({
        product_id: product.id,
        url: `/produtos/catalogo-atualcard/${exactProductImages[product.slug]}`,
        alt: product.name,
        sort_order: 0,
      })),
    );

  if (exactInsertError) throw exactInsertError;
}

console.log(
  `${rows.length} produtos associados a ${categories.length} imagens de família e ${exactProducts.length} produtos receberam imagem específica.`,
);
