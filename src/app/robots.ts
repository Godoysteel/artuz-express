import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://artuzexpress.com.br";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/conta", "/pedidos", "/checkout", "/carrinho", "/api"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
