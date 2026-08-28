import { formatCents } from "@/lib/format";
import type { AddonInfo } from "@/lib/product/attributes";

export function AddonChecklist({
  title,
  addons,
  selectedIds,
  onToggle,
}: {
  title: string;
  addons: AddonInfo[];
  selectedIds: Set<string>;
  onToggle: (addonId: string) => void;
}) {
  if (addons.length === 0) return null;

  return (
    <div>
      <p className="text-sm font-medium text-ink">{title}</p>
      <div className="mt-2 space-y-2">
        {addons.map((addon) => (
          <label
            key={addon.id}
            className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2.5 text-sm hover:border-slate-300"
          >
            <span className="flex items-start gap-2">
              <input
                type="checkbox"
                checked={selectedIds.has(addon.id)}
                onChange={() => onToggle(addon.id)}
                className="mt-0.5 accent-brand"
              />
              <span>
                <span className="block text-ink">{addon.label}</span>
                {addon.extraProductionDays > 0 && (
                  <span className="text-xs text-slate-400">
                    (+{addon.extraProductionDays} dia{addon.extraProductionDays > 1 ? "s" : ""})
                  </span>
                )}
                {addon.helpText && (
                  <span className="block text-xs text-slate-400" title={addon.helpText}>
                    O que é isso?
                  </span>
                )}
              </span>
            </span>
            <span className="shrink-0 font-medium text-brand-dark">
              + {formatCents(addon.priceCents)}
              {addon.pricingMode === "per_unit" && <span className="text-slate-400">/un.</span>}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
