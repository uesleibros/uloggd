"use client";

import { LoaderCircle, Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useState, useTransition } from "react";
import { tri, type UiLang } from "@/lib/ui-text";
import type { SearchScope } from "./search-scope-tabs";

export function EntitySearchForm({
  lang,
  scope,
  query,
}: {
  lang: UiLang;
  scope: Exclude<SearchScope, "games">;
  query: string;
}) {
  const pathname = usePathname();
  const current = useSearchParams();
  const router = useRouter();
  const [value, setValue] = useState(query);
  const [pending, startTransition] = useTransition();

  useEffect(() => setValue(query), [query]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams(current.toString());
    params.set("scope", scope);
    const normalized = value.trim().replace(/\s+/g, " ");
    if (normalized) params.set("q", normalized);
    else params.delete("q");
    params.delete("page");
    startTransition(() => router.push(`${pathname}?${params}`));
  }

  return (
    <form
      className="catalog-search-main-form"
      onSubmit={submit}
      aria-busy={pending}
    >
      <label className="catalog-search-main-field">
        <Search size={20} />
        <input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={
            scope === "people"
              ? tri(
                  lang,
                  "Nome ou @usuário…",
                  "Name or @username…",
                  "Nombre o @usuario…",
                )
              : scope === "companies"
                ? tri(
                    lang,
                    "Nome da empresa…",
                    "Company name…",
                    "Nombre de la empresa…",
                  )
                : tri(
                    lang,
                    "Nome da lista…",
                    "List name…",
                    "Nombre de la lista…",
                  )
          }
        />
      </label>
      <button type="submit" disabled={pending}>
        {pending && <LoaderCircle className="spin" size={14} />}
        {pending
          ? tri(lang, "Buscando…", "Searching…", "Buscando…")
          : tri(lang, "Buscar", "Search", "Buscar")}
      </button>
    </form>
  );
}
