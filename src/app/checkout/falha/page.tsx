import Link from "next/link";
import { XCircle } from "lucide-react";
import { Container } from "@/components/ui/Container";

export default function CheckoutFailurePage() {
  return (
    <Container className="flex flex-col items-center py-24 text-center">
      <XCircle className="size-14 text-red-500" />
      <h1 className="mt-4 text-2xl font-bold text-ink">Não foi possível concluir o pagamento</h1>
      <p className="mt-2 text-slate-600">
        O pagamento foi recusado ou cancelado. Seus itens continuam salvos no carrinho.
      </p>
      <div className="mt-8 flex gap-3">
        <Link
          href="/checkout"
          className="rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-dark"
        >
          Tentar novamente
        </Link>
        <Link
          href="/carrinho"
          className="rounded-full border border-slate-200 px-6 py-3 text-sm font-semibold text-ink transition hover:bg-slate-50"
        >
          Ver carrinho
        </Link>
      </div>
    </Container>
  );
}
