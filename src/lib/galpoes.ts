export const GALPAO_MODELS = [
  {
    id: "fechado",
    name: "Galpão fechado",
    description: "Fechado nas laterais e no fundo, com portão e porta de acesso.",
    image: "/galpoes/fechado.jpg",
    closing: "Fechado",
  },
  {
    id: "aberto",
    name: "Galpão aberto",
    description: "Aberto por todos os lados: só colunas e cobertura, ideal para abrigar veículos, máquinas e feno.",
    image: "/galpoes/aberto.jpg",
    closing: "Aberto",
  },
  {
    id: "celeiro",
    name: "Celeiro",
    description: "Nave central elevada com janelas, telhado verde, portão em X e cúpula.",
    image: "/galpoes/celeiro.jpg",
    closing: "Fechado",
  },
] as const;
