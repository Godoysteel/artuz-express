import Image from "next/image";
import Link from "next/link";
import type { ProductCard as ProductCardType } from "@/lib/catalog";
import { PriceFrom } from "@/components/ui/PriceFrom";

export function ProductCard({ product }: { product: ProductCardType }) {
  return (
    <Link
      href={`/produto/${product.slug}`}
      className="group overflow-hidden rounded-xl border border-slate-200 bg-white transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-brand/10"
    >
      <div className="relative aspect-square w-full overflow-hidden bg-slate-100">
        {product.imageUrl && (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            className="object-cover transition duration-300 group-hover:scale-105"
          />
        )}
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-ink">{product.name}</h3>
        <div className="mt-1">
          <PriceFrom cents={product.minPriceCents} variantLabel={product.minVariantLabel} />
        </div>
      </div>
    </Link>
  );
}
