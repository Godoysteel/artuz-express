"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { trackEvent } from "@/lib/analytics/client";

export function TrackedProductLink({
  href,
  product,
  className,
  children,
}: {
  href: string;
  product: { id: string; slug: string; name: string };
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={className}
      onClick={() =>
        trackEvent({
          eventType: "product_click",
          productId: product.id,
          productSlug: product.slug,
          productName: product.name,
        })
      }
    >
      {children}
    </Link>
  );
}

