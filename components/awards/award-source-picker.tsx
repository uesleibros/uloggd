"use client";
import { useRef, useState } from "react";
import * as Dialog from "@/components/ui/dialog";
import {
  List,
  Search,
  X,
  Check,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
} from "lucide-react";
import { useApi } from "@/lib/use-api";
import { LoadError } from "@/components/ui/load-error";
import { tri, uiText, type UiLang } from "@/lib/ui-text";

export function AwardSourcePicker({
  value,
  name,
  onChange,
  lang,
}: {
  value: string | null;
  name: string | null;
  onChange: (id: string, name: string) => void;
  lang: UiLang;
}) {
  const t = uiText(lang);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const results = useRef<HTMLDivElement>(null);
  function changePage(next: number) {
    setPage(next);
    results.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  const answer = useApi<{
    data: { id: string; name: string }[];
    has_more: boolean;
  }>(
    open ? `/awards/sources?q=${encodeURIComponent(query)}&page=${page}` : null,
    { keepPrevious: true },
  );
  const title = tri(
    lang,
    "Escolher lista base",
    "Choose source list",
    "Elegir lista base",
  );
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger className="awards-button">
        <List size={16} />
        {name || title}
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="create-list-overlay" />
        <Dialog.Content className="create-list-dialog awards-picker-dialog">
          <header>
            <div>
              <Dialog.Title>{title}</Dialog.Title>
              <Dialog.Description>
                {tri(
                  lang,
                  "Somente jogos da lista escolhida poderão concorrer. A seleção acompanha as mudanças da lista.",
                  "Only games in this list can be nominated. Eligibility follows changes to the list.",
                  "Solo pueden competir juegos de esta lista. La selección sigue los cambios de la lista.",
                )}
              </Dialog.Description>
            </div>
            <Dialog.Close aria-label={t.close}>
              <X size={18} />
            </Dialog.Close>
          </header>
          <label className="awards-search">
            <Search size={16} />
            <input
              aria-label={tri(
                lang,
                "Buscar suas listas",
                "Search your lists",
                "Buscar tus listas",
              )}
              placeholder={tri(
                lang,
                "Buscar suas listas...",
                "Search your lists...",
                "Buscar tus listas...",
              )}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
            />
          </label>
          {answer.loading && !answer.payload ? (
            <div
              className="awards-source-list awards-source-skeleton"
              aria-hidden
            >
              {Array.from({ length: 5 }, (_, i) => (
                <span className="skeleton-block" key={i} />
              ))}
            </div>
          ) : answer.error ? (
            <LoadError lang={lang} onRetry={answer.reload} />
          ) : (
            <div
              className="awards-source-list"
              ref={results}
              aria-busy={answer.loading}
            >
              {answer.payload?.data.map((list) => (
                <button
                  type="button"
                  key={list.id}
                  data-selected={value === list.id || undefined}
                  onClick={() => {
                    onChange(list.id, list.name);
                    setOpen(false);
                  }}
                >
                  <List size={16} />
                  <span>{list.name}</span>
                  {value === list.id && <Check size={16} />}
                </button>
              ))}
              {!answer.payload?.data.length && (
                <p className="awards-empty">
                  {tri(
                    lang,
                    "Nenhuma lista encontrada.",
                    "No lists found.",
                    "No se encontraron listas.",
                  )}
                </p>
              )}
            </div>
          )}
          <footer>
            <button
              type="button"
              className="awards-button"
              disabled={page === 1 || answer.loading}
              onClick={() => changePage(page - 1)}
            >
              <ChevronLeft size={16} />
              {t.previous}
            </button>
            <button
              type="button"
              className="awards-button"
              disabled={!answer.payload?.has_more || answer.loading}
              onClick={() => changePage(page + 1)}
            >
              {t.next}
              {answer.loading ? (
                <LoaderCircle size={16} className="spin" />
              ) : (
                <ChevronRight size={16} />
              )}
            </button>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
