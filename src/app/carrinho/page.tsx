import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { CartItemRow } from "@/components/cart/CartItemRow";
import { getCartSummary } from "@/lib/cart/cart-service";
import { formatCents } from "@/lib/format";

export default async function CartPage() {
  const { lines, subtotalCents } = await getCartSummary();

  if (lines.length === 0) {
    return (
      <Container className="flex flex-col items-center py-24 text-center">
        <ShoppingCart className="size-12 text-slate-300" />
        <h1 className="mt-4 text-xl font-bold text-ink">Seu carrinho está vazio</h1>
        <p className="mt-2 text-sm text-slate-500">Explore nossas categorias e adicione produtos.</p>
        <Link
          href="/"
          className="mt-6 rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-dark"
        >
          Ver categorias
        </Link>
      </Container>
    );
  }

  return (
    <Container className="py-8">
      <h1 className="text-2xl font-bold text-ink">Meu carrinho</h1>

      <div className="mt-6 grid gap-8 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 lg:col-span-2">
          {lines.map((line) => (
            <CartItemRow key={line.id} line={line} />
          ))}
        </div>

        <div className="h-fit rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex justify-between text-sm text-slate-600">
            <span>Subtotal</span>
            <span>{formatCents(subtotalCents)}</span>
          </div>
          <p className="mt-1 text-xs text-slate-400">Frete calculado no próximo passo.</p>
          <div className="mt-4 flex justify-between border-t border-slate-200 pt-4 text-lg font-bold text-ink">
            <span>Total</span>
            <span>{formatCents(subtotalCents)}</span>
          </div>
          <Link
            href="/checkout"
            className="mt-6 block w-full rounded-full bg-gradient-to-r from-brand to-accent-dark px-6 py-3 text-center text-sm font-semibold text-white transition hover:brightness-105"
          >
            Finalizar compra
          </Link>
        </div>
      </div>
    </Container>
  );
}
