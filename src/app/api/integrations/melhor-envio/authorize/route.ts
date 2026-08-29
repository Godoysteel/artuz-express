import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireAdmin } from "@/lib/admin/auth";
import { getAuthorizeUrl } from "@/lib/melhor-envio/client";

const STATE_COOKIE = "melhor_envio_oauth_state";

export async function GET() {
  await requireAdmin();

  const state = crypto.randomUUID();
  const cookieStore = await cookies();
  cookieStore.set(STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });

  return NextResponse.redirect(getAuthorizeUrl(state));
}
