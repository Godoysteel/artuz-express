"use client";

import Image from "next/image";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { useTransition } from "react";
import { formatCents } from "@/lib/format";
import { removeCartItemAction, updateCartItemAction } from "@/lib/cart/actions";
import type { CartLine } from "@/lib/cart/cart-service";

export function CartItemRow({ line }: { line: CartLine }) {
  const [isPending, startTransition] = useTransition();

  function updateQuantity(quantity: number) {
    startTransition(() => updateCartItemAction(line.id, quantity));
  }

  function remove() {
    startTransition(() => removeCartItemAction(line.id));
  }

  return (
    <div className="flex items-center gap-4 border-b border-slate-200 py-4 last:border-0">
      <div className="relative size-20 shrink-0 overflow-hidden rounded-lg bg-slate-100">
        {line.product.imageUrl && (
          <Image src={line.product.imageUrl} alt={line.product.name} fill className="object-cover" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <Link href={`/produto/${line.product.slug}`} className="font-medium text-ink hover:text-brand">
          {line.product.name}
        </Link>
        <p className="text-sm text-slate-500">{line.variant.label}</p>
        {line.selectedAddons.length > 0 && (
          <p className="text-xs text-slate-400">
            {line.selectedAddons.map((a) => a.label).join(", ")}
          </p>
        )}
        <p className="mt-1 text-sm font-semibold text-brand-dark">{formatCents(line.unitPriceCents)}</p>
      </div>

      <div className="flex items-center rounded-lg border border-slate-200">
        <button
          type="button"
          onClick={() => updateQuantity(line.quantity - 1)}
          disabled={isPending}
          className="px-3 py-1.5 text-slate-500 hover:text-ink"
          aria-label="Diminuir"
        >
          −
        </button>
        <span className="w-8 text-center text-sm">{line.quantity}</span>
        <button
          type="button"
          onClick={() => updateQuantity(line.quantity + 1)}
          disabled={isPending}
          className="px-3 py-1.5 text-slate-500 hover:text-ink"
          aria-label="Aumentar"
        >
          +
        </button>
      </div>

      <p className="w-24 shrink-0 text-right font-semibold text-ink">
        {formatCents(line.lineTotalCents)}
      </p>

      <button
        type="button"
        onClick={remove}
        disabled={isPending}
        aria-label="Remover item"
        className="shrink-0 text-slate-400 transition hover:text-red-500"
      >
        <Trash2 className="size-5" />
      </button>
    </div>
  );
}
