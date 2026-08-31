import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://artuzexpress.com.br";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient();

  const [{ data: categories }, { data: products }, { data: families }] = await Promise.all([
    supabase.from("categories").select("slug").eq("is_active", true),
    supabase.from("products").select("slug, created_at").eq("is_active", true),
    supabase
      .from("products")
      .select("family_slug, categories!inner ( slug )")
      .eq("is_active", true)
      .not("family_slug", "is", null),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: siteUrl, changeFrequency: "daily", priority: 1 },
    { url: `${siteUrl}/busca`, changeFrequency: "weekly", priority: 0.5 },
  ];

  const categoryRoutes: MetadataRoute.Sitemap = (categories ?? []).map((c) => ({
    url: `${siteUrl}/categorias/${c.slug}`,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const productRoutes: MetadataRoute.Sitemap = (products ?? []).map((p) => ({
    url: `${siteUrl}/produto/${p.slug}`,
    lastModified: p.created_at ? new Date(p.created_at) : undefined,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  const familyPairs = new Set(
    (families ?? []).map((f) => `${f.categories.slug}/${f.family_slug}`),
  );
  const familyRoutes: MetadataRoute.Sitemap = [...familyPairs].map((pair) => ({
    url: `${siteUrl}/categorias/${pair}`,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [...staticRoutes, ...categoryRoutes, ...familyRoutes, ...productRoutes];
}
