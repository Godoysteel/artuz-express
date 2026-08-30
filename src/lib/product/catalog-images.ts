// Imagens ilustrativas específicas; os demais produtos mantêm as imagens do banco.
const productImages: Record<string, string> = {
  "amostras-personalizadas-maximo-6-itens-aaf302b8": "amostras-personalizadas-v2",
  "copo-de-papel-biodegradavel-copa-do-mundo-440ml-sem-verniz-8-5x11cm-fbcf397f": "copo-papel-440ml-v2",
  "copo-de-papel-biodegradavel-pequeno-280ml-sem-verniz-7-5x9cm-38aca96b": "copo-papel-280ml-v2",
  "mascaras-supremo-300g-verniz-total-frente-20-18x8-8cm-0c1dccb1": "mascaras-papel-v2",
  "ventarola-supremo-300g-verniz-total-frente-20x27cm-5f1aacce": "ventarola-papel-v2",
  "viseiras-supremo-300g-verniz-total-frente-27x17-6cm-7934e07a": "viseiras-papel-v2",
};

const decorationImages: Record<string, string> = {
  "adesivo-para-porta-em-adesivo-vinil-90x210cm-63d3568c": "adesivo-porta-v2",
  "faixa-decorativa-personalizada-em-adesivo-vinil-15x120cm-24bdd7be": "faixa-decorativa-v2",
  "luminaria-personalizada-em-acrilico-cristal-4mm-96289eef": "luminaria-acrilico-v2",
  "papel-de-parede-personalizado-em-adesivo-vinil-58x100cm-bbc40ab0": "papel-parede-v2",
  "quadro-decorativo-em-mdf-3mm-adesivado-com-laminacao-fosca-20x30cm-d31b684a": "quadro-mdf-sem-moldura-v2",
};

export function getCatalogProductImage(slug: string): string | null {
  const decoration = decorationImages[slug];
  if (decoration) return `/produtos/quadros-e-decoracoes/${decoration}.png`;
  const image = productImages[slug];
  return image ? `/produtos/outros-produtos/${image}.png` : null;
}
