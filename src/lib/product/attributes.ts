// Sem "server-only": usado tanto em Server Components/rotas quanto no client
// component do configurador de produto.

export type VariantAttributes = Record<string, string>;

export type AttributeVariant = {
  id: string;
  label: string;
  quantity: number;
  priceCents: number;
  isDefault: boolean;
  attributes: VariantAttributes;
};

export type AttributeOption = {
  key: string;
  label: string;
  values: string[];
};

export type AddonInfo = {
  id: string;
  kind: "addon" | "service";
  label: string;
  priceCents: number;
  pricingMode: "flat" | "per_unit";
  extraProductionDays: number;
  helpText: string | null;
};

/**
 * Lista fechada de atributos que viram seletor no configurador. `attributes`
 * pode conter outras chaves (ex: dados internos do pipeline de fornecedor
 * como `specification`, `supplier_cost_cents`, `weight_kg`) — essas nunca
 * viram dropdown nem entram na comparação de variante selecionada, senão
 * cada uma delas (que varia por combinação/quantidade) quebraria o
 * casamento de variante e poluiria a UI com opções sem sentido para o
 * cliente. jsonb do Postgres também não preserva ordem de inserção — a
 * ordem dos dropdowns vem desta lista, não da ordem das chaves no banco.
 */
export const ATTRIBUTE_KEY_ORDER = [
  "material",
  "cor",
  "cobertura",
  "tamanho",
  "bastao",
  "acabamento",
  "padrao",
  "corte",
  "embalagem",
  "tema",
  "paginas",
];

const CONFIGURABLE_ATTRIBUTE_KEYS = new Set(ATTRIBUTE_KEY_ORDER);

export const ATTRIBUTE_LABELS: Record<string, string> = {
  material: "Material",
  cor: "Cor",
  cobertura: "Cobertura",
  tamanho: "Tamanho",
  bastao: "Bastão",
  acabamento: "Acabamento Incluso",
  padrao: "Padrões",
  corte: "Corte",
  embalagem: "Embalagem",
  tema: "Tema",
  paginas: "Páginas",
};

function attributeLabel(key: string): string {
  return ATTRIBUTE_LABELS[key] ?? key.charAt(0).toUpperCase() + key.slice(1);
}

/** Remove chaves que não fazem parte da lista de atributos configuráveis. */
export function pickConfigurableAttributes(attributes: VariantAttributes): VariantAttributes {
  return Object.fromEntries(
    Object.entries(attributes).filter(([key]) => CONFIGURABLE_ATTRIBUTE_KEYS.has(key)),
  );
}

/** Só retorna atributos configuráveis com mais de um valor distinto entre as variantes ativas. */
export function deriveAttributeOptions(variants: AttributeVariant[]): AttributeOption[] {
  const valuesByKey = new Map<string, string[]>();

  for (const variant of [...variants].sort((a, b) => a.quantity - b.quantity)) {
    for (const [key, value] of Object.entries(pickConfigurableAttributes(variant.attributes))) {
      const existing = valuesByKey.get(key) ?? [];
      if (!existing.includes(value)) existing.push(value);
      valuesByKey.set(key, existing);
    }
  }

  const keys = [...valuesByKey.keys()].sort(
    (a, b) => ATTRIBUTE_KEY_ORDER.indexOf(a) - ATTRIBUTE_KEY_ORDER.indexOf(b),
  );

  return keys
    .filter((key) => (valuesByKey.get(key) ?? []).length > 1)
    .map((key) => ({ key, label: attributeLabel(key), values: valuesByKey.get(key)! }));
}

export function findMatchingVariant(
  variants: AttributeVariant[],
  selected: VariantAttributes,
): AttributeVariant | undefined {
  const configurableSelected = pickConfigurableAttributes(selected);
  return variants.find((variant) =>
    Object.entries(configurableSelected).every(([key, value]) => variant.attributes[key] === value),
  );
}

export function computeAddonsTotalCents(
  addons: Pick<AddonInfo, "priceCents" | "pricingMode">[],
  lineQuantity: number,
): number {
  return addons.reduce(
    (sum, addon) => sum + (addon.pricingMode === "per_unit" ? addon.priceCents * lineQuantity : addon.priceCents),
    0,
  );
}
