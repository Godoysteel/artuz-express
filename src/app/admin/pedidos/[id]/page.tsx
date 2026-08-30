import { notFound } from "next/navigation";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin/auth";
import { createServiceClient } from "@/lib/supabase/service";
import { Container } from "@/components/ui/Container";
import { formatCents } from "@/lib/format";
import { STATUS_LABEL } from "@/lib/orders/status";
import { StatusSelect } from "@/components/admin/StatusSelect";
import { ARTWORK_BUCKET } from "@/lib/orders/files";

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const service = createServiceClient();
  const { data: order } = await service
    .from("orders")
    .select(
      "id, order_number, status, email, phone, cpf, subtotal_cents, shipping_cents, total_cents, shipping_address, mp_payment_id, mp_payment_status, created_at",
    )
    .eq("id", id)
    .single();

  if (!order) notFound();

  const { data: items } = await service
    .from("order_items")
    .select("id, product_name, variant_label, quantity, unit_price_cents, total_price_cents, selected_addons")
    .eq("order_id", id);

  const { data: files } = items?.length
    ? await service
        .from("order_item_files")
        .select("id, order_item_id, file_path, file_name, uploaded_at")
        .in(
          "order_item_id",
          items.map((i) => i.id),
        )
    : { data: [] };

  const filesByItem = new Map<string, { id: string; file_path: string; file_name: string; uploaded_at: string }[]>();
  for (const file of files ?? []) {
    const list = filesByItem.get(file.order_item_id) ?? [];
    list.push(file);
    filesByItem.set(file.order_item_id, list);
  }

  const fileUrlById = new Map<string, string>();
  for (const file of files ?? []) {
    const { data: signed } = await service.storage
      .from(ARTWORK_BUCKET)
      .createSignedUrl(file.file_path, 300);
    if (signed) fileUrlById.set(file.id, signed.signedUrl);
  }

  const address = order.shipping_address as {
    cep: string;
    logradouro: string;
    numero: string;
    complemento?: string;
    bairro: string;
    cidade: string;
    uf: string;
  } | null;

  return (
    <Container className="py-8">
      <Link href="/admin/pedidos" className="text-sm text-slate-500 hover:text-brand">
        ← Todos os pedidos
      </Link>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">Pedido {order.order_number}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {new Date(order.created_at).toLocaleString("pt-BR")}
          </p>
        </div>
        {order.status === "pending" || order.status === "payment_failed" ? (
          <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600">
            {STATUS_LABEL[order.status] ?? order.status}
          </span>
        ) : (
          <StatusSelect orderId={order.id} currentStatus={order.status} />
        )}
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-2">
          {items?.map((item) => {
            const selectedAddons = (item.selected_addons ?? []) as unknown as { label: string }[];
            const itemFiles = filesByItem.get(item.id) ?? [];
            return (
              <div key={item.id} className="border-b border-slate-100 py-3 last:border-0">
                <div className="flex justify-between">
                  <div>
                    <p className="font-medium text-ink">{item.product_name}</p>
                    <p className="text-sm text-slate-500">
                      {item.variant_label} × {item.quantity}
                    </p>
                    {selectedAddons.length > 0 && (
                      <p className="text-xs text-slate-400">
                        {selectedAddons.map((a) => a.label).join(", ")}
                      </p>
                    )}
                  </div>
                  <p className="font-semibold text-ink">{formatCents(item.total_price_cents)}</p>
                </div>
                {itemFiles.length > 0 ? (
                  <ul className="mt-2 space-y-1">
                    {itemFiles.map((file) => (
                      <li key={file.id} className="text-sm">
                        <a
                          href={fileUrlById.get(file.id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-brand hover:underline"
                        >
                          {file.file_name}
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-xs text-slate-400">Nenhuma arte enviada ainda.</p>
                )}
              </div>
            );
          })}
        </div>

        <div className="h-fit space-y-4 rounded-xl border border-slate-200 bg-white p-5">
          <div>
            <p className="text-sm font-semibold text-ink">Total</p>
            <p className="text-2xl font-bold text-ink">{formatCents(order.total_cents)}</p>
          </div>

          <div>
            <p className="text-sm font-semibold text-ink">Contato</p>
            <p className="text-sm text-slate-600">{order.email}</p>
            {order.phone && <p className="text-sm text-slate-600">{order.phone}</p>}
          </div>

          {order.cpf && (
            <div>
              <p className="text-sm font-semibold text-ink">CPF (nota fiscal)</p>
              <p className="text-sm text-slate-600">{order.cpf}</p>
            </div>
          )}

          {address && (
            <div>
              <p className="text-sm font-semibold text-ink">Endereço de entrega</p>
              <p className="text-sm text-slate-600">
                {address.logradouro}, {address.numero}
                {address.complemento ? ` — ${address.complemento}` : ""}
                <br />
                {address.bairro}, {address.cidade} - {address.uf}
                <br />
                CEP {address.cep}
              </p>
            </div>
          )}

          {order.mp_payment_id && (
            <div>
              <p className="text-sm font-semibold text-ink">Pagamento</p>
              <p className="text-sm text-slate-600">
                Mercado Pago #{order.mp_payment_id} — {order.mp_payment_status}
              </p>
            </div>
          )}
        </div>
      </div>
    </Container>
  );
}
