"use client";

import Image from "next/image";
import Link from "next/link";
import useEmblaCarousel from "embla-carousel-react";
import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const SLIDES = [
  {
    title: "Cartões de visita a partir de R$ 29,90",
    subtitle: "Papel couché 300g com verniz total. Entrega rápida.",
    href: "/categorias/cartoes-de-visita",
    cta: "Peça o seu",
    image: "/produtos/catalogo-atualcard/familia-cartoes-de-visita.png",
  },
  {
    title: "Material de campanha para 2026",
    subtitle: "Santinhos, adesivos e banners para sua campanha eleitoral.",
    href: "/categorias/eleicoes-2026",
    cta: "Ver eleições 2026",
    image: "/produtos/catalogo-atualcard/familia-santinho-eleitoral-9x5.png",
  },
  {
    title: "Banners e lonas de alta resistência",
    subtitle: "Acabamento em bastão e ilhós, prontos para instalar.",
    href: "/categorias/banners-e-lonas",
    cta: "Ver banners",
    image: "/produtos/catalogo-atualcard/familia-banners-e-lonas.png",
  },
];

export function HeroCarousel() {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [selected, setSelected] = useState(0);

  const scrollTo = useCallback((index: number) => emblaApi?.scrollTo(index), [emblaApi]);
  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setSelected(emblaApi.selectedScrollSnap());
    emblaApi.on("select", onSelect);
    onSelect();
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    const id = setInterval(() => emblaApi.scrollNext(), 6000);
    return () => clearInterval(id);
  }, [emblaApi]);

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-brand via-brand-dark to-ink">
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex">
          {SLIDES.map((slide, index) => (
            <div
              key={slide.title}
              className="relative min-w-0 flex-[0_0_100%] overflow-hidden px-6 py-14 sm:px-12 sm:py-20"
            >
              <Image
                src={slide.image}
                alt=""
                fill
                sizes="100vw"
                priority={index === 0}
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-ink/90 via-ink/70 to-ink/30" />
              <div className="relative max-w-xl">
                <h1 className="text-3xl font-bold text-white sm:text-4xl">{slide.title}</h1>
                <p className="mt-3 text-base text-slate-200 sm:text-lg">{slide.subtitle}</p>
                <Link
                  href={slide.href}
                  className="mt-6 inline-flex items-center rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white transition hover:brightness-110"
                >
                  {slide.cta}
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button
        aria-label="Anterior"
        onClick={scrollPrev}
        className="absolute left-3 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/10 p-2 text-white backdrop-blur transition hover:bg-white/20 sm:flex"
      >
        <ChevronLeft className="size-5" />
      </button>
      <button
        aria-label="Próximo"
        onClick={scrollNext}
        className="absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/10 p-2 text-white backdrop-blur transition hover:bg-white/20 sm:flex"
      >
        <ChevronRight className="size-5" />
      </button>

      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
        {SLIDES.map((slide, index) => (
          <button
            key={slide.title}
            aria-label={`Ir para o slide ${index + 1}`}
            onClick={() => scrollTo(index)}
            className={`size-2 rounded-full transition ${
              index === selected ? "bg-accent" : "bg-white/40"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
