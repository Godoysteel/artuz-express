"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics/client";

export function ProductViewTracker({
  product,
}: {
  product: { id: string; slug: string; name: string };
}) {
  useEffect(() => {
    trackEvent({
      eventType: "product_view",
      productId: product.id,
      productSlug: product.slug,
      productName: product.name,
    });
  }, [product.id, product.name, product.slug]);

  return null;
}

