import type { CategoryTile } from "@/lib/catalog";

// Ordem da referência Atual Card. Produtos únicos mantêm seus links e variações.
const entries: Record<string, { order: number; name: string; cover?: string }> = {
  "carimbo-automatico-nykon": { order: 0, name: "Carimbo Automático Nykon", cover: "nykon" },
  "carimbo-automatico-trodat": { order: 1, name: "Carimbo Automático Trodat", cover: "trodat" },
  "carimbo-chancela-com-marca-d-agua-51x51mm-a58a911c": { order: 2, name: "Carimbo Chancela", cover: "chancela" },
  "kit-de-carimbo-para-roupas-nykon-38x14mm-cd87ece9": { order: 3, name: "Carimbo para Roupas" },
  "carimbo-de-madeira": { order: 4, name: "Carimbo de Madeira", cover: "madeira" },
  "acessorios-para-carimbos": { order: 5, name: "Acessórios para Carimbos", cover: "acessorios" },
};

export function presentStampCategory(tiles: CategoryTile[]): CategoryTile[] {
  const key = (tile: CategoryTile) => tile.kind === "family" ? tile.family.slug : tile.product.slug;
  return [...tiles]
    .sort((a, b) => (entries[key(a)]?.order ?? 99) - (entries[key(b)]?.order ?? 99))
    .map((tile) => {
      const entry = entries[key(tile)];
      if (!entry) return tile;
      const image = entry.cover ? { imageUrl: `/produtos/carimbos/capa-${entry.cover}-v2.png` } : {};
      return tile.kind === "family"
        ? { ...tile, family: { ...tile.family, name: entry.name, ...image } }
        : { ...tile, product: { ...tile.product, name: entry.name, ...image } };
    });
}
