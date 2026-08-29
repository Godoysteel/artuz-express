import { Container } from "@/components/ui/Container";
import { ProductCard } from "@/components/product/ProductCard";
import { createClient } from "@/lib/supabase/server";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  const supabase = await createClient();
  const { data: products } = query
    ? await supabase
        .from("products")
        .select(`id, slug, name, product_images ( url, sort_order )`)
        .eq("is_active", true)
        .ilike("name", `%${query}%`)
    : { data: [] };

  const { data: prices } = products?.length
    ? await supabase
        .from("product_starting_prices")
        .select("product_id, min_price_cents")
        .in("product_id", products.map((p) => p.id))
    : { data: [] };
  const priceByProduct = new Map((prices ?? []).map((p) => [p.product_id, p]));

  const results = (products ?? []).map((p) => {
    const images = [...(p.product_images ?? [])].sort((a, b) => a.sort_order - b.sort_order);
    const price = priceByProduct.get(p.id);
    return {
      id: p.id,
      slug: p.slug,
      name: p.name,
      imageUrl: images[0]?.url ?? null,
      minPriceCents: price?.min_price_cents ?? null,
    };
  });

  return (
    <Container className="py-8">
      <h1 className="text-2xl font-bold text-ink">
        {query ? `Resultados para "${query}"` : "Busca"}
      </h1>

      {query && results.length === 0 && (
        <p className="mt-10 text-slate-500">Nenhum produto encontrado.</p>
      )}

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {results.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </Container>
  );
}
