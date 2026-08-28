"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";

const STORAGE_KEY = "artuz-express:cookie-notice-dismissed";

function subscribe() {
  return () => {};
}
function getSnapshot() {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return true;
  }
}
function getServerSnapshot() {
  return true;
}

export function CookieNotice() {
  const persistedDismissed = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [closedThisSession, setClosedThisSession] = useState(false);

  function handleDismiss() {
    setClosedThisSession(true);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // localStorage indisponível — apenas fecha o aviso nesta sessão
    }
  }

  if (persistedDismissed || closedThisSession) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-800 bg-ink/95 px-4 py-4 text-sm text-slate-200 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 sm:flex-row">
        <p>
          Usamos cookies para melhorar sua experiência. Ao continuar navegando, você concorda com nossa{" "}
          <Link href="/politicas/privacidade" className="text-accent hover:underline">
            política de privacidade
          </Link>
          .
        </p>
        <button
          type="button"
          onClick={handleDismiss}
          className="shrink-0 rounded-full bg-accent px-5 py-2 text-sm font-semibold text-white transition hover:brightness-110"
        >
          Fechar e continuar
        </button>
      </div>
    </div>
  );
}
