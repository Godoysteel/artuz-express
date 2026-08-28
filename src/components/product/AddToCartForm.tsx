"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { formatCents } from "@/lib/format";
import { addToCartAction } from "@/lib/cart/actions";
import {
  computeAddonsTotalCents,
  deriveAttributeOptions,
  type AddonInfo,
  type AttributeVariant,
  type VariantAttributes,
} from "@/lib/product/attributes";
import { AttributeSelect } from "@/components/product/AttributeSelect";
import { QuantityTierList } from "@/components/product/QuantityTierList";
import { AddonChecklist } from "@/components/product/AddonChecklist";

export function AddToCartForm({
  variants,
  addons,
}: {
  variants: AttributeVariant[];
  addons: AddonInfo[];
}) {
  const router = useRouter();
  const attributeOptions = useMemo(() => deriveAttributeOptions(variants), [variants]);

  const initialVariant = variants.find((v) => v.isDefault) ?? variants[0];

  const [selectedAttributes, setSelectedAttributes] = useState<VariantAttributes>(
    initialVariant?.attributes ?? {},
  );
  const [selectedVariantId, setSelectedVariantId] = useState<string | undefined>(initialVariant?.id);
  const [selectedAddonIds, setSelectedAddonIds] = useState<Set<string>>(new Set());
  const [qty, setQty] = useState(1);
  const [isPending, startTransition] = useTransition();
  const [added, setAdded] = useState(false);

  const candidateVariants = useMemo(
    () =>
      variants.filter((v) =>
        Object.entries(selectedAttributes).every(([key, value]) => v.attributes[key] === value),
      ),
    [variants, selectedAttributes],
  );

  const selected = candidateVariants.find((v) => v.id === selectedVariantId) ?? candidateVariants[0];

  function handleAttributeChange(key: string, value: string) {
    const nextAttributes = { ...selectedAttributes, [key]: value };
    setSelectedAttributes(nextAttributes);

    const nextCandidates = variants.filter((v) =>
      Object.entries(nextAttributes).every(([k, val]) => v.attributes[k] === val),
    );
    const stillValid = nextCandidates.some((v) => v.id === selectedVariantId);
    if (!stillValid) {
      const cheapest = [...nextCandidates].sort((a, b) => a.quantity - b.quantity)[0];
      setSelectedVariantId(cheapest?.id);
    }
  }

  function toggleAddon(addonId: string) {
    setSelectedAddonIds((prev) => {
      const next = new Set(prev);
      if (next.has(addonId)) next.delete(addonId);
      else next.add(addonId);
      return next;
    });
  }

  if (!selected) {
    return <p className="text-sm text-slate-500">Produto indisponível no momento.</p>;
  }

  const selectedAddonsInfo = addons.filter((a) => selectedAddonIds.has(a.id));
  const addonsTotal = computeAddonsTotalCents(selectedAddonsInfo, qty);
  const totalCents = selected.priceCents * qty + addonsTotal;

  const addonList = addons.filter((a) => a.kind === "addon");
  const serviceList = addons.filter((a) => a.kind === "service");

  function handleAdd() {
    if (!selected) return;
    setAdded(false);
    startTransition(async () => {
      await addToCartAction(selected.id, qty, [...selectedAddonIds]);
      setAdded(true);
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      {attributeOptions.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {attributeOptions.map((option) => (
            <AttributeSelect
              key={option.key}
              option={option}
              value={selectedAttributes[option.key] ?? option.values[0]}
              onChange={(value) => handleAttributeChange(option.key, value)}
            />
          ))}
        </div>
      )}

      <QuantityTierList
        variants={candidateVariants}
        selectedId={selected.id}
        onSelect={setSelectedVariantId}
      />

      <AddonChecklist
        title="Acabamentos Opcionais"
        addons={addonList}
        selectedIds={selectedAddonIds}
        onToggle={toggleAddon}
      />
      <AddonChecklist
        title="Serviços Opcionais"
        addons={serviceList}
        selectedIds={selectedAddonIds}
        onToggle={toggleAddon}
      />

      <div className="flex items-end gap-4">
        <div>
          <p className="text-sm font-medium text-ink">Pedidos</p>
          <div className="mt-2 flex items-center rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="px-3 py-2 text-lg text-slate-500 hover:text-ink"
              aria-label="Diminuir"
            >
              −
            </button>
            <span className="w-8 text-center text-sm font-medium">{qty}</span>
            <button
              type="button"
              onClick={() => setQty((q) => q + 1)}
              className="px-3 py-2 text-lg text-slate-500 hover:text-ink"
              aria-label="Aumentar"
            >
              +
            </button>
          </div>
          <p className="mt-1 text-xs text-slate-400">x {selected.label}</p>
        </div>

        <p className="text-2xl font-bold text-ink">{formatCents(totalCents)}</p>
      </div>

      <button
        type="button"
        onClick={handleAdd}
        disabled={isPending}
        className="w-full rounded-full bg-gradient-to-r from-brand to-accent-dark px-6 py-3 text-sm font-semibold text-white transition hover:brightness-105 disabled:opacity-60 sm:w-auto"
      >
        {isPending ? "Adicionando..." : added ? "Adicionado ✓" : "Adicionar ao carrinho"}
      </button>
    </div>
  );
}
