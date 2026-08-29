import Link from "next/link";
import Image from "next/image";
import { Container } from "@/components/ui/Container";
import { WHATSAPP_DISPLAY, whatsappLink } from "@/lib/whatsapp";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";

export function Footer() {
  return (
    <footer className="mt-16 border-t border-slate-800 bg-ink text-slate-300">
      <Container className="grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-end gap-2">
            <Image src="/logo-artuz.png" alt="Artuz" width={126} height={36} className="h-8 w-auto" />
            <span className="pb-0.5 text-lg font-bold bg-gradient-to-r from-brand-light to-accent bg-clip-text text-transparent">
              Express
            </span>
          </div>
          <p className="mt-3 text-sm text-slate-400">
            Impressão rápida e moderna para o seu negócio: cartões, banners,
            adesivos, brindes e muito mais.
          </p>
          <a
            href={whatsappLink("Olá! Preciso de ajuda com um pedido na Artuz Express.")}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#25D366]/10 px-4 py-2 text-sm font-semibold text-[#25D366] transition hover:bg-[#25D366]/20"
          >
            <WhatsAppIcon className="size-4" />
            {WHATSAPP_DISPLAY}
          </a>
        </div>

        <div>
          <p className="text-sm font-semibold text-white">Institucional</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link href="/politicas/termos" className="hover:text-accent">
                Termos de uso
              </Link>
            </li>
            <li>
              <Link href="/politicas/garantia" className="hover:text-accent">
                Garantia
              </Link>
            </li>
            <li>
              <Link href="/politicas/privacidade" className="hover:text-accent">
                Privacidade
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="text-sm font-semibold text-white">Minha conta</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link href="/pedidos" className="hover:text-accent">
                Meus pedidos
              </Link>
            </li>
            <li>
              <Link href="/conta" className="hover:text-accent">
                Meus dados
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="text-sm font-semibold text-white">Pagamento</p>
          <p className="mt-3 text-sm text-slate-400">
            PIX, boleto e cartão via Mercado Pago.
          </p>
        </div>
      </Container>

      <div className="border-t border-white/10 py-4 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} Artuz Express. Todos os direitos reservados.
      </div>
    </footer>
  );
}
