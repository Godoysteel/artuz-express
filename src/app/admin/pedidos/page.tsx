import Link from "next/link";
import { requireAdmin } from "@/lib/admin/auth";
import { createServiceClient } from "@/lib/supabase/service";
import { Container } from "@/components/ui/Container";
import { formatCents } from "@/lib/format";
import { STATUS_LABEL } from "@/lib/orders/status";
import { StatusSelect } from "@/components/admin/StatusSelect";

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ melhor_envio?: string }>;
}) {
  await requireAdmin();
  const { melhor_envio: melhorEnvioStatus } = await searchParams;

  const service = createServiceClient();
  const { data: orders } = await service
    .from("orders")
    .select("id, order_number, status, email, phone, total_cents, created_at")
    .order("created_at", { ascending: false });

  return (
    <Container className="py-8">
      <h1 className="text-2xl font-bold text-ink">Pedidos</h1>
      <p className="mt-1 text-sm text-slate-500">{orders?.length ?? 0} pedido(s)</p>

      {melhorEnvioStatus === "conectado" && (
        <p className="mt-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
          Melhor Envio conectado com sucesso.
        </p>
      )}
      {melhorEnvioStatus === "erro" && (
        <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
          Não foi possível conectar o Melhor Envio. Tente novamente em /api/integrations/melhor-envio/authorize.
        </p>
      )}

      {!orders || orders.length === 0 ? (
        <p className="mt-10 text-slate-500">Nenhum pedido ainda.</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-5 py-3 font-medium">Pedido</th>
                <th className="px-5 py-3 font-medium">Data</th>
                <th className="px-5 py-3 font-medium">Cliente</th>
                <th className="px-5 py-3 font-medium">Total</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-5 py-4">
                    <Link
                      href={`/admin/pedidos/${order.id}`}
                      className="font-medium text-ink hover:text-brand hover:underline"
                    >
                      {order.order_number}
                    </Link>
                  </td>
                  <td className="px-5 py-4 text-slate-500">
                    {new Date(order.created_at).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="px-5 py-4 text-slate-600">
                    <p>{order.email}</p>
                    {order.phone && <p className="text-xs text-slate-400">{order.phone}</p>}
                  </td>
                  <td className="px-5 py-4 font-semibold text-ink">{formatCents(order.total_cents)}</td>
                  <td className="px-5 py-4">
                    {order.status === "pending" || order.status === "payment_failed" ? (
                      <span className="text-slate-500">{STATUS_LABEL[order.status] ?? order.status}</span>
                    ) : (
                      <StatusSelect orderId={order.id} currentStatus={order.status} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Container>
  );
}
