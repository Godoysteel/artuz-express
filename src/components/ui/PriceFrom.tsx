import { formatCents } from "@/lib/format";

export function PriceFrom({
  cents,
  variantLabel,
}: {
  cents: number | null;
  variantLabel?: string | null;
}) {
  if (cents == null) {
    return <p className="text-sm text-slate-400">Preço sob consulta</p>;
  }

  return (
    <p className="text-sm text-slate-500">
      A partir de{" "}
      <span className="text-base font-bold text-brand-dark">{formatCents(cents)}</span>
      {variantLabel && <span className="text-slate-400"> ({variantLabel})</span>}
    </p>
  );
}
