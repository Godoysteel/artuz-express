import { NextResponse } from "next/server";
import { z } from "zod";
import { findActiveCartId } from "@/lib/cart/cart-service";
import { CheckoutError, createOrderAndPreference } from "@/lib/checkout/create-order";

const bodySchema = z.object({
  email: z.string().email(),
  phone: z.string().min(8),
  address: z.object({
    cep: z.string().min(8),
    logradouro: z.string().min(3),
    numero: z.string().min(1),
    complemento: z.string().optional(),
    bairro: z.string().min(2),
    cidade: z.string().min(2),
    uf: z.string().length(2),
  }),
});

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const cartId = await findActiveCartId();
  if (!cartId) {
    return NextResponse.json({ error: "Carrinho não encontrado." }, { status: 400 });
  }

  try {
    const result = await createOrderAndPreference({
      cartId,
      email: parsed.data.email,
      phone: parsed.data.phone,
      address: parsed.data.address,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof CheckoutError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("create-preference error", error);
    const message =
      error instanceof Error && error.message.includes("MERCADOPAGO_ACCESS_TOKEN")
        ? error.message
        : "Não foi possível iniciar o pagamento. Tente novamente.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
