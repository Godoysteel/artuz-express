import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { calculateShipping, type ShippingOption } from "@/lib/melhor-envio/client";
import { getBoxForCategory } from "@/lib/melhor-envio/box-tiers";

/** Cota frete pro carrinho ativo, usando peso real da variante e caixa-padrão da categoria. */
export async function getShippingOptionsForCart(
  cartId: string,
  destinationPostalCode: string,
): Promise<ShippingOption[]> {
  const service = createServiceClient();
  const { data: items, error } = await service
    .from("cart_items")
    .select(
      `quantity,
       product_variants ( weight_grams, products ( categories ( slug ) ) )`,
    )
    .eq("cart_id", cartId);

  if (error || !items) return [];

  const quoteItems = items.flatMap((item) => {
    const variant = item.product_variants;
    const categorySlug = variant?.products?.categories?.slug;
    if (!variant || !categorySlug) return [];

    const box = getBoxForCategory(categorySlug);
    return [
      {
        weightGrams: variant.weight_grams ?? 200,
        quantity: item.quantity,
        boxWidthCm: box.widthCm,
        boxHeightCm: box.heightCm,
        boxLengthCm: box.lengthCm,
      },
    ];
  });

  if (quoteItems.length === 0) return [];
  return calculateShipping(destinationPostalCode, quoteItems);
}
