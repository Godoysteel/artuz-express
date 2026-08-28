import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { AddToCartForm } from "@/components/product/AddToCartForm";
import { getProductBySlug } from "@/lib/catalog";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const cover = product.images[0];

  return (
    <Container className="py-8">
      <nav className="text-sm text-slate-500">
        <Link href={`/categorias/${product.category.slug}`} className="hover:text-brand">
          {product.category.name}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-ink">{product.name}</span>
      </nav>

      <div className="mt-6 grid gap-10 lg:grid-cols-2">
        <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-slate-100">
          {cover && (
            <Image
              src={cover.url}
              alt={cover.alt ?? product.name}
              fill
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-cover"
              priority
            />
          )}
        </div>

        <div>
          <h1 className="text-3xl font-bold text-ink">{product.name}</h1>
          {product.description && (
            <p className="mt-3 text-slate-600">{product.description}</p>
          )}

          <div className="mt-8 border-t border-slate-200 pt-6">
            <AddToCartForm variants={product.variants} />
          </div>
        </div>
      </div>
    </Container>
  );
}
