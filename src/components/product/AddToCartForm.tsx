"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { formatCents } from "@/lib/format";
import { addToCartAction } from "@/lib/cart/actions";
import { cn } from "@/lib/cn";

type Variant = {
  id: string;
  label: string;
  quantity: number;
  priceCents: number;
  isDefault: boolean;
};

export function AddToCartForm({ variants }: { variants: Variant[] }) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState(
    variants.find((v) => v.isDefault)?.id ?? variants[0]?.id,
  );
  const [qty, setQty] = useState(1);
  const [isPending, startTransition] = useTransition();
  const [added, setAdded] = useState(false);

  const selected = variants.find((v) => v.id === selectedId) ?? variants[0];

  if (!selected) {
    return <p className="text-sm text-slate-500">Produto indisponível no momento.</p>;
  }

  function handleAdd() {
    setAdded(false);
    startTransition(async () => {
      await addToCartAction(selected.id, qty);
      setAdded(true);
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-medium text-ink">Quantidade</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {variants.map((variant) => (
            <button
              key={variant.id}
              type="button"
              onClick={() => setSelectedId(variant.id)}
              className={cn(
                "rounded-lg border px-3 py-2 text-sm transition",
                variant.id === selectedId
                  ? "border-brand bg-brand/5 text-brand-dark font-semibold"
                  : "border-slate-200 text-slate-600 hover:border-slate-300",
              )}
            >
              {variant.label}
              <span className="block text-xs font-normal text-slate-400">
                {formatCents(variant.priceCents)}
              </span>
            </button>
          ))}
        </div>
      </div>

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
        </div>

        <p className="text-2xl font-bold text-ink">
          {formatCents(selected.priceCents * qty)}
        </p>
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
