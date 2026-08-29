import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { getPreferenceClient } from "@/lib/mercadopago/client";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { computeAddonsTotalCents } from "@/lib/product/attributes";
import type { SelectedAddonSnapshot } from "@/lib/cart/cart-service";
import { DESIGN_SERVICE_LABEL } from "@/lib/product/design-service";
import { getShippingOptionsForCart } from "@/lib/melhor-envio/quote";

export type CheckoutAddress = {
  cep: string;
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  uf: string;
};

export type CheckoutInput = {
  cartId: string;
  email: string;
  phone: string;
  address: CheckoutAddress;
  shippingServiceId: number;
};

export class CheckoutError extends Error {}

/**
 * Recarrega o carrinho, recalcula preços a partir de product_variants (nunca
 * confia em valores vindos do client), cria o pedido (status pending) e a
 * preferência de pagamento no Mercado Pago. Retorna a URL para redirecionar
 * o cliente ao checkout hospedado.
 */
export async function createOrderAndPreference(input: CheckoutInput) {
  const service = createServiceClient();

  const { data: items, error: itemsError } = await service
    .from("cart_items")
    .select(
      `id, quantity, selected_addons, artwork_token,
       product_variants ( id, label, price_cents, products ( name ) )`,
    )
    .eq("cart_id", input.cartId);

  if (itemsError || !items || items.length === 0) {
    throw new CheckoutError("Carrinho vazio ou inválido.");
  }

  const lineItems = items.flatMap((item) => {
    const variant = item.product_variants;
    const product = variant?.products;
    if (!variant || !product) return [];
    const selectedAddons = (item.selected_addons ?? []) as unknown as SelectedAddonSnapshot[];
    const addonsTotalCents = computeAddonsTotalCents(selectedAddons, item.quantity);
    return [
      {
        productName: product.name,
        variantLabel: variant.label,
        variantId: variant.id,
        quantity: item.quantity,
        unitPriceCents: variant.price_cents,
        selectedAddons,
        addonsTotalCents,
        totalPriceCents: item.quantity * variant.price_cents + addonsTotalCents,
        artworkToken: item.artwork_token as string | null,
      },
    ];
  });

  if (lineItems.length === 0) {
    throw new CheckoutError("Carrinho vazio ou inválido.");
  }

  // Todo item precisa ou de uma arte enviada, ou do serviço de design —
  // conferido de novo aqui (não só no client) porque nunca confiamos só na
  // validação do formulário pra travar o fluxo de pagamento.
  const missingArtwork = lineItems.find(
    (line) => !line.artworkToken && !line.selectedAddons.some((a) => a.label === DESIGN_SERVICE_LABEL),
  );
  if (missingArtwork) {
    throw new CheckoutError(
      `Envie a arte ou escolha "Nossos designers fazem a arte pra você" para: ${missingArtwork.productName}.`,
    );
  }

  const subtotalCents = lineItems.reduce((sum, line) => sum + line.totalPriceCents, 0);

  // Nunca confia no preço de frete vindo do client — recota no servidor com
  // os mesmos itens/CEP e usa o preço da opção escolhida (por serviceId).
  const shippingOptions = await getShippingOptionsForCart(input.cartId, input.address.cep);
  const chosenShipping = shippingOptions.find((o) => o.serviceId === input.shippingServiceId);
  if (!chosenShipping) {
    throw new CheckoutError("Opção de frete inválida ou expirada. Recalcule o frete e tente novamente.");
  }
  const shippingCents = chosenShipping.priceCents;
  const totalCents = subtotalCents + shippingCents;

  const authClient = await createServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  const { data: order, error: orderError } = await service
    .from("orders")
    .insert({
      user_id: user?.id ?? null,
      email: input.email,
      phone: input.phone,
      subtotal_cents: subtotalCents,
      shipping_cents: shippingCents,
      total_cents: totalCents,
      shipping_address: input.address,
    })
    .select("id, order_number")
    .single();

  if (orderError || !order) {
    throw new CheckoutError("Não foi possível criar o pedido.");
  }

  const { data: insertedItems, error: orderItemsError } = await service
    .from("order_items")
    .insert(
      lineItems.map((line) => ({
        order_id: order.id,
        product_variant_id: line.variantId,
        product_name: line.productName,
        variant_label: line.variantLabel,
        quantity: line.quantity,
        unit_price_cents: line.unitPriceCents,
        total_price_cents: line.totalPriceCents,
        selected_addons: line.selectedAddons,
      })),
    )
    .select("id");

  if (orderItemsError || !insertedItems) {
    throw new CheckoutError("Não foi possível registrar os itens do pedido.");
  }

  // O insert acima preserva a ordem de lineItems, então dá pra parear pelo
  // índice e "reclamar" a arte enviada como rascunho (draft_artwork) antes
  // de existir um order_item de verdade pra ela apontar.
  for (const [index, line] of lineItems.entries()) {
    if (!line.artworkToken) continue;
    const orderItemId = insertedItems[index]?.id;
    if (!orderItemId) continue;

    const { data: draft } = await service
      .from("draft_artwork")
      .select("file_path, file_name, content_type, size_bytes")
      .eq("token", line.artworkToken)
      .maybeSingle();
    if (!draft) continue;

    await service.from("order_item_files").insert({
      order_item_id: orderItemId,
      file_path: draft.file_path,
      file_name: draft.file_name,
      content_type: draft.content_type,
      size_bytes: draft.size_bytes,
    });
    await service.from("draft_artwork").delete().eq("token", line.artworkToken);
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const preferenceClient = getPreferenceClient();
  const preference = await preferenceClient.create({
    body: {
      items: [
        ...lineItems.map((line) => ({
          id: line.variantId,
          title:
            line.selectedAddons.length > 0
              ? `${line.productName} — ${line.variantLabel} (+ ${line.selectedAddons.map((a) => a.label).join(", ")})`
              : `${line.productName} — ${line.variantLabel}`,
          // Adicionais têm regras de preço mistas (flat vs. por unidade), então cada
          // linha do carrinho vira 1 item do Mercado Pago com o total já calculado,
          // em vez de tentar manter preço-unitário × quantidade em sincronia.
          quantity: 1,
          unit_price: line.totalPriceCents / 100,
          currency_id: "BRL",
        })),
        {
          id: "frete",
          title: `Frete — ${chosenShipping.serviceName} (${chosenShipping.companyName})`,
          quantity: 1,
          unit_price: shippingCents / 100,
          currency_id: "BRL",
        },
      ],
      payer: { email: input.email },
      external_reference: order.id,
      back_urls: {
        success: `${siteUrl}/checkout/sucesso?order=${order.id}`,
        failure: `${siteUrl}/checkout/falha?order=${order.id}`,
        pending: `${siteUrl}/checkout/sucesso?order=${order.id}`,
      },
      auto_return: "approved",
      notification_url: `${siteUrl}/api/webhooks/mercadopago`,
    },
  });

  await service
    .from("orders")
    .update({ mp_preference_id: preference.id })
    .eq("id", order.id);

  await service.from("carts").update({ status: "converted" }).eq("id", input.cartId);

  const initPoint = preference.init_point ?? preference.sandbox_init_point;
  if (!initPoint) {
    throw new CheckoutError("Mercado Pago não retornou uma URL de pagamento.");
  }

  return { orderId: order.id, orderNumber: order.order_number, initPoint };
}
