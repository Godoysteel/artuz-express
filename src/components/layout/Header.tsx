import Link from "next/link";
import { ShoppingCart, User } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { SearchBar } from "@/components/layout/SearchBar";
import { getCartSummary } from "@/lib/cart/cart-service";

const NAV_LINKS = [
  { href: "/categorias/cartoes-de-visita", label: "Cartões de Visita" },
  { href: "/categorias/banners-e-lonas", label: "Banners e Lonas" },
  { href: "/categorias/adesivo-dtf", label: "Adesivo DTF" },
  { href: "/categorias/brindes-promocionais", label: "Brindes Promocionais" },
];

export async function Header() {
  const { itemCount } = await getCartSummary();

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800 bg-ink text-white">
      <Container className="flex h-16 items-center gap-6">
        <Link href="/" className="flex shrink-0 items-center gap-1 text-xl font-bold tracking-tight">
          <span className="bg-gradient-to-r from-brand-light to-accent bg-clip-text text-transparent">
            Artuz
          </span>
          <span className="text-white">Express</span>
        </Link>

        <div className="hidden flex-1 md:block">
          <SearchBar />
        </div>

        <div className="ml-auto flex items-center gap-4">
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
              <span className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-accent text-[11px] font-bold text-ink">
                {itemCount}
              </span>
            )}
          </Link>
        </div>
      </Container>

      <div className="border-t border-white/10 bg-ink-soft">
        <Container className="flex h-11 items-center gap-6 overflow-x-auto text-sm">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="shrink-0 text-slate-200 transition hover:text-accent"
            >
              {link.label}
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
