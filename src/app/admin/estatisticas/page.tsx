import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { BarChart3, Eye, MessageCircle, MousePointerClick, ShoppingCart } from "lucide-react";
import { requireAdmin } from "@/lib/admin/auth";
import { Container } from "@/components/ui/Container";

type EventRow = {
  event_type: "page_view" | "product_click" | "product_view" | "add_to_cart" | "whatsapp_click";
  visitor_id: string;
  product_slug: string | null;
  product_name: string | null;
  created_at: string;
};

const periods = [7, 30, 90] as const;

function Metric({ label, value, icon: Icon }: { label: string; value: number; icon: typeof Eye }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{label}</p>
        <Icon className="size-5 text-brand" />
      </div>
      <p className="mt-2 text-3xl font-bold text-ink">{value.toLocaleString("pt-BR")}</p>
    </div>
  );
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ dias?: string }>;
}) {
  await requireAdmin();
  const requestedDays = Number((await searchParams).dias);
  const days = periods.includes(requestedDays as (typeof periods)[number]) ? requestedDays : 30;
  // O intervalo é calculado a cada requisição do painel administrativo.
  // eslint-disable-next-line react-hooks/purity
  const since = new Date(Date.now() - days * 86_400_000).toISOString();

  const service = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const { data, error } = await service
    .from("analytics_events")
    .select("event_type, visitor_id, product_slug, product_name, created_at")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(50_000);
  const events = (data ?? []) as EventRow[];

  const count = (type: EventRow["event_type"]) => events.filter((event) => event.event_type === type).length;
  const visitors = new Set(events.map((event) => event.visitor_id)).size;
  const products = new Map<string, { name: string; slug: string; clicks: number; views: number; carts: number }>();

  for (const event of events) {
    if (!event.product_slug) continue;
    const item = products.get(event.product_slug) ?? {
      name: event.product_name ?? event.product_slug,
      slug: event.product_slug,
      clicks: 0,
      views: 0,
      carts: 0,
    };
    if (event.event_type === "product_click") item.clicks++;
    if (event.event_type === "product_view") item.views++;
    if (event.event_type === "add_to_cart") item.carts++;
    products.set(event.product_slug, item);
  }

  const ranking = [...products.values()]
    .sort((a, b) => b.views + b.clicks - (a.views + a.clicks))
    .slice(0, 20);

  return (
    <Container className="py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="size-6 text-brand" />
            <h1 className="text-2xl font-bold text-ink">Estatísticas</h1>
          </div>
          <p className="mt-1 text-sm text-slate-500">Eventos registrados pelo site nos últimos {days} dias</p>
        </div>
        <div className="flex rounded-lg border border-slate-200 bg-white p-1 text-sm">
          {periods.map((period) => (
            <Link
              key={period}
              href={`/admin/estatisticas?dias=${period}`}
              className={`rounded-md px-3 py-1.5 ${days === period ? "bg-ink text-white" : "text-slate-600 hover:bg-slate-50"}`}
            >
              {period} dias
            </Link>
          ))}
        </div>
      </div>

      {error ? (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
          A tabela de estatísticas ainda não está disponível. Aplique a migração 0013 no Supabase para iniciar a coleta.
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <Metric label="Visitantes únicos" value={visitors} icon={Eye} />
            <Metric label="Páginas visitadas" value={count("page_view")} icon={Eye} />
            <Metric label="Cliques em produtos" value={count("product_click")} icon={MousePointerClick} />
            <Metric label="Adições ao carrinho" value={count("add_to_cart")} icon={ShoppingCart} />
            <Metric label="Cliques no WhatsApp" value={count("whatsapp_click")} icon={MessageCircle} />
          </div>

          <div className="mt-8 overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="font-semibold text-ink">Produtos mais acessados</h2>
            </div>
            {ranking.length === 0 ? (
              <p className="p-6 text-sm text-slate-500">Nenhum evento registrado neste período.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[650px] text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
                    <tr><th className="px-5 py-3">Produto</th><th className="px-5 py-3">Cliques</th><th className="px-5 py-3">Visualizações</th><th className="px-5 py-3">Carrinhos</th><th className="px-5 py-3">Conversão</th></tr>
                  </thead>
                  <tbody>
                    {ranking.map((product) => (
                      <tr key={product.slug} className="border-t border-slate-100">
                        <td className="px-5 py-3"><Link className="font-medium text-ink hover:text-brand hover:underline" href={`/produto/${product.slug}`}>{product.name}</Link></td>
                        <td className="px-5 py-3 text-slate-600">{product.clicks}</td>
                        <td className="px-5 py-3 text-slate-600">{product.views}</td>
                        <td className="px-5 py-3 text-slate-600">{product.carts}</td>
                        <td className="px-5 py-3 font-medium text-ink">{product.views ? `${((product.carts / product.views) * 100).toFixed(1)}%` : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          {events.length === 50_000 && <p className="mt-3 text-xs text-amber-700">O período atingiu o limite de 50.000 eventos exibidos.</p>}
        </>
      )}
    </Container>
  );
}
