import { notFound, redirect } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { createClient } from "@/lib/supabase/server";
import { formatCents } from "@/lib/format";
import { whatsappLink } from "@/lib/whatsapp";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";

const STATUS_LABEL: Record<string, string> = {
  pending: "Aguardando pagamento",
  paid: "Pago",
  processing: "Em produção",
  shipped: "Enviado",
  completed: "Concluído",
  cancelled: "Cancelado",
  payment_failed: "Pagamento recusado",
};

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: order } = await supabase
    .from("orders")
    .select("id, order_number, status, subtotal_cents, shipping_cents, total_cents, shipping_address, created_at")
    .eq("id", id)
    .single();

  if (!order) notFound();

  const { data: items } = await supabase
    .from("order_items")
    .select("id, product_name, variant_label, quantity, unit_price_cents, total_price_cents, selected_addons")
    .eq("order_id", id);

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
      <h1 className="text-2xl font-bold text-ink">Pedido {order.order_number}</h1>
      <p className="mt-1 text-sm text-slate-500">
        {new Date(order.created_at).toLocaleDateString("pt-BR")} ·{" "}
        {STATUS_LABEL[order.status] ?? order.status}
      </p>

      <div className="mt-6 grid gap-8 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-2">
          {items?.map((item) => {
            const selectedAddons = (item.selected_addons ?? []) as unknown as {
              label: string;
            }[];
            return (
              <div key={item.id} className="flex justify-between border-b border-slate-100 py-3 last:border-0">
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
            );
          })}
        </div>

        <div className="h-fit space-y-4 rounded-xl border border-slate-200 bg-white p-5">
          <div>
            <p className="text-sm font-semibold text-ink">Total</p>
            <p className="text-2xl font-bold text-ink">{formatCents(order.total_cents)}</p>
          </div>
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
          <div className="border-t border-slate-100 pt-4">
            <p className="text-sm font-semibold text-ink">Dúvidas sobre esse pedido?</p>
            <a
              href={whatsappLink(`Olá! Tenho uma dúvida sobre o pedido ${order.order_number}.`)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-105"
            >
              <WhatsAppIcon className="size-4" />
              Falar no WhatsApp
            </a>
          </div>
        </div>
      </div>
    </Container>
  );
}
