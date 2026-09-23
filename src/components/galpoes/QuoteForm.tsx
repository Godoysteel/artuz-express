"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { whatsappLink } from "@/lib/whatsapp";
import { trackEvent } from "@/lib/analytics/client";
import { GALPAO_MODELS } from "@/lib/galpoes";

const CLOSINGS = ["Fechado", "Aberto", "Parcialmente aberto"] as const;
const ROOFS = [
  "Telha trapezoidal simples",
  "Telha termoacústica (com isolamento)",
  "Telha de fibrocimento",
  "Ainda não sei — quero orientação",
];
const CLADDINGS = [
  "Revestimento em ACM",
  "Telha (sem ACM)",
  "Ainda não sei — quero orientação",
];
const GATES = [
  "Deslizante (correr)",
  "De abrir (2 folhas)",
  "Basculante",
  "De enrolar (aço)",
  "Sanfonado / camarão",
  "Ainda não sei",
];

const field =
  "min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30";
const label = "flex flex-col gap-1.5 text-sm font-semibold text-ink";

function toNumber(value: string) {
  const n = parseFloat(value.replace(",", "."));
  return Number.isNaN(n) ? 0 : n;
}
function fmt(n: number) {
  return n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
}

function Stepper({
  id,
  title,
  value,
  onChange,
}: {
  id: string;
  title: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5 text-sm font-semibold text-ink">
      <label htmlFor={id}>{title}</label>
      <div className="flex">
        <button
          type="button"
          aria-label={`Menos ${title.toLowerCase()}`}
          onClick={() => onChange(Math.max(0, value - 1))}
          className="min-h-11 w-11 rounded-l-lg border border-slate-300 bg-slate-50 text-xl text-ink hover:bg-slate-100"
        >
          −
        </button>
        <input
          id={id}
          type="number"
          inputMode="numeric"
          min={0}
          value={value}
          onChange={(e) => onChange(Math.max(0, parseInt(e.target.value, 10) || 0))}
          className="min-h-11 w-full min-w-0 border-y border-slate-300 bg-white text-center text-ink outline-none [appearance:textfield] focus:border-accent [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <button
          type="button"
          aria-label={`Mais ${title.toLowerCase()}`}
          onClick={() => onChange(value + 1)}
          className="min-h-11 w-11 rounded-r-lg border border-slate-300 bg-slate-50 text-xl text-ink hover:bg-slate-100"
        >
          +
        </button>
      </div>
    </div>
  );
}

export function QuoteForm({ defaultModel = "fechado" }: { defaultModel?: string }) {
  const [model, setModel] = useState<string>(defaultModel);
  const [width, setWidth] = useState("12");
  const [length, setLength] = useState("24");
  const [height, setHeight] = useState("4");
  const [closing, setClosing] = useState<string>("Fechado");
  const [openSides, setOpenSides] = useState("");
  const [roof, setRoof] = useState(ROOFS[0]);
  const [cladding, setCladding] = useState(CLADDINGS[0]);
  const [claddingColor, setCladdingColor] = useState("");
  const [windows, setWindows] = useState(2);
  const [doors, setDoors] = useState(1);
  const [gates, setGates] = useState(1);
  const [gateType, setGateType] = useState(GATES[0]);
  const [gateSize, setGateSize] = useState("4 × 4");
  const [gatePlace, setGatePlace] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [summary, setSummary] = useState("");
  const [copied, setCopied] = useState(false);

  const area = toNumber(width) * toNumber(length);

  function pickModel(id: string) {
    setModel(id);
    const m = GALPAO_MODELS.find((x) => x.id === id);
    if (m) setClosing(m.closing);
  }

  function buildSummary() {
    const m = GALPAO_MODELS.find((x) => x.id === model)!;
    const closingText =
      closing === "Parcialmente aberto" && openSides.trim()
        ? `${closing} (abertos: ${openSides.trim()})`
        : closing;
    const lines = [
      "Olá, Telma! Gostaria de um orçamento de galpão.",
      "",
      "*PEDIDO DE ORÇAMENTO*",
      `Modelo: *${m.name}*`,
      `Medidas: ${fmt(toNumber(width))} m × ${fmt(toNumber(length))} m, pé-direito ${fmt(toNumber(height))} m`,
      `Área coberta: ${fmt(area)} m²`,
      `Fechamento: ${closingText}`,
      `Cobertura: ${roof}`,
      ...(model === "celeiro"
        ? [`Revestimento: ${cladding}${cladding === CLADDINGS[0] && claddingColor.trim() ? ` — cor ${claddingColor.trim()}` : ""}`]
        : []),
      `Janelas: ${windows}`,
      `Portas: ${doors}`,
      gates > 0
        ? `Portões: ${gates} — ${gateType}, ${gateSize.trim() || "medida a definir"} m${gatePlace.trim() ? ` (${gatePlace.trim()})` : ""}`
        : "Portões: nenhum",
      "",
      `Nome: ${name.trim()}`,
      `Telefone: ${phone.trim()}`,
    ];
    if (city.trim()) lines.push(`Cidade da obra: ${city.trim()}`);
    if (notes.trim()) lines.push(`Obs.: ${notes.trim()}`);
    return lines.join("\n");
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    let msg = "";
    if (toNumber(width) <= 0 || toNumber(length) <= 0 || toNumber(height) <= 0) {
      msg = "Preencha largura, comprimento e pé-direito com valores maiores que zero.";
    } else if (!name.trim()) {
      msg = "Informe seu nome.";
    } else if (phone.replace(/\D/g, "").length < 10) {
      msg = "Informe um telefone com DDD.";
    }
    setError(msg);
    if (msg) return;
    setSummary(buildSummary());
    setCopied(false);
    requestAnimationFrame(() =>
      document.getElementById("galpao-resumo")?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
    } catch {
      const el = document.getElementById("galpao-resumo-texto");
      if (el) {
        const range = document.createRange();
        range.selectNodeContents(el);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
        setCopied(true);
      }
    }
  }

  const section = "flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:p-6";
  const heading = "text-lg font-bold text-ink";

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      <fieldset className={section}>
        <legend className="sr-only">Modelo</legend>
        <h3 className={heading}>1. Escolha o modelo</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          {GALPAO_MODELS.map((m) => (
            <label key={m.id} className="relative block cursor-pointer">
              <input
                type="radio"
                name="modelo"
                value={m.id}
                checked={model === m.id}
                onChange={() => pickModel(m.id)}
                className="peer sr-only"
              />
              <span className="flex h-full flex-col gap-2 rounded-xl border-2 border-slate-200 bg-slate-50 p-2 text-center transition peer-checked:border-accent peer-checked:bg-accent/10 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent">
                <Image src={m.image} alt={m.name} width={500} height={375} className="w-full rounded-lg bg-[#f8f8f4]" />
                <span className="font-semibold text-ink">{m.name}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className={section}>
        <h3 className={heading}>2. Medidas</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className={label}>
            Largura (m)
            <input className={field} inputMode="decimal" value={width} onChange={(e) => setWidth(e.target.value)} />
          </label>
          <label className={label}>
            Comprimento (m)
            <input className={field} inputMode="decimal" value={length} onChange={(e) => setLength(e.target.value)} />
          </label>
          <label className={label}>
            Pé-direito (m)
            <input className={field} inputMode="decimal" value={height} onChange={(e) => setHeight(e.target.value)} />
          </label>
        </div>
        <p className="rounded-lg border-l-4 border-accent bg-slate-50 px-4 py-3 text-sm text-slate-600" aria-live="polite">
          <strong className="mr-2 text-2xl tabular-nums text-ink">{fmt(area)} m²</strong>
          área coberta aproximada
        </p>
      </fieldset>

      <fieldset className={section}>
        <h3 className={heading}>3. Fechamento e cobertura</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          {CLOSINGS.map((c) => (
            <label key={c} className="relative block cursor-pointer">
              <input
                type="radio"
                name="fechamento"
                value={c}
                checked={closing === c}
                onChange={() => setClosing(c)}
                className="peer sr-only"
              />
              <span className="flex min-h-11 items-center justify-center rounded-lg border-2 border-slate-200 bg-slate-50 px-3 py-2 text-center font-semibold text-ink transition peer-checked:border-accent peer-checked:bg-accent/10 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent">
                {c}
              </span>
            </label>
          ))}
        </div>
        {closing === "Parcialmente aberto" && (
          <label className={label}>
            Quais lados ficam abertos? <span className="font-normal text-slate-500">(opcional)</span>
            <input className={field} value={openSides} onChange={(e) => setOpenSides(e.target.value)} placeholder="Ex.: frente e lateral direita" />
          </label>
        )}
        <label className={label}>
          Cobertura
          <select className={field} value={roof} onChange={(e) => setRoof(e.target.value)}>
            {ROOFS.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </label>
        {model === "celeiro" && (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={label}>
              Revestimento das paredes
              <select className={field} value={cladding} onChange={(e) => setCladding(e.target.value)}>
                {CLADDINGS.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            {cladding === CLADDINGS[0] && (
              <label className={label}>
                Cor do ACM <span className="font-normal text-slate-500">(opcional)</span>
                <input className={field} value={claddingColor} onChange={(e) => setCladdingColor(e.target.value)} placeholder="Ex.: vermelho, cinza, preto" />
              </label>
            )}
          </div>
        )}
      </fieldset>

      <fieldset className={section}>
        <h3 className={heading}>4. Janelas, portas e portões</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <Stepper id="galpao-janelas" title="Janelas" value={windows} onChange={setWindows} />
          <Stepper id="galpao-portas" title="Portas" value={doors} onChange={setDoors} />
          <Stepper id="galpao-portoes" title="Portões" value={gates} onChange={setGates} />
        </div>
        {gates > 0 && (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className={label}>
                Tipo de portão
                <select className={field} value={gateType} onChange={(e) => setGateType(e.target.value)}>
                  {GATES.map((g) => (
                    <option key={g}>{g}</option>
                  ))}
                </select>
              </label>
              <label className={label}>
                Medida do portão <span className="font-normal text-slate-500">(L × A, m)</span>
                <input className={field} value={gateSize} onChange={(e) => setGateSize(e.target.value)} placeholder="Ex.: 4 × 4" />
              </label>
            </div>
            <label className={label}>
              Onde ficam os portões? <span className="font-normal text-slate-500">(opcional)</span>
              <input className={field} value={gatePlace} onChange={(e) => setGatePlace(e.target.value)} placeholder="Ex.: um na frente, outro no fundo" />
            </label>
          </>
        )}
      </fieldset>

      <fieldset className={section}>
        <h3 className={heading}>5. Seus dados</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className={label}>
            Nome
            <input className={field} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className={label}>
            WhatsApp / telefone
            <input className={field} type="tel" autoComplete="tel" placeholder="(00) 00000-0000" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </label>
        </div>
        <label className={label}>
          Cidade da obra
          <input className={field} autoComplete="address-level2" value={city} onChange={(e) => setCity(e.target.value)} />
        </label>
        <label className={label}>
          Observações <span className="font-normal text-slate-500">(uso do galpão, terreno, prazo…)</span>
          <textarea className={cn(field, "min-h-24")} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>
        {error && (
          <p role="alert" className="text-sm font-semibold text-red-700">
            {error}
          </p>
        )}
        <button
          type="submit"
          className="min-h-12 rounded-lg bg-accent px-6 text-base font-bold text-white transition hover:bg-accent-dark"
        >
          Gerar meu pedido
        </button>
      </fieldset>

      {summary && (
        <section id="galpao-resumo" aria-live="polite" className="flex flex-col gap-4 rounded-xl border-2 border-emerald-600 bg-white p-5 sm:p-6">
          <h3 className="text-xl font-bold text-emerald-700">Pedido pronto</h3>
          <p className="text-sm text-slate-600">
            Confira o resumo e envie para a nossa equipe. Ele só é enviado quando você tocar em um dos botões abaixo.
          </p>
          <pre id="galpao-resumo-texto" className="whitespace-pre-wrap break-words rounded-lg border border-slate-200 bg-slate-50 p-4 font-sans text-sm text-ink">
            {summary}
          </pre>
          <div className="flex flex-col gap-3 sm:flex-row">
            <a
              href={whatsappLink(summary)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackEvent({ eventType: "whatsapp_click", metadata: { source: "galpoes_orcamento" } })}
              className="flex min-h-12 flex-1 items-center justify-center rounded-lg bg-emerald-600 px-6 text-base font-bold text-white transition hover:bg-emerald-700"
            >
              Enviar pelo WhatsApp
            </a>
            <button
              type="button"
              onClick={copy}
              className="min-h-12 flex-1 rounded-lg border-2 border-ink-soft px-6 text-base font-bold text-ink-soft transition hover:bg-slate-100"
            >
              {copied ? "Resumo copiado" : "Copiar resumo"}
            </button>
          </div>
        </section>
      )}
    </form>
  );
}
