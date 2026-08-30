// Imagens ilustrativas específicas; os demais produtos mantêm as imagens do banco.
const productImages: Record<string, string> = {
  "amostras-personalizadas-maximo-6-itens-aaf302b8": "amostras-personalizadas-v2",
  "copo-de-papel-biodegradavel-copa-do-mundo-440ml-sem-verniz-8-5x11cm-fbcf397f": "copo-papel-440ml-v2",
  "copo-de-papel-biodegradavel-pequeno-280ml-sem-verniz-7-5x9cm-38aca96b": "copo-papel-280ml-v2",
  "mascaras-supremo-300g-verniz-total-frente-20-18x8-8cm-0c1dccb1": "mascaras-papel-v2",
  "ventarola-supremo-300g-verniz-total-frente-20x27cm-5f1aacce": "ventarola-papel-v2",
  "viseiras-supremo-300g-verniz-total-frente-27x17-6cm-7934e07a": "viseiras-papel-v2",
};

export function getCatalogProductImage(slug: string): string | null {
  const image = productImages[slug];
  return image ? `/produtos/outros-produtos/${image}.png` : null;
}
