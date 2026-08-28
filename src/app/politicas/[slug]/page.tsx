import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";

const PAGES: Record<string, { title: string; body: string }> = {
  termos: {
    title: "Termos de uso",
    body: "Em breve disponibilizaremos aqui os termos de uso completos da Artuz Express. Em caso de dúvidas, entre em contato com nosso atendimento.",
  },
  garantia: {
    title: "Garantia",
    body: "Todos os produtos da Artuz Express passam por controle de qualidade antes do envio. Em caso de defeito de impressão ou acabamento, entre em contato em até 7 dias após o recebimento.",
  },
  privacidade: {
    title: "Política de privacidade",
    body: "Seus dados são usados exclusivamente para processar pedidos e melhorar sua experiência na loja. Não compartilhamos suas informações com terceiros sem consentimento.",
  },
};

export default async function PolicyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = PAGES[slug];
  if (!page) notFound();

  return (
    <Container className="max-w-2xl py-12">
      <h1 className="text-2xl font-bold text-ink">{page.title}</h1>
      <p className="mt-4 text-slate-600">{page.body}</p>
    </Container>
  );
}
