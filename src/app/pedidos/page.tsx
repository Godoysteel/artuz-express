import Link from "next/link";
import { redirect } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { createClient } from "@/lib/supabase/server";
import { formatCents } from "@/lib/format";
import { STATUS_LABEL } from "@/lib/orders/status";

export default async function OrdersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: orders } = await supabase
    .from("orders")
    .select("id, order_number, status, total_cents, created_at")
    .order("created_at", { ascending: false });

  return (
    <Container className="py-8">
      <h1 className="text-2xl font-bold text-ink">Meus pedidos</h1>

      {!orders || orders.length === 0 ? (
        <p className="mt-10 text-slate-500">Você ainda não fez nenhum pedido.</p>
      ) : (
        <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/pedidos/${order.id}`}
              className="flex items-center justify-between border-b border-slate-100 px-5 py-4 last:border-0 hover:bg-slate-50"
            >
              <div>
                <p className="font-medium text-ink">{order.order_number}</p>
                <p className="text-xs text-slate-500">
                  {new Date(order.created_at).toLocaleDateString("pt-BR")}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-ink">{formatCents(order.total_cents)}</p>
                <p className="text-xs text-slate-500">
                  {STATUS_LABEL[order.status] ?? order.status}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </Container>
  );
}
