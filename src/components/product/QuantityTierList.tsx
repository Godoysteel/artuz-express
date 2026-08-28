import { formatCents } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { AttributeVariant } from "@/lib/product/attributes";

export function QuantityTierList({
  variants,
  selectedId,
  onSelect,
}: {
  variants: AttributeVariant[];
  selectedId: string | undefined;
  onSelect: (variantId: string) => void;
}) {
  const sorted = [...variants].sort((a, b) => a.quantity - b.quantity);

  return (
    <div>
      <p className="text-sm font-medium text-ink">Quantidade</p>
      <div className="mt-2 space-y-1.5">
        {sorted.map((variant) => {
          const isSelected = variant.id === selectedId;
          return (
            <label
              key={variant.id}
              className={cn(
                "flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2.5 text-sm transition",
                isSelected
                  ? "border-brand bg-brand/5"
                  : "border-slate-200 hover:border-slate-300",
              )}
            >
              <span className="flex items-center gap-2">
                <input
                  type="radio"
                  name="quantity-tier"
                  checked={isSelected}
                  onChange={() => onSelect(variant.id)}
                  className="accent-brand"
                />
                <span className={isSelected ? "font-semibold text-brand-dark" : "text-ink"}>
                  {variant.label}
                </span>
              </span>
              <span className="font-semibold text-ink">{formatCents(variant.priceCents)}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
