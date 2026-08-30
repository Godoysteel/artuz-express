import "server-only";
import { createServiceClient } from "@/lib/supabase/service";

/** Pedidos pagos que ainda não entraram em produção — precisam de ação do admin. */
export async function getPendingOrdersCount(): Promise<number> {
  const service = createServiceClient();
  const { count } = await service
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("status", "paid");
  return count ?? 0;
}
