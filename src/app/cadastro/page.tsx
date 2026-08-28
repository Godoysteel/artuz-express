"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Container } from "@/components/ui/Container";
import { createClient } from "@/lib/supabase/client";
import { mergeGuestCartAction } from "@/lib/cart/merge-guest-cart";

const inputClass =
  "w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-ink placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20";

export default function SignUpPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (data.session) {
      await mergeGuestCartAction();
      router.push("/");
      router.refresh();
      return;
    }

    setNeedsConfirmation(true);
    setLoading(false);
  }

  if (needsConfirmation) {
    return (
      <Container className="flex flex-col items-center py-24 text-center">
        <h1 className="text-2xl font-bold text-ink">Confirme seu e-mail</h1>
        <p className="mt-2 max-w-sm text-slate-600">
          Enviamos um link de confirmação para <strong>{email}</strong>. Clique no link para ativar
          sua conta e depois faça login.
        </p>
        <Link href="/login" className="mt-6 font-medium text-brand hover:underline">
          Ir para o login
        </Link>
      </Container>
    );
  }

  return (
    <Container className="flex justify-center py-16">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-ink">Criar conta</h1>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <input
            type="text"
            required
            placeholder="Nome completo"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className={inputClass}
          />
          <input
            type="email"
            required
            placeholder="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
          <input
            type="password"
            required
            minLength={6}
            placeholder="Senha (mín. 6 caracteres)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-gradient-to-r from-brand to-accent-dark px-6 py-3 text-sm font-semibold text-white transition hover:brightness-105 disabled:opacity-60"
          >
            {loading ? "Criando conta..." : "Criar conta"}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-500">
          Já tem uma conta?{" "}
          <Link href="/login" className="font-medium text-brand hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </Container>
  );
}
