import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireAdmin } from "@/lib/admin/auth";
import { exchangeCodeForToken } from "@/lib/melhor-envio/client";

const STATE_COOKIE = "melhor_envio_oauth_state";

export async function GET(request: Request) {
  await requireAdmin();

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const cookieStore = await cookies();
  const expectedState = cookieStore.get(STATE_COOKIE)?.value;
  cookieStore.delete(STATE_COOKIE);

  if (!code || !state || state !== expectedState) {
    return NextResponse.redirect(new URL("/admin/pedidos?melhor_envio=erro", request.url));
  }

  try {
    await exchangeCodeForToken(code);
    return NextResponse.redirect(new URL("/admin/pedidos?melhor_envio=conectado", request.url));
  } catch (error) {
    console.error("melhor envio oauth callback error", error);
    return NextResponse.redirect(new URL("/admin/pedidos?melhor_envio=erro", request.url));
  }
}
