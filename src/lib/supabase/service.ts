import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";

/**
 * Client com a service-role key — ignora RLS. Uso exclusivo em código
 * server-side (route handlers/server actions) para operações de carrinho de
 * visitante e criação/atualização de pedidos. Nunca importar em código de client.
 */
export function createServiceClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
