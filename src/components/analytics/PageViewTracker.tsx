"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics/client";

export function PageViewTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname.startsWith("/admin")) trackEvent({ eventType: "page_view" });
  }, [pathname]);

  return null;
}

