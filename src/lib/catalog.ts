import "server-only";
import { createClient } from "@/lib/supabase/server";

export type CategoryCard = {
  id: string;
  slug: string;
  name: string;
  imageUrl: string | null;
  minPriceCents: number | null;
  minVariantLabel: string | null;
};

export async function getCategoriesWithStartingPrice(): Promise<CategoryCard[]> {
  const supabase = await createClient();
  const [{ data: categories, error }, { data: prices }] = await Promise.all([
    supabase
      .from("categories")
      .select("id, slug, name, image_url, sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    supabase.from("category_starting_prices").select("category_id, min_price_cents, min_variant_label"),
  ]);

  if (error || !categories) return [];

  const priceByCategory = new Map((prices ?? []).map((p) => [p.category_id, p]));

  return categories.map((c) => {
    const price = priceByCategory.get(c.id);
    return {
      id: c.id,
      slug: c.slug,
      name: c.name,
      imageUrl: c.image_url,
      minPriceCents: price?.min_price_cents ?? null,
      minVariantLabel: price?.min_variant_label ?? null,
    };
  });
}

export async function getCategoryBySlug(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("categories")
    .select("id, slug, name, description")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();
  return data;
}

export type ProductCard = {
  id: string;
  slug: string;
  name: string;
  imageUrl: string | null;
  minPriceCents: number | null;
  minVariantLabel: string | null;
};

export async function getProductsByCategorySlug(slug: string): Promise<ProductCard[]> {
  const supabase = await createClient();
  const { data: products, error } = await supabase
    .from("products")
    .select(
      `id, slug, name, sort_order, category_id,
       categories!inner ( slug ),
       product_images ( url, sort_order )`,
    )
    .eq("is_active", true)
    .eq("categories.slug", slug)
    .order("sort_order", { ascending: true });

  if (error || !products) return [];

  const { data: prices } = await supabase
    .from("product_starting_prices")
    .select("product_id, min_price_cents, min_variant_label")
    .in("product_id", products.map((p) => p.id));

  const priceByProduct = new Map((prices ?? []).map((p) => [p.product_id, p]));

  return products.map((p) => {
    const images = [...(p.product_images ?? [])].sort((a, b) => a.sort_order - b.sort_order);
    const price = priceByProduct.get(p.id);
    return {
      id: p.id,
      slug: p.slug,
      name: p.name,
      imageUrl: images[0]?.url ?? null,
      minPriceCents: price?.min_price_cents ?? null,
      minVariantLabel: price?.min_variant_label ?? null,
    };
  });
}

export type ProductDetail = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category: { slug: string; name: string };
  images: { url: string; alt: string | null }[];
  variants: {
    id: string;
    label: string;
    quantity: number;
    priceCents: number;
    isDefault: boolean;
  }[];
};

export async function getProductBySlug(slug: string): Promise<ProductDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select(
      `id, slug, name, description,
       categories ( slug, name ),
       product_images ( url, alt, sort_order ),
       product_variants ( id, label, quantity, price_cents, is_default, is_active, sort_order )`,
    )
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (error || !data || !data.categories) return null;

  const images = [...(data.product_images ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  const variants = (data.product_variants ?? [])
    .filter((v) => v.is_active)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((v) => ({
      id: v.id,
      label: v.label,
      quantity: v.quantity,
      priceCents: v.price_cents,
      isDefault: v.is_default,
    }));

  return {
    id: data.id,
    slug: data.slug,
    name: data.name,
    description: data.description,
    category: { slug: data.categories.slug, name: data.categories.name },
    images: images.map((i) => ({ url: i.url, alt: i.alt })),
    variants,
  };
}
