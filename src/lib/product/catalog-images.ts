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

const bookletImages: Record<string, string> = {
  "livretos-8b6b1dfd": "livretos-v2",
  "manuais-097ccd60": "manuais-v2",
  "manuais-e-catalogos-couche-120g-sem-verniz-15x20cm-8-paginas-2ccb0f3f": "catalogos-v2",
  "plano-de-governo-couche-120g-sem-verniz-21x30cm-4-paginas-799d6c9c": "plano-governo-v2",
};

const membershipImages: Record<string, string> = {
  "cartao-fidelidade-com-arte-unica-em-pvc-0-5mm-cristal-frente-e-verso-8-5x5-4cm-5368e010": "fidelidade-arte-unica-v2",
  "cartao-fidelidade-com-tarja-magnetica-em-pvc-0-76mm-cristal-frente-e-verso-8-5x5-b136710e": "fidelidade-tarja-v2",
  "carteirinha-arte-unica-em-pvc-0-5mm-cristal-frente-e-verso-8-5x5-4cm-be5f9af0": "carteirinha-arte-unica-v2",
  "carteirinha-supremo-300g-sem-verniz-10x15cm-19035935": "carteirinha-papel-v2",
};

export function getCatalogProductImage(slug: string): string | null {
  const membership = membershipImages[slug];
  if (membership) return `/produtos/carteirinhas-e-fidelidade/${membership}.png`;
  const booklet = bookletImages[slug];
  if (booklet) return `/produtos/catalogos-e-livretos/${booklet}.png`;
  const decoration = decorationImages[slug];
  if (decoration) return `/produtos/quadros-e-decoracoes/${decoration}.png`;
  const image = productImages[slug];
  return image ? `/produtos/outros-produtos/${image}.png` : null;
}
