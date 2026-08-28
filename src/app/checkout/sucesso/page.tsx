import Link from "next/link";
import { CheckCircle2, Clock } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { createServiceClient } from "@/lib/supabase/service";
import { formatCents } from "@/lib/format";

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const { order: orderId } = await searchParams;

  const order = orderId
    ? (
        await createServiceClient()
          .from("orders")
          .select("order_number, status, total_cents")
          .eq("id", orderId)
          .maybeSingle()
      ).data
    : null;

  const isPaid = order?.status === "paid";

  return (
    <Container className="flex flex-col items-center py-24 text-center">
      {isPaid ? (
        <CheckCircle2 className="size-14 text-emerald-500" />
      ) : (
        <Clock className="size-14 text-amber-500" />
      )}

      <h1 className="mt-4 text-2xl font-bold text-ink">
        {isPaid ? "Pagamento confirmado!" : "Recebemos o seu pedido"}
      </h1>

      {order ? (
        <>
          <p className="mt-2 text-slate-600">
            Pedido <strong>{order.order_number}</strong> — total {formatCents(order.total_cents)}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {isPaid
              ? "Já iniciamos a produção do seu pedido."
              : "Assim que o pagamento for confirmado pelo Mercado Pago, o status será atualizado automaticamente."}
          </p>
        </>
      ) : (
        <p className="mt-2 text-slate-600">Seu pedido foi registrado.</p>
      )}

      <Link
        href="/"
        className="mt-8 rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-dark"
      >
        Voltar para a loja
      </Link>
    </Container>
  );
}
