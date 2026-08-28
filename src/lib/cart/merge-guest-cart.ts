"use server";

import { cookies } from "next/headers";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

const GUEST_COOKIE = "guest_token";

/** Chamado logo após o login: transfere/mescla o carrinho de visitante para o usuário autenticado. */
export async function mergeGuestCartAction() {
  const authClient = await createServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user) return;

  const cookieStore = await cookies();
  const guestToken = cookieStore.get(GUEST_COOKIE)?.value;
  if (!guestToken) return;

  const service = createServiceClient();
  const { data: guestCart } = await service
    .from("carts")
    .select("id")
    .eq("guest_token", guestToken)
    .eq("status", "active")
    .maybeSingle();

  if (!guestCart) {
    cookieStore.delete(GUEST_COOKIE);
    return;
  }

  const { data: userCart } = await service
    .from("carts")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (!userCart) {
    await service
      .from("carts")
      .update({ user_id: user.id, guest_token: null })
      .eq("id", guestCart.id);
  } else {
    const { data: guestItems } = await service
      .from("cart_items")
      .select("product_variant_id, quantity, unit_price_cents")
      .eq("cart_id", guestCart.id);

    for (const item of guestItems ?? []) {
      const { data: existing } = await service
        .from("cart_items")
        .select("id, quantity")
        .eq("cart_id", userCart.id)
        .eq("product_variant_id", item.product_variant_id)
        .maybeSingle();

      if (existing) {
        await service
          .from("cart_items")
          .update({ quantity: existing.quantity + item.quantity })
          .eq("id", existing.id);
      } else {
        await service.from("cart_items").insert({
          cart_id: userCart.id,
          product_variant_id: item.product_variant_id,
          quantity: item.quantity,
          unit_price_cents: item.unit_price_cents,
        });
      }
    }

    await service.from("carts").update({ status: "abandoned" }).eq("id", guestCart.id);
  }

  cookieStore.delete(GUEST_COOKIE);
}
