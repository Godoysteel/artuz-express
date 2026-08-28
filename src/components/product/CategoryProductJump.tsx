"use client";

import { useRouter } from "next/navigation";
import type { CategoryCard, ProductCard } from "@/lib/catalog";

const selectClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20";

export function CategoryProductJump({
  categories,
  products,
  currentCategorySlug,
  currentProductSlug,
}: {
  categories: CategoryCard[];
  products: ProductCard[];
  currentCategorySlug: string;
  currentProductSlug: string;
}) {
  const router = useRouter();

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div>
        <label className="text-xs font-medium text-slate-500">Categoria</label>
        <select
          className={selectClass}
          value={currentCategorySlug}
          onChange={(event) => router.push(`/categorias/${event.target.value}`)}
        >
          {categories.map((category) => (
            <option key={category.slug} value={category.slug}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-xs font-medium text-slate-500">Produto</label>
        <select
          className={selectClass}
          value={currentProductSlug}
          onChange={(event) => router.push(`/produto/${event.target.value}`)}
        >
          {products.map((product) => (
            <option key={product.slug} value={product.slug}>
              {product.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
