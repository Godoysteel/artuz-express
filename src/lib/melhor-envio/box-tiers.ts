export type BoxDims = { widthCm: number; heightCm: number; lengthCm: number };

// Nenhum produto tem dimensão de embalagem real cadastrada (só peso vem do
// fornecedor) — essas caixas-padrão por categoria são uma aproximação
// aceita explicitamente pelo cliente em 2026-08-29 para viabilizar cotação
// de frete. Ajustar aqui se algum frete vier muito destoante do real.
const CAIXA_PEQUENA: BoxDims = { widthCm: 20, heightCm: 5, lengthCm: 15 };
const CAIXA_MEDIA: BoxDims = { widthCm: 30, heightCm: 15, lengthCm: 20 };
const CAIXA_GRANDE: BoxDims = { widthCm: 50, heightCm: 30, lengthCm: 40 };
const TUBO: BoxDims = { widthCm: 15, heightCm: 15, lengthCm: 100 };

export const DEFAULT_BOX: BoxDims = CAIXA_MEDIA;

export const BOX_BY_CATEGORY_SLUG: Record<string, BoxDims> = {
  "cartoes-de-visita": CAIXA_PEQUENA,
  "adesivo-dtf": CAIXA_PEQUENA,
  "adesivos": CAIXA_PEQUENA,
  "impressao-em-dtf": CAIXA_PEQUENA,
  "impressao-colorida-uv": CAIXA_PEQUENA,
  "tags-e-cartelas": CAIXA_PEQUENA,
  "imas": CAIXA_PEQUENA,
  "marcadores-e-reguas": CAIXA_PEQUENA,
  "envelopes": CAIXA_PEQUENA,
  "papel-timbrado": CAIXA_PEQUENA,
  "ingressos-e-pulseiras": CAIXA_PEQUENA,
  "convites-e-postais": CAIXA_PEQUENA,
  "crachas-e-credenciais": CAIXA_PEQUENA,
  "certificados": CAIXA_PEQUENA,
  "folder-flyer-e-panfleto": CAIXA_PEQUENA,
  "pequenas-tiragens": CAIXA_PEQUENA,
  "entrega-12-horas": CAIXA_PEQUENA,
  "gravacao-a-laser": CAIXA_PEQUENA,
  "baralhos": CAIXA_PEQUENA,
  "porta-copo": CAIXA_PEQUENA,
  "carteirinhas-e-fidelidade": CAIXA_PEQUENA,

  "brindes-promocionais": CAIXA_MEDIA,
  "carimbos": CAIXA_MEDIA,
  "agendas-e-cadernos": CAIXA_MEDIA,
  "blocos-recibos-e-taloes": CAIXA_MEDIA,
  "embalagens-e-sacolas": CAIXA_MEDIA,
  "cardapios-e-comandas": CAIXA_MEDIA,
  "catalogos-e-livretos": CAIXA_MEDIA,
  "pastas": CAIXA_MEDIA,
  "mobiles-stoppers-e-wobblers": CAIXA_MEDIA,
  "impressao-em-tecido": CAIXA_MEDIA,
  "lancamentos": CAIXA_MEDIA,
  "outros-produtos": CAIXA_MEDIA,

  "quadros-e-decoracoes": CAIXA_GRANDE,
  "balcoes-totens-e-urnas": CAIXA_GRANDE,
  "capachos-e-tapetes": CAIXA_GRANDE,
  "displays": CAIXA_GRANDE,
  "placas-personalizadas": CAIXA_GRANDE,
  "grandes-formatos": CAIXA_GRANDE,

  "banners-e-lonas": TUBO,
  "wind-banners": TUBO,
  "bandeiras-e-bandeirolas": TUBO,
  "cartazes-e-posters": TUBO,
};

export function getBoxForCategory(categorySlug: string): BoxDims {
  return BOX_BY_CATEGORY_SLUG[categorySlug] ?? DEFAULT_BOX;
}
