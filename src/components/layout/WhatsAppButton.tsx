import { whatsappLink } from "@/lib/whatsapp";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";

export function WhatsAppButton() {
  return (
    <a
      href={whatsappLink("Olá! Preciso de ajuda com um pedido na Artuz Express.")}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Falar no WhatsApp"
      className="fixed bottom-24 right-5 z-40 flex size-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg shadow-black/20 transition hover:brightness-105 hover:scale-105"
    >
      <WhatsAppIcon className="size-8" />
    </a>
  );
}
