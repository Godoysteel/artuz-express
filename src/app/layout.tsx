import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { CookieNotice } from "@/components/layout/CookieNotice";
import { WhatsAppButton } from "@/components/layout/WhatsAppButton";
import { WHATSAPP_NUMBER } from "@/lib/whatsapp";
import { CONTACT_EMAIL } from "@/lib/contact";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://artuzexpress.com.br";
const defaultTitle = "Artuz Express | Gráfica Online";
const defaultDescription =
  "Cartões de visita, banners, adesivos, brindes e muito mais. Impressão rápida com pagamento online.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: defaultTitle, template: "%s | Artuz Express" },
  description: defaultDescription,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "Artuz Express",
    title: defaultTitle,
    description: defaultDescription,
    url: siteUrl,
    images: [{ url: "/logo-artuz.png", width: 1920, height: 580, alt: "Artuz Express" }],
  },
  twitter: {
    card: "summary_large_image",
    title: defaultTitle,
    description: defaultDescription,
    images: ["/logo-artuz.png"],
  },
};

const localBusinessJsonLd = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: "Artuz Express",
  image: `${siteUrl}/logo-artuz.png`,
  url: siteUrl,
  telephone: `+${WHATSAPP_NUMBER}`,
  email: CONTACT_EMAIL,
  // Área de atendimento, não loja física — empresa 100% online, entrega em todo o Brasil.
  areaServed: { "@type": "Country", name: "Brasil" },
  priceRange: "$$",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-paper text-ink">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessJsonLd) }}
        />
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
        <WhatsAppButton />
        <CookieNotice />
        <Script
          type="module"
          strategy="afterInteractive"
          src="https://static.cloudflareinsights.com/beacon.min.js"
          data-cf-beacon='{"token": "ddac5e37de46479f84a1b0403e6a8880"}'
        />
      </body>
    </html>
  );
}
