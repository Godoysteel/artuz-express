import { notFound, redirect } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { createClient } from "@/lib/supabase/server";
import { formatCents } from "@/lib/format";
import { whatsappLink } from "@/lib/whatsapp";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { STATUS_LABEL } from "@/lib/orders/status";
import { ARTWORK_BUCKET } from "@/lib/orders/files";
import { FileUploadForm } from "@/components/pedidos/FileUploadForm";
import { createServiceClient } from "@/lib/supabase/service";
import { DESIGN_SERVICE_LABEL } from "@/lib/product/design-service";

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

  const service = createServiceClient();
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

  const canUpload = order.status !== "pending" && order.status !== "payment_failed";

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
            const hasDesignService = selectedAddons.some((a) => a.label === DESIGN_SERVICE_LABEL);
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

                {hasDesignService ? (
                  <p className="mt-2 text-xs text-slate-500">
                    Nossa equipe vai criar a arte pra esse item — não precisa enviar arquivo. Fale com a
                    gente no WhatsApp pra descrever o que você quer.
                  </p>
                ) : canUpload ? (
                  <div className="mt-2">
                    {itemFiles.length > 0 && (
                      <ul className="space-y-1">
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
                    )}
                    <FileUploadForm orderItemId={item.id} />
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-slate-400">
                    Você poderá enviar a arte assim que o pagamento for confirmado.
                  </p>
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
