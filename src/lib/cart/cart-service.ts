import "server-only";
import { cookies } from "next/headers";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { computeAddonsTotalCents, type AddonInfo } from "@/lib/product/attributes";

const GUEST_COOKIE = "guest_token";

export type SelectedAddonSnapshot = Pick<
  AddonInfo,
  "id" | "kind" | "label" | "priceCents" | "pricingMode" | "extraProductionDays"
>;

export type CartLine = {
  id: string;
  quantity: number;
  unitPriceCents: number;
  selectedAddons: SelectedAddonSnapshot[];
  addonsTotalCents: number;
  lineTotalCents: number;
  variant: {
    id: string;
    label: string;
    quantity: number;
  };
  product: {
    slug: string;
    name: string;
    imageUrl: string | null;
  };
};

export type CartSummary = {
  cartId: string | null;
  lines: CartLine[];
  itemCount: number;
  subtotalCents: number;
};

async function getCurrentUserId(): Promise<string | null> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

/** Leitura: retorna o id do carrinho ativo existente, sem criar um novo. */
export async function findActiveCartId(): Promise<string | null> {
  const service = createServiceClient();
  const userId = await getCurrentUserId();

  if (userId) {
    const { data } = await service
      .from("carts")
      .select("id")
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();
    return data?.id ?? null;
  }

  const cookieStore = await cookies();
  const guestToken = cookieStore.get(GUEST_COOKIE)?.value;
  if (!guestToken) return null;

  const { data } = await service
    .from("carts")
    .select("id")
    .eq("guest_token", guestToken)
    .eq("status", "active")
    .maybeSingle();
  return data?.id ?? null;
}

/** Escrita: retorna o id do carrinho ativo, criando (e persistindo o cookie de visitante) se necessário. */
export async function getOrCreateCartId(): Promise<string> {
  const service = createServiceClient();
  const userId = await getCurrentUserId();

  if (userId) {
    const { data: existing } = await service
      .from("carts")
      .select("id")
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();
    if (existing) return existing.id;

    const { data: created, error } = await service
      .from("carts")
      .insert({ user_id: userId })
      .select("id")
      .single();
    if (error || !created) throw new Error("Não foi possível criar o carrinho.");
    return created.id;
  }

  const cookieStore = await cookies();
  const existingToken = cookieStore.get(GUEST_COOKIE)?.value;

  if (existingToken) {
    const { data: existing } = await service
      .from("carts")
      .select("id")
      .eq("guest_token", existingToken)
      .eq("status", "active")
      .maybeSingle();
    if (existing) return existing.id;
  }

  const guestToken = crypto.randomUUID();
  cookieStore.set(GUEST_COOKIE, guestToken, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  const { data: created, error } = await service
    .from("carts")
    .insert({ guest_token: guestToken })
    .select("id")
    .single();
  if (error || !created) throw new Error("Não foi possível criar o carrinho.");
  return created.id;
}

export async function addItemToCart(
  variantId: string,
  quantity = 1,
  selectedAddonIds: string[] = [],
  artworkToken?: string,
) {
  const service = createServiceClient();
  const cartId = await getOrCreateCartId();

  const { data: variant, error: variantError } = await service
    .from("product_variants")
    .select("id, product_id, price_cents, is_active")
    .eq("id", variantId)
    .single();
  if (variantError || !variant || !variant.is_active) {
    throw new Error("Variante de produto inválida.");
  }

  let selectedAddons: SelectedAddonSnapshot[] = [];
  if (selectedAddonIds.length > 0) {
    const { data: addons } = await service
      .from("product_addons")
      .select("id, kind, label, price_cents, pricing_mode, extra_production_days")
      .in("id", selectedAddonIds)
      .eq("product_id", variant.product_id)
      .eq("is_active", true);

    selectedAddons = (addons ?? []).map((a) => ({
      id: a.id,
      kind: a.kind as "addon" | "service",
      label: a.label,
      priceCents: a.price_cents,
      pricingMode: a.pricing_mode as "flat" | "per_unit",
      extraProductionDays: a.extra_production_days,
    }));
  }

  const addonSelectionKey = selectedAddons
    .map((a) => a.id)
    .sort()
    .join(",");

  const { data: existingLine } = await service
    .from("cart_items")
    .select("id, quantity")
    .eq("cart_id", cartId)
    .eq("product_variant_id", variantId)
    .eq("addon_selection_key", addonSelectionKey)
    .maybeSingle();

  if (existingLine) {
    await service
      .from("cart_items")
      .update({
        quantity: existingLine.quantity + quantity,
        ...(artworkToken ? { artwork_token: artworkToken } : {}),
      })
      .eq("id", existingLine.id);
  } else {
    await service.from("cart_items").insert({
      cart_id: cartId,
      product_variant_id: variantId,
      quantity,
      unit_price_cents: variant.price_cents,
      selected_addons: selectedAddons,
      addon_selection_key: addonSelectionKey,
      artwork_token: artworkToken ?? null,
    });
  }
}

export async function updateCartItemQuantity(itemId: string, quantity: number) {
  const service = createServiceClient();
  if (quantity <= 0) {
    await service.from("cart_items").delete().eq("id", itemId);
    return;
  }
  await service.from("cart_items").update({ quantity }).eq("id", itemId);
}

export async function removeCartItem(itemId: string) {
  const service = createServiceClient();
  await service.from("cart_items").delete().eq("id", itemId);
}

export async function getCartSummary(): Promise<CartSummary> {
  const cartId = await findActiveCartId();
  if (!cartId) {
    return { cartId: null, lines: [], itemCount: 0, subtotalCents: 0 };
  }

  const service = createServiceClient();
  const { data: items } = await service
    .from("cart_items")
    .select(
      `id, quantity, unit_price_cents, selected_addons,
       product_variants ( id, label, quantity, products ( slug, name, product_images ( url, sort_order ) ) )`,
    )
    .eq("cart_id", cartId)
    .order("created_at", { ascending: true });

  const lines: CartLine[] = (items ?? []).flatMap((item) => {
    const variant = item.product_variants;
    if (!variant) return [];
    const product = variant.products;
    if (!product) return [];
    const images = [...(product.product_images ?? [])].sort(
      (a, b) => a.sort_order - b.sort_order,
    );
    const selectedAddons = (item.selected_addons ?? []) as unknown as SelectedAddonSnapshot[];
    const addonsTotalCents = computeAddonsTotalCents(selectedAddons, item.quantity);
    const lineTotalCents = item.quantity * item.unit_price_cents + addonsTotalCents;

    return [
      {
        id: item.id,
        quantity: item.quantity,
        unitPriceCents: item.unit_price_cents,
        selectedAddons,
        addonsTotalCents,
        lineTotalCents,
        variant: { id: variant.id, label: variant.label, quantity: variant.quantity },
        product: {
          slug: product.slug,
          name: product.name,
          imageUrl: images[0]?.url ?? null,
        },
      },
    ];
  });

  const itemCount = lines.reduce((sum, line) => sum + line.quantity, 0);
  const subtotalCents = lines.reduce((sum, line) => sum + line.lineTotalCents, 0);

  return { cartId, lines, itemCount, subtotalCents };
}
