import "server-only";
import { getCatalogProductImage } from "@/lib/product/catalog-images";
import { createClient } from "@/lib/supabase/server";
import type { AddonInfo, AttributeVariant } from "@/lib/product/attributes";

export type CategoryCard = {
  id: string;
  slug: string;
  name: string;
  imageUrl: string | null;
  minPriceCents: number | null;
};

export async function getCategoriesWithStartingPrice(): Promise<CategoryCard[]> {
  const supabase = await createClient();
  const [{ data: categories, error }, { data: prices }] = await Promise.all([
    supabase
      .from("categories")
      .select("id, slug, name, image_url, sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    supabase.from("category_starting_prices").select("category_id, min_price_cents"),
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
    };
  });
}

export async function getAllCategoryLinks(): Promise<{ slug: string; name: string }[]> {
  const supabase = await createClient();
  const { data: categories, error } = await supabase
    .from("categories")
    .select("slug, name")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error || !categories) return [];
  return categories;
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
    .select("product_id, min_price_cents")
    .in("product_id", products.map((p) => p.id));

  const priceByProduct = new Map((prices ?? []).map((p) => [p.product_id, p]));

  return products.map((p) => {
    const images = [...(p.product_images ?? [])].sort((a, b) => a.sort_order - b.sort_order);
    const price = priceByProduct.get(p.id);
    return {
      id: p.id,
      slug: p.slug,
      name: p.name,
      imageUrl: getCatalogProductImage(p.slug) ?? images[0]?.url ?? null,
      minPriceCents: price?.min_price_cents ?? null,
    };
  });
}

export type FamilyCard = {
  slug: string;
  name: string;
  imageUrl: string | null;
  minPriceCents: number | null;
};

export type CategoryTile =
  | { kind: "product"; product: ProductCard }
  | { kind: "family"; family: FamilyCard };

/**
 * Alguns fornecedores agrupam vários produtos distintos (ex: modelos de
 * carimbo) sob uma "família" antes de chegar no produto de verdade — pra
 * bater visualmente com isso sem introduzir uma tabela de categorias
 * aninhada, `products.family_slug`/`family_name` agrupa vários produtos
 * num card só na grade da categoria, que leva pra uma sub-página
 * (`/categorias/[slug]/[family]`) listando os produtos daquela família.
 * Produtos sem família aparecem direto como sempre.
 */
export async function getCategoryTiles(slug: string): Promise<CategoryTile[]> {
  const supabase = await createClient();
  const { data: products, error } = await supabase
    .from("products")
    .select(
      `id, slug, name, sort_order, family_slug, family_name,
       categories!inner ( slug ),
       product_images ( url, sort_order )`,
    )
    .eq("is_active", true)
    .eq("categories.slug", slug)
    .order("sort_order", { ascending: true });

  if (error || !products) return [];

  const { data: prices } = await supabase
    .from("product_starting_prices")
    .select("product_id, min_price_cents")
    .in("product_id", products.map((p) => p.id));

  const priceByProduct = new Map((prices ?? []).map((p) => [p.product_id, p.min_price_cents]));

  const familyByslug = new Map<
    string,
    { name: string; sortOrder: number; imageUrl: string | null; minPriceCents: number | null }
  >();
  const productTiles: { tile: CategoryTile; sortOrder: number }[] = [];

  for (const p of products) {
    const images = [...(p.product_images ?? [])].sort((a, b) => a.sort_order - b.sort_order);
    const imageUrl = getCatalogProductImage(p.slug) ?? images[0]?.url ?? null;
    const minPriceCents = priceByProduct.get(p.id) ?? null;

    if (!p.family_slug || !p.family_name) {
      productTiles.push({
        tile: { kind: "product", product: { id: p.id, slug: p.slug, name: p.name, imageUrl, minPriceCents } },
        sortOrder: p.sort_order,
      });
      continue;
    }

    const existing = familyByslug.get(p.family_slug);
    if (!existing) {
      familyByslug.set(p.family_slug, { name: p.family_name, sortOrder: p.sort_order, imageUrl, minPriceCents });
    } else {
      existing.imageUrl ??= imageUrl;
      if (minPriceCents !== null && (existing.minPriceCents === null || minPriceCents < existing.minPriceCents)) {
        existing.minPriceCents = minPriceCents;
      }
      existing.sortOrder = Math.min(existing.sortOrder, p.sort_order);
    }
  }

  const familyTiles = [...familyByslug].map(([familySlug, family]) => ({
    tile: {
      kind: "family" as const,
      family: { slug: familySlug, name: family.name, imageUrl: family.imageUrl, minPriceCents: family.minPriceCents },
    },
    sortOrder: family.sortOrder,
  }));

  return [...productTiles, ...familyTiles].sort((a, b) => a.sortOrder - b.sortOrder).map((t) => t.tile);
}

export async function getFamilyProducts(
  categorySlug: string,
  familySlug: string,
): Promise<{ familyName: string; products: ProductCard[] } | null> {
  const supabase = await createClient();
  const { data: products, error } = await supabase
    .from("products")
    .select(
      `id, slug, name, sort_order, family_name,
       categories!inner ( slug ),
       product_images ( url, sort_order )`,
    )
    .eq("is_active", true)
    .eq("categories.slug", categorySlug)
    .eq("family_slug", familySlug)
    .order("sort_order", { ascending: true });

  if (error || !products || products.length === 0) return null;

  const { data: prices } = await supabase
    .from("product_starting_prices")
    .select("product_id, min_price_cents")
    .in("product_id", products.map((p) => p.id));

  const priceByProduct = new Map((prices ?? []).map((p) => [p.product_id, p.min_price_cents]));

  return {
    familyName: products[0].family_name!,
    products: products.map((p) => {
      const images = [...(p.product_images ?? [])].sort((a, b) => a.sort_order - b.sort_order);
      return {
        id: p.id,
        slug: p.slug,
        name: p.name,
        imageUrl: getCatalogProductImage(p.slug) ?? images[0]?.url ?? null,
        minPriceCents: priceByProduct.get(p.id) ?? null,
      };
    }),
  };
}

export type ProductDetail = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category: { slug: string; name: string };
  images: { url: string; alt: string | null }[];
  variants: AttributeVariant[];
  addons: AddonInfo[];
};

export async function getProductBySlug(slug: string): Promise<ProductDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select(
      `id, slug, name, description,
       categories ( slug, name ),
       product_images ( url, alt, sort_order ),
       product_variants ( id, label, quantity, price_cents, attributes, is_default, is_active, sort_order ),
       product_addons ( id, kind, label, price_cents, pricing_mode, extra_production_days, help_text, is_active, sort_order )`,
    )
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (error || !data || !data.categories) return null;

  const images = [...(data.product_images ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  const variants: AttributeVariant[] = (data.product_variants ?? [])
    .filter((v) => v.is_active)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((v) => ({
      id: v.id,
      label: v.label,
      quantity: v.quantity,
      priceCents: v.price_cents,
      isDefault: v.is_default,
      attributes: (v.attributes ?? {}) as Record<string, string>,
    }));

  const addons: AddonInfo[] = (data.product_addons ?? [])
    .filter((a) => a.is_active)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((a) => ({
      id: a.id,
      kind: a.kind as "addon" | "service",
      label: a.label,
      priceCents: a.price_cents,
      pricingMode: a.pricing_mode as "flat" | "per_unit",
      extraProductionDays: a.extra_production_days,
      helpText: a.help_text,
    }));

  return {
    id: data.id,
    slug: data.slug,
    name: data.name,
    description: data.description,
    category: { slug: data.categories.slug, name: data.categories.name },
    images: getCatalogProductImage(data.slug)
      ? [{ url: getCatalogProductImage(data.slug)!, alt: `${data.name} — imagem ilustrativa` }]
      : images.map((i) => ({ url: i.url, alt: i.alt })),
    variants,
    addons,
  };
}
