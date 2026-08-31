// Categorias de catálogo de designs prontos (produção própria, sem upload de
// arte do cliente) — o cliente escolhe o produto/variante, não envia arquivo.
const NO_ARTWORK_CATEGORY_SLUGS = ["placas-retro"];

export function categoryRequiresArtwork(categorySlug: string): boolean {
  return !NO_ARTWORK_CATEGORY_SLUGS.includes(categorySlug);
}
