export const STATUS_LABEL: Record<string, string> = {
  pending: "Aguardando pagamento",
  paid: "Pago",
  processing: "Em produção",
  shipped: "Enviado",
  completed: "Concluído",
  cancelled: "Cancelado",
  payment_failed: "Pagamento recusado",
};

/** Status que o admin pode escolher manualmente após o pagamento ser confirmado. */
export const MANAGEABLE_STATUSES = ["paid", "processing", "shipped", "completed", "cancelled"] as const;
