"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { formatCents } from "@/lib/format";
import { addToCartAction } from "@/lib/cart/actions";
import {
  computeAddonsTotalCents,
  deriveAttributeOptions,
  pickConfigurableAttributes,
  type AddonInfo,
  type AttributeVariant,
  type VariantAttributes,
} from "@/lib/product/attributes";
import { AttributeSelect } from "@/components/product/AttributeSelect";
import { QuantityTierList } from "@/components/product/QuantityTierList";
import { AddonChecklist } from "@/components/product/AddonChecklist";
import { ArtworkUpload } from "@/components/product/ArtworkUpload";
import { DESIGN_SERVICE_LABEL } from "@/lib/product/design-service";
import { trackEvent } from "@/lib/analytics/client";

export function AddToCartForm({
  product,
  variants,
  addons,
  requiresArtwork = true,
}: {
  product: { id: string; slug: string; name: string };
  variants: AttributeVariant[];
  addons: AddonInfo[];
  requiresArtwork?: boolean;
}) {
  const router = useRouter();
  const attributeOptions = useMemo(() => deriveAttributeOptions(variants), [variants]);

  const initialVariant = variants.find((v) => v.isDefault) ?? variants[0];

  const [selectedAttributes, setSelectedAttributes] = useState<VariantAttributes>(
    pickConfigurableAttributes(initialVariant?.attributes ?? {}),
  );
  const [selectedVariantId, setSelectedVariantId] = useState<string | undefined>(initialVariant?.id);
  const [selectedAddonIds, setSelectedAddonIds] = useState<Set<string>>(new Set());
  const [qty, setQty] = useState(1);
  const [isPending, startTransition] = useTransition();
  const [added, setAdded] = useState(false);
  const [artworkToken, setArtworkToken] = useState(() => crypto.randomUUID());
  const [artworkFileName, setArtworkFileName] = useState<string | null>(null);

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
    const nextCandidates = variants.filter((v) =>
      Object.entries(nextAttributes).every(([k, val]) => v.attributes[k] === val),
    );

    if (nextCandidates.length === 0) {
      // Nem todo produto tem combinação completa entre atributos (ex: nem
      // todo tamanho de banner existe com todo tipo de bastão) — em vez de
      // ficar sem variante nenhuma, mantém só o atributo que acabou de
      // mudar e adota os demais valores de uma variante real que o tenha.
      const fallback = variants.filter((v) => v.attributes[key] === value);
      const cheapestFallback = [...fallback].sort((a, b) => a.quantity - b.quantity)[0];
      if (cheapestFallback) {
        setSelectedAttributes(pickConfigurableAttributes(cheapestFallback.attributes));
        setSelectedVariantId(cheapestFallback.id);
      }
      return;
    }

    setSelectedAttributes(nextAttributes);
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

  const designServiceAddon = addons.find((a) => a.label === DESIGN_SERVICE_LABEL);
  const hasDesignService = !!designServiceAddon && selectedAddonIds.has(designServiceAddon.id);
  const hasArtwork = !requiresArtwork || hasDesignService || !!artworkFileName;

  function handleAdd() {
    if (!selected || !hasArtwork) return;
    setAdded(false);
    startTransition(async () => {
      await addToCartAction(
        selected.id,
        qty,
        [...selectedAddonIds],
        !hasDesignService && artworkFileName ? artworkToken : undefined,
      );
      setAdded(true);
      trackEvent({
          eventType: "add_to_cart",
          productId: product.id,
          productSlug: product.slug,
          productName: product.name,
          metadata: { quantity: qty, variantId: selected.id },
        });
      setArtworkFileName(null);
      setArtworkToken(crypto.randomUUID());
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
      {requiresArtwork && (
        <ArtworkUpload
          token={artworkToken}
          disabled={hasDesignService}
          fileName={artworkFileName}
          onFileChange={setArtworkFileName}
        />
      )}

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

      <div>
        <button
          type="button"
          onClick={handleAdd}
          disabled={isPending || !hasArtwork}
          className="w-full rounded-full bg-gradient-to-r from-brand to-accent-dark px-6 py-3 text-sm font-semibold text-white transition hover:brightness-105 disabled:opacity-60 sm:w-auto"
        >
          {isPending ? "Adicionando..." : added ? "Adicionado ✓" : "Adicionar ao carrinho"}
        </button>
        {!hasArtwork && (
          <p className="mt-2 text-xs text-slate-500">
            Envie o arquivo de arte ou escolha &quot;Nossos designers fazem a arte pra você&quot; pra
            continuar.
          </p>
        )}
      </div>
    </div>
  );
}
