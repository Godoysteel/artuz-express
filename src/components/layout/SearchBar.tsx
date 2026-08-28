"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function SearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = query.trim();
    if (trimmed) router.push(`/busca?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <form onSubmit={handleSubmit} className="relative w-full max-w-xl">
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="O que você procura?"
        className="w-full rounded-full border border-slate-200 bg-white py-2.5 pl-4 pr-11 text-sm text-ink placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
      />
      <button
        type="submit"
        aria-label="Buscar"
        className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full bg-brand p-2 text-white transition hover:bg-brand-dark"
      >
        <Search className="size-4" />
      </button>
    </form>
  );
}
