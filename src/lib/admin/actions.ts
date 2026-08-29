"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/auth";
import { createServiceClient } from "@/lib/supabase/service";
import { MANAGEABLE_STATUSES } from "@/lib/orders/status";

export async function updateOrderStatusAction(orderId: string, status: string) {
  await requireAdmin();

  if (!MANAGEABLE_STATUSES.includes(status as (typeof MANAGEABLE_STATUSES)[number])) {
    throw new Error("Status inválido.");
  }

  const service = createServiceClient();
  const { error } = await service.from("orders").update({ status }).eq("id", orderId);
  if (error) throw new Error("Não foi possível atualizar o pedido.");

  revalidatePath("/admin/pedidos");
  revalidatePath(`/admin/pedidos/${orderId}`);
}
