import { NextResponse } from "next/server";
import { z } from "zod";
import { findActiveCartId } from "@/lib/cart/cart-service";
import { getShippingOptionsForCart } from "@/lib/melhor-envio/quote";

const bodySchema = z.object({ cep: z.string().min(8) });

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "CEP inválido." }, { status: 400 });
  }

  const cartId = await findActiveCartId();
  if (!cartId) {
    return NextResponse.json({ error: "Carrinho não encontrado." }, { status: 400 });
  }

  try {
    const options = await getShippingOptionsForCart(cartId, parsed.data.cep);
    return NextResponse.json({ options });
  } catch (error) {
    console.error("shipping-quote error", error);
    return NextResponse.json({ error: "Não foi possível calcular o frete agora." }, { status: 500 });
  }
}
