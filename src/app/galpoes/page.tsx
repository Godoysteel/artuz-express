import type { Metadata } from "next";
import Image from "next/image";
import { Container } from "@/components/ui/Container";
import { QuoteForm } from "@/components/galpoes/QuoteForm";
import { GALPAO_MODELS } from "@/lib/galpoes";

export const metadata: Metadata = {
  title: "Galpões e Celeiros",
  description:
    "Montagem de galpões abertos, galpões fechados e celeiros. Escolha o modelo, informe as medidas e peça seu orçamento pelo WhatsApp.",
  alternates: { canonical: "/galpoes" },
};

const STEPS = [
  { title: "Você monta o pedido", text: "Escolhe o modelo, as medidas, o fechamento e as aberturas no formulário abaixo." },
  { title: "Enviamos o orçamento", text: "Recebemos seu pedido pelo WhatsApp e retornamos com valores e prazo." },
  { title: "Alinhamos os detalhes", text: "Ajustamos medidas, cobertura e acabamentos até ficar do jeito que você precisa." },
  { title: "Montagem", text: "Nossa equipe monta o galpão no seu terreno." },
];

const DETAILS = [
  { src: "/galpoes/estrutura.jpg", alt: "Estrutura metálica de um galpão em montagem", caption: "Estrutura metálica", w: 1200, h: 799 },
  { src: "/galpoes/projeto.jpg", alt: "Desenho da estrutura de um galpão", caption: "Projeto da estrutura", w: 1200, h: 800 },
  { src: "/galpoes/acabamento.jpg", alt: "Detalhe do fechamento e da cobertura em chapa vermelha com acabamento branco", caption: "Fechamento e cobertura", w: 1200, h: 800 },
];

export default function GalpoesPage() {
  return (
    <>
      <section className="bg-ink-soft text-white">
        <Container className="py-12 sm:py-16">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-light">Galpões e celeiros</p>
          <h1 className="mt-2 max-w-2xl text-balance text-3xl font-bold sm:text-5xl">
            Monte o seu galpão do jeito que você precisa
          </h1>
          <p className="mt-4 max-w-xl text-slate-200">
            Escolha o modelo, informe as medidas e receba o orçamento pelo WhatsApp.
          </p>
          <a
            href="#orcamento"
            className="mt-6 inline-flex min-h-12 items-center rounded-lg bg-accent px-6 font-bold text-white transition hover:bg-accent-dark"
          >
            Pedir orçamento
          </a>
        </Container>
      </section>

      <Container className="py-12">
        <h2 className="text-2xl font-bold text-ink">Modelos que montamos</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {GALPAO_MODELS.map((m) => (
            <article key={m.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <Image
                src={m.image}
                alt={m.name}
                width={500}
                height={375}
                sizes="(min-width: 640px) 33vw, 100vw"
                className="w-full bg-[#f8f8f4]"
              />
              <div className="p-4">
                <h3 className="text-lg font-bold text-ink">{m.name}</h3>
                <p className="mt-1 text-sm text-slate-600">{m.description}</p>
              </div>
            </article>
          ))}
        </div>
      </Container>

      <section className="border-t border-slate-200 bg-white">
        <Container className="py-12">
          <h2 className="text-2xl font-bold text-ink">Estrutura e acabamento</h2>
          <p className="mt-2 max-w-2xl text-slate-600">
            Da estrutura metálica ao fechamento das paredes e da cobertura. Nos celeiros, também trabalhamos com revestimento em ACM.
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {DETAILS.map((d) => (
              <figure key={d.src} className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                <Image src={d.src} alt={d.alt} width={d.w} height={d.h} sizes="(min-width: 768px) 33vw, 100vw" className="aspect-[4/3] w-full object-cover" />
                <figcaption className="p-3 text-sm font-semibold text-ink">{d.caption}</figcaption>
              </figure>
            ))}
          </div>
        </Container>
      </section>

      <section className="border-y border-slate-200 bg-white">
        <Container className="py-12">
          <h2 className="text-2xl font-bold text-ink">Como funciona</h2>
          <ol className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <li key={s.title} className="flex gap-4">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent font-bold text-white">
                  {i + 1}
                </span>
                <div>
                  <h3 className="font-bold text-ink">{s.title}</h3>
                  <p className="mt-1 text-sm text-slate-600">{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      <section id="orcamento" className="scroll-mt-32">
      <Container className="py-12">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-2xl font-bold text-ink">Peça seu orçamento</h2>
          <p className="mb-6 mt-2 text-slate-600">Preencha os dados abaixo. Leva poucos minutos.</p>
          <QuoteForm />
        </div>
      </Container>
      </section>
    </>
  );
}
