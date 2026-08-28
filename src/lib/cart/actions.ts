"use server";

import { revalidatePath } from "next/cache";
import {
  addItemToCart,
  removeCartItem,
  updateCartItemQuantity,
} from "@/lib/cart/cart-service";

export async function addToCartAction(
  variantId: string,
  quantity: number,
  selectedAddonIds: string[] = [],
) {
  await addItemToCart(variantId, quantity, selectedAddonIds);
  revalidatePath("/carrinho");
}

export async function updateCartItemAction(itemId: string, quantity: number) {
  await updateCartItemQuantity(itemId, quantity);
  revalidatePath("/carrinho");
}

export async function removeCartItemAction(itemId: string) {
  await removeCartItem(itemId);
  revalidatePath("/carrinho");
}
