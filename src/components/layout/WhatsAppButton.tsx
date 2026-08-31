import Image from "next/image";
import { whatsappLink } from "@/lib/whatsapp";

export function WhatsAppButton() {
  return (
    <a
      href={whatsappLink("Olá, Telma! Preciso de ajuda com um pedido na Artuz Express.")}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Fale com a Telma, designer, no WhatsApp"
      title="Fale com a Telma, nossa designer, no WhatsApp"
      className="fixed bottom-24 right-5 z-40 block size-18 rounded-full border-2 border-white bg-white shadow-lg shadow-black/20 transition hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand motion-reduce:transition-none sm:size-20"
    >
      <span className="block size-full overflow-hidden rounded-full">
        <Image
          src="/atendimento/avatar-artuz.png"
          alt=""
          width={160}
          height={160}
          sizes="(min-width: 640px) 120px, 108px"
          className="size-full origin-[50%_30%] scale-150 object-cover"
        />
      </span>
    </a>
  );
}
