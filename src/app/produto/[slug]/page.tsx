import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { AddToCartForm } from "@/components/product/AddToCartForm";
import { CategoryProductJump } from "@/components/product/CategoryProductJump";
import { ImageGallery } from "@/components/product/ImageGallery";
import {
  getCategoriesWithStartingPrice,
  getProductBySlug,
  getProductsByCategorySlug,
} from "@/lib/catalog";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const [categories, siblingProducts] = await Promise.all([
    getCategoriesWithStartingPrice(),
    getProductsByCategorySlug(product.category.slug),
  ]);

  return (
    <Container className="py-8">
      <nav className="text-sm text-slate-500">
        <Link href="/" className="hover:text-brand">
          Home
        </Link>
        <span className="mx-2">/</span>
        <Link href={`/categorias/${product.category.slug}`} className="hover:text-brand">
          {product.category.name}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-ink">{product.name}</span>
      </nav>

      <div className="mt-6 grid gap-10 lg:grid-cols-2">
        <ImageGallery images={product.images} productName={product.name} />

        <div>
          <h1 className="text-3xl font-bold text-ink">{product.name}</h1>
          {product.description && (
            <p className="mt-3 text-slate-600">{product.description}</p>
          )}

          <div className="mt-6 border-t border-slate-200 pt-6">
            <CategoryProductJump
              categories={categories}
              products={siblingProducts}
              currentCategorySlug={product.category.slug}
              currentProductSlug={product.slug}
            />
          </div>

          <div className="mt-6 border-t border-slate-200 pt-6">
            <AddToCartForm variants={product.variants} addons={product.addons} />
          </div>
        </div>
      </div>
    </Container>
  );
}
