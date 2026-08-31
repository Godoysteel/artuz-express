// Fotos reais de produto (não a arte quadrada gerada pra maioria do catálogo)
// precisam de object-contain em vez de object-cover, senão a imagem é cortada.
const CONTAIN_PREFIXES = ["/produtos/carimbos/", "/produtos/placas-retro/"];

export function shouldContainImage(url: string): boolean {
  return CONTAIN_PREFIXES.some((prefix) => url.startsWith(prefix));
}
