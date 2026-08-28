import { redirect } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";
import { getCartSummary } from "@/lib/cart/cart-service";
import { formatCents } from "@/lib/format";

export default async function CheckoutPage() {
  const { lines, subtotalCents } = await getCartSummary();
  if (lines.length === 0) redirect("/carrinho");

  return (
    <Container className="py-8">
      <h1 className="text-2xl font-bold text-ink">Finalizar compra</h1>

      <div className="mt-6 grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <CheckoutForm />
        </div>

        <div className="h-fit rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-ink">Resumo do pedido</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            {lines.map((line) => (
              <li key={line.id} className="flex justify-between gap-2">
                <span className="truncate">
                  {line.quantity}× {line.product.name} ({line.variant.label})
                </span>
                <span className="shrink-0">{formatCents(line.unitPriceCents * line.quantity)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex justify-between border-t border-slate-200 pt-4 text-lg font-bold text-ink">
            <span>Total</span>
            <span>{formatCents(subtotalCents)}</span>
          </div>
        </div>
      </div>
    </Container>
  );
}
