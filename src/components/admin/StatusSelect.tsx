"use client";

import { useTransition } from "react";
import { updateOrderStatusAction } from "@/lib/admin/actions";
import { STATUS_LABEL, MANAGEABLE_STATUSES } from "@/lib/orders/status";

export function StatusSelect({
  orderId,
  currentStatus,
}: {
  orderId: string;
  currentStatus: string;
}) {
  const [isPending, startTransition] = useTransition();

  function handleChange(status: string) {
    startTransition(async () => {
      await updateOrderStatusAction(orderId, status);
    });
  }

  return (
    <select
      value={currentStatus}
      disabled={isPending}
      onChange={(e) => handleChange(e.target.value)}
      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-ink disabled:opacity-60"
    >
      {MANAGEABLE_STATUSES.map((status) => (
        <option key={status} value={status}>
          {STATUS_LABEL[status]}
        </option>
      ))}
    </select>
  );
}
