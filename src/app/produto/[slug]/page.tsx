import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { AddToCartForm } from "@/components/product/AddToCartForm";
import { CategoryProductJump } from "@/components/product/CategoryProductJump";
import { ImageGallery } from "@/components/product/ImageGallery";
import {
  getCategoriesWithStartingPrice,
  getProductBySlug,
  getProductsByCategorySlug,
} from "@/lib/catalog";
import { categoryRequiresArtwork } from "@/lib/product/artwork";
import { formatCents } from "@/lib/format";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return {};

  const minPriceCents = Math.min(...product.variants.map((v) => v.priceCents));
  const description =
    product.description ??
    `${product.name} personalizado sob demanda, a partir de ${formatCents(minPriceCents)}. Peça agora na Artuz Express.`;
  const image = product.images[0]?.url;

  return {
    title: product.name,
    description,
    alternates: { canonical: `/produto/${product.slug}` },
    openGraph: {
      title: product.name,
      description,
      url: `/produto/${product.slug}`,
      images: image ? [{ url: image }] : undefined,
    },
  };
}

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

  const minPriceCents = Math.min(...product.variants.map((v) => v.priceCents));
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://artuzexpress.com.br";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description ?? undefined,
    image: product.images.map((i) => (i.url.startsWith("http") ? i.url : `${siteUrl}${i.url}`)),
    url: `${siteUrl}/produto/${product.slug}`,
    offers: {
      "@type": "Offer",
      priceCurrency: "BRL",
      price: (minPriceCents / 100).toFixed(2),
      availability: "https://schema.org/InStock",
      url: `${siteUrl}/produto/${product.slug}`,
    },
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
      {
        "@type": "ListItem",
        position: 2,
        name: product.category.name,
        item: `${siteUrl}/categorias/${product.category.slug}`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: product.name,
        item: `${siteUrl}/produto/${product.slug}`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
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
            <AddToCartForm
              variants={product.variants}
              addons={product.addons}
              requiresArtwork={categoryRequiresArtwork(product.category.slug)}
            />
          </div>
        </div>
      </div>
    </Container>
    </>
  );
}
