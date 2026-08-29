import { formatCents } from "@/lib/format";

export function PriceFrom({ cents }: { cents: number | null }) {
  if (cents == null) {
    return <p className="text-sm text-slate-400">Preço sob consulta</p>;
  }

  return (
    <p className="text-sm text-slate-500">
      A partir de{" "}
      <span className="text-base font-bold text-brand-dark">{formatCents(cents)}</span>
    </p>
  );
}
