"use client";

import type { ReactNode } from "react";
import { trackEvent } from "@/lib/analytics/client";

export function TrackedWhatsAppLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Fale com a Telma, designer, no WhatsApp"
      title="Fale com a Telma, nossa designer, no WhatsApp"
      className={className}
      onClick={() => trackEvent({ eventType: "whatsapp_click" })}
    >
      {children}
    </a>
  );
}

