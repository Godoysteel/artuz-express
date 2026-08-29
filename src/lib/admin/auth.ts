import "server-only";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Dono único do negócio, sem sistema de papéis — o admin é quem loga com
 * esse e-mail. Configurável via ADMIN_EMAIL para não precisar mexer em
 * código se o e-mail de acesso mudar.
 */
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "godoysteelframe@gmail.com";

/** Redireciona pro login se não autenticado, 404 se autenticado mas não-admin. */
export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirect=/admin/pedidos");
  if (user.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) notFound();

  return user;
}

export async function isAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return !!user && user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
}
