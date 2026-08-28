import Link from "next/link";
import { redirect } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { createClient } from "@/lib/supabase/server";

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, phone")
    .eq("id", user.id)
    .single();

  return (
    <Container className="py-8">
      <h1 className="text-2xl font-bold text-ink">Minha conta</h1>

      <div className="mt-6 max-w-md rounded-xl border border-slate-200 bg-white p-6">
        <p className="text-sm text-slate-500">Nome</p>
        <p className="font-medium text-ink">{profile?.full_name ?? "—"}</p>

        <p className="mt-4 text-sm text-slate-500">E-mail</p>
        <p className="font-medium text-ink">{user.email}</p>

        <div className="mt-6 flex items-center gap-3">
          <Link
            href="/pedidos"
            className="rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark"
          >
            Meus pedidos
          </Link>
          <LogoutButton />
        </div>
      </div>
    </Container>
  );
}
