"use client";

export type AnalyticsEventType =
  | "page_view"
  | "product_click"
  | "product_view"
  | "add_to_cart"
  | "whatsapp_click";

type AnalyticsPayload = {
  eventType: AnalyticsEventType;
  productId?: string;
  productSlug?: string;
  productName?: string;
  metadata?: Record<string, string | number | boolean | null>;
};

const VISITOR_KEY = "artuz_analytics_visitor";

function getVisitorId() {
  let id = localStorage.getItem(VISITOR_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(VISITOR_KEY, id);
  }
  return id;
}

export function trackEvent(payload: AnalyticsPayload) {
  try {
    const body = JSON.stringify({
      ...payload,
      visitorId: getVisitorId(),
      path: window.location.pathname,
      referrer: document.referrer || undefined,
    });

    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/analytics/events", new Blob([body], { type: "application/json" }));
      return;
    }

    void fetch("/api/analytics/events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      keepalive: true,
    });
  } catch {
    // Estatísticas nunca devem interromper a navegação ou a compra.
  }
}
