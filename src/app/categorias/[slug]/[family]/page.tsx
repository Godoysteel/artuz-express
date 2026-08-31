import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { ProductCard } from "@/components/product/ProductCard";
import { getCategoryBySlug, getFamilyProducts } from "@/lib/catalog";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://artuzexpress.com.br";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; family: string }>;
}): Promise<Metadata> {
  const { slug, family: familySlug } = await params;
  const family = await getFamilyProducts(slug, familySlug);
  if (!family) return {};

  const description = `${family.familyName} personalizado sob demanda, com entrega rápida e pagamento online na Artuz Express.`;

  return {
    title: family.familyName,
    description,
    alternates: { canonical: `/categorias/${slug}/${familySlug}` },
    openGraph: { title: family.familyName, description, url: `/categorias/${slug}/${familySlug}` },
  };
}

export default async function FamilyPage({
  params,
}: {
  params: Promise<{ slug: string; family: string }>;
}) {
  const { slug, family: familySlug } = await params;
  const [category, family] = await Promise.all([getCategoryBySlug(slug), getFamilyProducts(slug, familySlug)]);
  if (!category || !family) notFound();

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
      { "@type": "ListItem", position: 2, name: category.name, item: `${siteUrl}/categorias/${category.slug}` },
      {
        "@type": "ListItem",
        position: 3,
        name: family.familyName,
        item: `${siteUrl}/categorias/${category.slug}/${familySlug}`,
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
        <Link href={`/categorias/${category.slug}`} className="hover:text-brand">
          {category.name}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-ink">{family.familyName}</span>
      </nav>

      <h1 className="mt-3 text-2xl font-bold text-ink">{family.familyName}</h1>

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {family.products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </Container>
  );
}
