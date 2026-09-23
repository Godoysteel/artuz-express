"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { whatsappLink } from "@/lib/whatsapp";
import { trackEvent } from "@/lib/analytics/client";
import { GALPAO_MODELS } from "@/lib/galpoes";
import {
  BARN_COLORS, BARN_GATE_TYPES, BARN_LIMITS, BARN_ROOFS, buildWhatsappMessage, computeQuote,
  defaultBarnConfig, formatBRL, normalizeBarnConfig,
  type BarnConfig, type BarnGateType, type BarnModel, type BarnRoof,
} from "@/lib/galpoes-3d/BarnPricing";
import { createBarnViewer, type BarnViewer } from "@/lib/galpoes-3d/BarnScene";

const STEPS = ["Modelo e cor", "Dimensões", "Cobertura", "Aberturas", "Seus dados"] as const;
const field =
  "min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30";
const label = "flex flex-col gap-1.5 text-sm font-semibold text-ink";
const fmtM = (v: number) => `${String(v).replace(".", ",")} m`;

function Slider(p: { title: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void }) {
  return (
    <label className={label}>
      <span className="flex justify-between">{p.title}<span className="text-accent">{fmtM(p.value)}</span></span>
      <input type="range" min={p.min} max={p.max} step={p.step} value={p.value} onChange={(e) => p.onChange(Number(e.target.value))} className="w-full accent-[#4d81cb]" />
    </label>
  );
}

function Counter(p: { title: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-300 px-3 py-2">
      <b className="text-sm text-ink">{p.title}</b>
      <div className="flex items-center gap-3">
        <button type="button" aria-label={`Menos ${p.title.toLowerCase()}`} onClick={() => p.onChange(Math.max(0, p.value - 1))} className="h-9 w-9 rounded-full border border-slate-300 text-lg hover:bg-slate-100">−</button>
        <output className="w-6 text-center font-bold">{p.value}</output>
        <button type="button" aria-label={`Mais ${p.title.toLowerCase()}`} onClick={() => p.onChange(p.value + 1)} className="h-9 w-9 rounded-full border border-slate-300 text-lg hover:bg-slate-100">+</button>
      </div>
    </div>
  );
}

export default function BarnConfigurator() {
  const [config, setConfig] = useState<BarnConfig>(defaultBarnConfig());
  const [step, setStep] = useState(0);
  const [contact, setContact] = useState({ name: "", phone: "", city: "", notes: "" });
  const [clamped, setClamped] = useState(false);
  const viewerHost = useRef<HTMLDivElement>(null);
  const viewer = useRef<BarnViewer | null>(null);

  const c = useMemo(() => normalizeBarnConfig(config), [config]);
  const quote = useMemo(() => computeQuote(c), [c]);
  const set = (patch: Partial<BarnConfig>) => {
    const next = { ...c, ...patch };
    const norm = normalizeBarnConfig(next);
    setClamped(norm.windows !== next.windows || norm.doors !== next.doors || norm.gates !== next.gates);
    setConfig(norm);
  };

  useEffect(() => {
    if (!viewerHost.current) return;
    const v = createBarnViewer(viewerHost.current);
    viewer.current = v;
    v.update(c);
    return () => { v.dispose(); viewer.current = null; };
    // O viewer é criado uma vez; mudanças de configuração vão pelo efeito abaixo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { viewer.current?.update(c); }, [c]);

  const canSend = contact.name.trim().length > 1 && contact.phone.replace(/\D/g, "").length >= 8;
  const message = buildWhatsappMessage(c, quote, contact);
  const isOpen = c.model === "aberto";

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(340px,1fr)] lg:items-start">
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-[#dbe6ee] lg:sticky lg:top-28">
        <div ref={viewerHost} className="h-[56vh] min-h-[320px] w-full lg:h-[70vh]" />
        <span className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-black/45 px-3 py-1 text-xs text-white">Arraste para girar · role para aproximar</span>
      </div>

      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5">
        <ol className="flex gap-1.5" aria-label="Etapas">
          {STEPS.map((s, i) => <li key={s} title={s} className={cn("h-1.5 flex-1 rounded", i <= step ? "bg-accent" : "bg-slate-200")} />)}
        </ol>
        <h3 className="text-xl font-bold text-ink">{step + 1}. {STEPS[step]}</h3>

        {step === 0 && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-3 gap-2">
              {GALPAO_MODELS.map((m) => (
                <button key={m.id} type="button" aria-pressed={c.model === m.id} onClick={() => set(m.id === "celeiro" ? { model: "celeiro", gateType: "correr" } : { model: m.id as BarnModel })}
                  className={cn("flex flex-col gap-1 rounded-xl border-2 p-1.5 text-center text-xs font-semibold transition", c.model === m.id ? "border-accent bg-accent/10" : "border-slate-200 bg-slate-50 hover:border-slate-300")}>
                  <Image src={m.image} alt={m.name} width={300} height={225} className="w-full rounded-lg bg-[#f8f8f4]" />
                  {m.name}
                </button>
              ))}
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold text-ink">Cor da chapa</p>
              <div className="flex flex-wrap gap-2.5">
                {BARN_COLORS.map((col) => (
                  <button key={col.id} type="button" title={col.label} aria-label={col.label} aria-pressed={c.colorId === col.id} onClick={() => set({ colorId: col.id })}
                    className={cn("h-10 w-10 rounded-full border-2 border-white shadow ring-1 ring-slate-300", c.colorId === col.id && "ring-4 ring-accent")} style={{ background: col.hex }} />
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-slate-600">Área coberta: <b>{String(quote.areaM2).replace(".", ",")} m²</b></p>
            <Slider title="Largura" value={c.widthM} min={BARN_LIMITS.widthM.min} max={BARN_LIMITS.widthM.max} step={0.5} onChange={(v) => set({ widthM: v })} />
            <Slider title="Comprimento" value={c.lengthM} min={BARN_LIMITS.lengthM.min} max={BARN_LIMITS.lengthM.max} step={1} onChange={(v) => set({ lengthM: v })} />
            <Slider title="Altura do pé-direito" value={c.eaveHeightM} min={BARN_LIMITS.eaveHeightM.min} max={BARN_LIMITS.eaveHeightM.max} step={0.5} onChange={(v) => set({ eaveHeightM: v })} />
          </div>
        )}

        {step === 2 && (
          <label className={label}>Tipo de telha
            <select className={field} value={c.roof} onChange={(e) => set({ roof: e.target.value as BarnRoof })}>
              {BARN_ROOFS.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
            </select>
          </label>
        )}

        {step === 3 && (
          <div className="flex flex-col gap-3">
            {isOpen && <p className="text-sm text-slate-600">O galpão aberto é aberto por todos os lados: não tem paredes, portas, janelas nem portões.</p>}
            {!isOpen && (
              <>
                <Counter title="Janelas" value={c.windows} onChange={(v) => set({ windows: v })} />
                <Counter title="Portas" value={c.doors} onChange={(v) => set({ doors: v })} />
                <Counter title="Portões" value={c.gates} onChange={(v) => set({ gates: v })} />
                <label className={label}>Tipo de portão
                  <select className={field} value={c.gateType} onChange={(e) => set({ gateType: e.target.value as BarnGateType })}>
                    {BARN_GATE_TYPES.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
                  </select>
                </label>
                <Slider title="Largura do portão" value={c.gateWidthM} min={BARN_LIMITS.gateWidthM.min} max={BARN_LIMITS.gateWidthM.max} step={0.5} onChange={(v) => set({ gateWidthM: v })} />
                <Slider title="Altura do portão" value={c.gateHeightM} min={BARN_LIMITS.gateHeightM.min} max={BARN_LIMITS.gateHeightM.max} step={0.5} onChange={(v) => set({ gateHeightM: v })} />
              </>
            )}
            {clamped && <p className="text-xs text-amber-700">Ajustamos a quantidade de aberturas ao espaço disponível nas paredes.</p>}
          </div>
        )}

        {step === 4 && (
          <div className="flex flex-col gap-3">
            <label className={label}>Nome<input className={field} autoComplete="name" value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} /></label>
            <label className={label}>WhatsApp / telefone<input className={field} type="tel" autoComplete="tel" value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} /></label>
            <label className={label}>Cidade / local da obra<input className={field} value={contact.city} onChange={(e) => setContact({ ...contact, city: e.target.value })} /></label>
            <label className={label}>Observações<textarea className={cn(field, "min-h-20")} value={contact.notes} onChange={(e) => setContact({ ...contact, notes: e.target.value })} /></label>
            <a href={canSend ? whatsappLink(message) : undefined} target="_blank" rel="noopener noreferrer" aria-disabled={!canSend}
              onClick={(e) => { if (!canSend) { e.preventDefault(); return; } trackEvent({ eventType: "whatsapp_click", metadata: { source: "galpoes_configurador" } }); }}
              className={cn("flex min-h-12 items-center justify-center rounded-lg px-6 text-base font-bold text-white transition", canSend ? "bg-emerald-600 hover:bg-emerald-700" : "cursor-not-allowed bg-slate-300")}>
              Pedir orçamento pelo WhatsApp
            </a>
          </div>
        )}

        <div className="flex justify-between gap-3">
          <button type="button" disabled={step === 0} onClick={() => setStep(step - 1)} className="min-h-11 rounded-lg bg-slate-100 px-5 font-bold text-ink disabled:opacity-40">Voltar</button>
          {step < STEPS.length - 1 && <button type="button" onClick={() => setStep(step + 1)} className="min-h-11 rounded-lg bg-accent px-5 font-bold text-white hover:bg-accent-dark">Continuar</button>}
        </div>

        <div className="border-t border-slate-200 pt-3">
          <p className="mb-2 text-sm font-bold text-ink">Sua cotação</p>
          <ul className="text-xs text-slate-600">
            {quote.lines.map((l) => <li key={l.label} className="flex justify-between gap-3 py-0.5"><span>{l.label}</span><span>{formatBRL(l.amount)}</span></li>)}
          </ul>
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <small className="block text-slate-600">Estimativa</small>
            <strong className="text-2xl text-ink">{formatBRL(quote.low)} a {formatBRL(quote.high)}</strong>
          </div>
          <p className="mt-2 text-xs text-slate-500">Valores de referência, sujeitos a confirmação. Não inclui frete, fundação, montagem e impostos.</p>
        </div>
      </div>
    </div>
  );
}
