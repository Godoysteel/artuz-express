import { Container } from "@/components/ui/Container";
import { HeroCarousel } from "@/components/home/HeroCarousel";
import { CategoryGrid } from "@/components/home/CategoryGrid";
import { getCategoriesWithStartingPrice } from "@/lib/catalog";

export default async function HomePage() {
  const categories = await getCategoriesWithStartingPrice();

  return (
    <Container className="py-8">
      <HeroCarousel />

      <section className="mt-12">
        <div className="flex items-baseline justify-between">
          <h2 className="text-2xl font-bold text-ink">Categorias</h2>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          Tudo o que a sua empresa precisa, com preços transparentes.
        </p>
        <div className="mt-6">
          <CategoryGrid categories={categories} />
        </div>
      </section>
    </Container>
  );
}
