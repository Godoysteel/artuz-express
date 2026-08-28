"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { checkoutFormSchema, type CheckoutFormValues } from "@/lib/checkout/schema";
import { maskCep } from "@/lib/format";
import { cn } from "@/lib/cn";

const inputClass =
  "w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-ink placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20";

export function CheckoutForm() {
  const {
    register,
    handleSubmit,
    setValue,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<CheckoutFormValues>({ resolver: zodResolver(checkoutFormSchema) });

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isLookingUpCep, setIsLookingUpCep] = useState(false);

  async function handleCepBlur(event: React.FocusEvent<HTMLInputElement>) {
    const digits = event.target.value.replace(/\D/g, "");
    if (digits.length !== 8) return;

    setIsLookingUpCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await response.json();
      if (!data.erro) {
        setValue("logradouro", data.logradouro ?? "");
        setValue("bairro", data.bairro ?? "");
        setValue("cidade", data.localidade ?? "");
        setValue("uf", data.uf ?? "");
        setFocus("numero");
      }
    } catch {
      // busca de CEP é apenas uma conveniência — falha silenciosa, usuário preenche manualmente
    } finally {
      setIsLookingUpCep(false);
    }
  }

  async function onSubmit(values: CheckoutFormValues) {
    setSubmitError(null);
    try {
      const response = await fetch("/api/checkout/create-preference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: values.email,
          phone: values.phone,
          address: {
            cep: values.cep,
            logradouro: values.logradouro,
            numero: values.numero,
            complemento: values.complemento,
            bairro: values.bairro,
            cidade: values.cidade,
            uf: values.uf,
          },
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setSubmitError(data.error ?? "Não foi possível iniciar o pagamento.");
        return;
      }

      window.location.assign(data.initPoint);
    } catch {
      setSubmitError("Não foi possível conectar ao servidor. Tente novamente.");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <h2 className="text-sm font-semibold text-ink">Contato</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <input {...register("email")} type="email" placeholder="E-mail" className={inputClass} />
            {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
          </div>
          <div>
            <input {...register("phone")} type="tel" placeholder="Telefone / WhatsApp" className={inputClass} />
            {errors.phone && <p className="mt-1 text-xs text-red-500">{errors.phone.message}</p>}
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-ink">Endereço de entrega</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <input
              {...register("cep", {
                onChange: (e) => (e.target.value = maskCep(e.target.value)),
              })}
              onBlur={handleCepBlur}
              placeholder="CEP"
              maxLength={9}
              className={inputClass}
            />
            {errors.cep && <p className="mt-1 text-xs text-red-500">{errors.cep.message}</p>}
            {isLookingUpCep && <p className="mt-1 text-xs text-slate-400">Buscando endereço...</p>}
          </div>
          <div className="sm:col-span-2">
            <input {...register("logradouro")} placeholder="Endereço" className={inputClass} />
            {errors.logradouro && (
              <p className="mt-1 text-xs text-red-500">{errors.logradouro.message}</p>
            )}
          </div>
          <div>
            <input {...register("numero")} placeholder="Número" className={inputClass} />
            {errors.numero && <p className="mt-1 text-xs text-red-500">{errors.numero.message}</p>}
          </div>
          <div>
            <input {...register("complemento")} placeholder="Complemento (opcional)" className={inputClass} />
          </div>
          <div>
            <input {...register("bairro")} placeholder="Bairro" className={inputClass} />
            {errors.bairro && <p className="mt-1 text-xs text-red-500">{errors.bairro.message}</p>}
          </div>
          <div>
            <input {...register("cidade")} placeholder="Cidade" className={inputClass} />
            {errors.cidade && <p className="mt-1 text-xs text-red-500">{errors.cidade.message}</p>}
          </div>
          <div>
            <input {...register("uf")} placeholder="UF" maxLength={2} className={inputClass} />
            {errors.uf && <p className="mt-1 text-xs text-red-500">{errors.uf.message}</p>}
          </div>
        </div>
      </div>

      {submitError && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{submitError}</p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className={cn(
          "w-full rounded-full bg-gradient-to-r from-brand to-accent-dark px-6 py-3 text-sm font-semibold text-white transition hover:brightness-105 disabled:opacity-60",
        )}
      >
        {isSubmitting ? "Redirecionando para o pagamento..." : "Ir para pagamento"}
      </button>
      <p className="text-center text-xs text-slate-400">
        Você será redirecionado ao Mercado Pago para concluir com PIX, boleto ou cartão.
      </p>
    </form>
  );
}
