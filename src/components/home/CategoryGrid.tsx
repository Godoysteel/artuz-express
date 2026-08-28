import Image from "next/image";
import Link from "next/link";
import type { CategoryCard } from "@/lib/catalog";
import { PriceFrom } from "@/components/ui/PriceFrom";

export function CategoryGrid({ categories }: { categories: CategoryCard[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {categories.map((category) => (
        <Link
          key={category.id}
          href={`/categorias/${category.slug}`}
          className="group overflow-hidden rounded-xl border border-slate-200 bg-white transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-brand/10"
        >
          <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
            {category.imageUrl && (
              <Image
                src={category.imageUrl}
                alt={category.name}
                fill
                sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                className="object-cover transition duration-300 group-hover:scale-105"
              />
            )}
          </div>
          <div className="p-4">
            <h3 className="font-semibold text-ink">{category.name}</h3>
            <div className="mt-1">
              <PriceFrom cents={category.minPriceCents} variantLabel={category.minVariantLabel} />
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
