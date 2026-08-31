import Link from "next/link";
import Image from "next/image";
import { BarChart3, ShoppingCart, User } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { SearchBar } from "@/components/layout/SearchBar";
import { getCartSummary } from "@/lib/cart/cart-service";
import { isAdmin } from "@/lib/admin/auth";
import { getPendingOrdersCount } from "@/lib/admin/queries";
import { getAllCategoryLinks } from "@/lib/catalog";

export async function Header() {
  const [{ itemCount }, admin, categoryLinks] = await Promise.all([
    getCartSummary(),
    isAdmin(),
    getAllCategoryLinks(),
  ]);
  const pendingOrdersCount = admin ? await getPendingOrdersCount() : 0;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800 bg-ink text-white">
      <Container className="flex h-16 items-center gap-6">
        <Link href="/" className="flex shrink-0 items-end gap-2">
          <Image
            src="/logo-artuz.png"
            alt="Artuz"
            width={126}
            height={36}
            className="h-8 w-auto sm:h-9"
            priority
          />
          <span className="pb-0.5 text-xl font-bold tracking-tight bg-gradient-to-r from-brand-light to-accent bg-clip-text text-transparent">
            Express
          </span>
        </Link>

        <div className="hidden flex-1 md:block">
          <SearchBar />
        </div>

        <div className="ml-auto flex items-center gap-4">
          {admin && (
            <div className="hidden items-center gap-3 sm:flex">
              <Link href="/admin/estatisticas" title="Estatísticas" className="text-slate-200 transition hover:text-white">
                <BarChart3 className="size-5" />
              </Link>
              <Link
                href="/admin/pedidos"
                className="relative text-sm text-slate-200 transition hover:text-white"
              >
                Pedidos
                {pendingOrdersCount > 0 && (
                  <span className="absolute -right-3 -top-2 flex size-5 items-center justify-center rounded-full bg-red-500 text-[11px] font-bold text-white">
                    {pendingOrdersCount}
                  </span>
                )}
              </Link>
            </div>
          )}
          <Link
            href="/conta"
            className="hidden items-center gap-1.5 text-sm text-slate-200 transition hover:text-white sm:flex"
          >
            <User className="size-5" />
            Conta
          </Link>
          <Link
            href="/carrinho"
            className="relative flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-2 text-sm font-medium text-white transition hover:bg-white/10"
          >
            <ShoppingCart className="size-5" />
            <span className="hidden sm:inline">Carrinho</span>
            {itemCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-accent text-[11px] font-bold text-white">
                {itemCount}
              </span>
            )}
          </Link>
        </div>
      </Container>

      <div className="border-t border-white/10 bg-ink-soft">
        <Container className="flex h-11 items-center gap-6 overflow-x-auto text-sm">
          {categoryLinks.map((category) => (
            <Link
              key={category.slug}
              href={`/categorias/${category.slug}`}
              className="shrink-0 text-slate-200 transition hover:text-accent"
            >
              {category.name}
            </Link>
          ))}
        </Container>
      </div>

      <div className="px-4 pb-3 pt-1 md:hidden">
        <SearchBar />
      </div>
    </header>
  );
}
