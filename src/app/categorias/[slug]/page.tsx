import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { ProductCard } from "@/components/product/ProductCard";
import { getCategoryBySlug, getProductsByCategorySlug } from "@/lib/catalog";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) return {};

  const description =
    category.description ??
    `${category.name} personalizados sob demanda, com entrega rápida e pagamento online na Artuz Express.`;

  return {
    title: category.name,
    description,
    alternates: { canonical: `/categorias/${category.slug}` },
    openGraph: { title: category.name, description, url: `/categorias/${category.slug}` },
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) notFound();

  const products = await getProductsByCategorySlug(slug);

  return (
    <Container className="py-8">
      <h1 className="text-2xl font-bold text-ink">{category.name}</h1>
      {category.description && (
        <p className="mt-1 max-w-2xl text-sm text-slate-500">{category.description}</p>
      )}

      {products.length === 0 ? (
        <p className="mt-10 text-slate-500">Nenhum produto encontrado nesta categoria.</p>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </Container>
  );
}
