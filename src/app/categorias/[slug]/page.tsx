import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { ProductCard } from "@/components/product/ProductCard";
import { FamilyCard } from "@/components/product/FamilyCard";
import { getCategoryBySlug, getCategoryTiles } from "@/lib/catalog";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://artuzexpress.com.br";

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

  const tiles = await getCategoryTiles(slug);

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
      {
        "@type": "ListItem",
        position: 2,
        name: category.name,
        item: `${siteUrl}/categorias/${category.slug}`,
      },
    ],
  };

  return (
    <Container className="py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <nav className="text-sm text-slate-500">
        <Link href="/" className="hover:text-brand">
          Home
        </Link>
        <span className="mx-2">/</span>
        <span className="text-ink">{category.name}</span>
      </nav>

      <h1 className="mt-3 text-2xl font-bold text-ink">{category.name}</h1>
      {category.description && (
        <p className="mt-1 max-w-2xl text-sm text-slate-500">{category.description}</p>
      )}

      {tiles.length === 0 ? (
        <p className="mt-10 text-slate-500">Nenhum produto encontrado nesta categoria.</p>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {tiles.map((tile) =>
            tile.kind === "product" ? (
              <ProductCard key={tile.product.id} product={tile.product} />
            ) : (
              <FamilyCard key={tile.family.slug} categorySlug={category.slug} family={tile.family} />
            ),
          )}
        </div>
      )}
    </Container>
  );
}
