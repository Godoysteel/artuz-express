import { NextResponse } from "next/server";
import { getPaymentClient } from "@/lib/mercadopago/client";
import { createServiceClient } from "@/lib/supabase/service";

function mapMpStatusToOrderStatus(mpStatus: string | undefined): string {
  switch (mpStatus) {
    case "approved":
      return "paid";
    case "rejected":
      return "payment_failed";
    case "cancelled":
    case "refunded":
    case "charged_back":
      return "cancelled";
    case "pending":
    case "in_process":
    default:
      return "pending";
  }
}

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const topic = url.searchParams.get("type") ?? url.searchParams.get("topic");
    let paymentId = url.searchParams.get("data.id") ?? url.searchParams.get("id");

    const body = await request.json().catch(() => null);
    if (!paymentId && body?.data?.id) paymentId = String(body.data.id);

    const isPaymentEvent = !topic || topic === "payment";
    if (!isPaymentEvent || !paymentId) {
      return NextResponse.json({ received: true });
    }

    const paymentClient = getPaymentClient();
    const payment = await paymentClient.get({ id: paymentId });

    const orderId = payment.external_reference;
    if (!orderId) {
      return NextResponse.json({ received: true });
    }

    const service = createServiceClient();
    await service
      .from("orders")
      .update({
        mp_payment_id: String(payment.id),
        mp_payment_status: payment.status ?? null,
        status: mapMpStatusToOrderStatus(payment.status),
      })
      .eq("id", orderId);

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("mercadopago webhook error", error);
    // Responde 200 mesmo em erro para evitar reenvio agressivo do MP durante
    // o desenvolvimento; o erro fica registrado no log do servidor.
    return NextResponse.json({ received: true });
  }
}
