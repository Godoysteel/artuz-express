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
 * jsonb do Postgres não preserva a ordem de inserção das chaves — a ordem dos
 * dropdowns vem daqui, não da ordem das chaves lidas do banco.
 */
export const ATTRIBUTE_KEY_ORDER = [
  "material",
  "cor",
  "cobertura",
  "tamanho",
  "acabamento",
  "padrao",
];

export const ATTRIBUTE_LABELS: Record<string, string> = {
  material: "Material",
  cor: "Cor",
  cobertura: "Cobertura",
  tamanho: "Tamanho",
  acabamento: "Acabamento Incluso",
  padrao: "Padrões",
};

function attributeLabel(key: string): string {
  return ATTRIBUTE_LABELS[key] ?? key.charAt(0).toUpperCase() + key.slice(1);
}

/** Só retorna atributos com mais de um valor distinto entre as variantes ativas. */
export function deriveAttributeOptions(variants: AttributeVariant[]): AttributeOption[] {
  const valuesByKey = new Map<string, string[]>();

  for (const variant of [...variants].sort((a, b) => a.quantity - b.quantity)) {
    for (const [key, value] of Object.entries(variant.attributes)) {
      const existing = valuesByKey.get(key) ?? [];
      if (!existing.includes(value)) existing.push(value);
      valuesByKey.set(key, existing);
    }
  }

  const keys = [...valuesByKey.keys()].sort((a, b) => {
    const ai = ATTRIBUTE_KEY_ORDER.indexOf(a);
    const bi = ATTRIBUTE_KEY_ORDER.indexOf(b);
    if (ai === -1 && bi === -1) return a.localeCompare(b);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

  return keys
    .filter((key) => (valuesByKey.get(key) ?? []).length > 1)
    .map((key) => ({ key, label: attributeLabel(key), values: valuesByKey.get(key)! }));
}

export function findMatchingVariant(
  variants: AttributeVariant[],
  selected: VariantAttributes,
): AttributeVariant | undefined {
  return variants.find((variant) =>
    Object.entries(selected).every(([key, value]) => variant.attributes[key] === value),
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
