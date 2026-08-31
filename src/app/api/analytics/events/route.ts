import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

const eventSchema = z.object({
  eventType: z.enum(["page_view", "product_click", "product_view", "add_to_cart", "whatsapp_click"]),
  visitorId: z.uuid(),
  productId: z.uuid().optional(),
  productSlug: z.string().max(180).optional(),
  productName: z.string().max(240).optional(),
  path: z.string().max(500),
  referrer: z.string().max(1000).optional(),
  metadata: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
});

export async function POST(request: NextRequest) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 8_192) return NextResponse.json({ ok: false }, { status: 413 });

  const parsed = eventSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });

  const origin = request.headers.get("origin");
  if (origin && new URL(origin).host !== request.nextUrl.host) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  const data = parsed.data;
  const service = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const { error } = await service.from("analytics_events").insert({
    event_type: data.eventType,
    visitor_id: data.visitorId,
    product_id: data.productId ?? null,
    product_slug: data.productSlug ?? null,
    product_name: data.productName ?? null,
    path: data.path,
    referrer: data.referrer ?? null,
    metadata: data.metadata ?? {},
  });

  if (error) return NextResponse.json({ ok: false }, { status: 500 });
  return NextResponse.json({ ok: true }, { status: 202 });
}
