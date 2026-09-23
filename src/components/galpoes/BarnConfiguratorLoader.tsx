"use client";

import dynamic from "next/dynamic";

// three.js só roda no navegador (WebGL); carrega o configurador só no cliente.
const BarnConfigurator = dynamic(() => import("./BarnConfigurator"), {
  ssr: false,
  loading: () => <p className="py-16 text-center text-slate-500">Carregando o configurador 3D…</p>,
});

export function BarnConfiguratorLoader() {
  return <BarnConfigurator />;
}
