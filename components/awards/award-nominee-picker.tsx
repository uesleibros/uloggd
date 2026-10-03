"use client";
import { useRef, useEffect, useState } from "react";
import * as Dialog from "@/components/ui/dialog";
import {
  Plus,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
} from "lucide-react";
import { SafeImage } from "@/components/safe-image";
import { useApi } from "@/lib/use-api";
import { useCatalogSearch } from "@/lib/use-catalog-search";
import { LoadError } from "@/components/ui/load-error";
import { tri, uiText, type UiLang } from "@/lib/ui-text";
import type { AwardCategory, AwardGame } from "@/lib/awards";

export function AwardNomineePicker({
  awardId,
  category,
  unrestricted,
  disabled,
  onAdd,
  lang,
}: {
  awardId: string;
  category: AwardCategory;
  unrestricted: boolean;
  disabled: boolean;
  onAdd: (game: AwardGame) => void;
  lang: UiLang;
}) {
  const t = uiText(lang);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [term, setTerm] = useState("");
  const [page, setPage] = useState(1);
  const results = useRef<HTMLDivElement>(null);
  function changePage(next: number) {
    setPage(next);
    results.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  useEffect(() => {
    const timer = setTimeout(() => setTerm(query), 250);
    return () => clearTimeout(timer);
  }, [query]);
  const pool = useApi<{ data: AwardGame[]; has_more: boolean }>(
    open
      ? `/awards/${awardId}/eligible?q=${encodeURIComponent(term)}&page=${page}`
      : null,
    { keepPrevious: true },
  );
  const catalog = useCatalogSearch(query, open && unrestricted);
  const chosen = new Set(category.nominees);
  const combined = new Map((pool.payload?.data ?? []).map((g) => [g.id, g]));
  for (const g of catalog.results)
    combined.set(g.igdbId, {
      id: g.igdbId,
      name: g.name,
      slug: g.slug,
      coverUrl: g.coverUrl,
    });
  const games = [...combined.values()].filter(
    (g) =>
      !chosen.has(g.id) &&
      g.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
  );
  const full = category.nominees.length >= category.max_nominees;
  const title = tri(
    lang,
    "Escolher indicados",
    "Choose nominees",
    "Elegir nominados",
  );
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setQuery("");
          setPage(1);
        }
      }}
    >
      <Dialog.Trigger disabled={disabled || full} className="awards-button">
        <Plus size={15} />
        {tri(lang, "Adicionar indicado", "Add nominee", "Añadir nominado")}
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="create-list-overlay" />
        <Dialog.Content className="create-list-dialog awards-picker-dialog">
          <header>
            <div>
              <Dialog.Title>{title}</Dialog.Title>
              <Dialog.Description>
                {category.name} · {category.nominees.length}/
                {category.max_nominees}
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
                "Buscar jogo para indicar",
                "Search game to nominate",
                "Buscar juego para nominar",
              )}
              placeholder={tri(
                lang,
                "Buscar jogo...",
                "Search game...",
                "Buscar juego...",
              )}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
            />
          </label>
          <p className="awards-help">
            {unrestricted
              ? tri(
                  lang,
                  "Sua biblioteca e o catálogo do site.",
                  "Your library and the site's catalogue.",
                  "Tu biblioteca y el catálogo del sitio.",
                )
              : tri(
                  lang,
                  "Somente os jogos permitidos pelas regras desta edição.",
                  "Only games allowed by this edition's rules.",
                  "Solo los juegos permitidos por las reglas de esta edición.",
                )}
          </p>
          {!!pool.error && <LoadError lang={lang} onRetry={pool.reload} />}
          {!!catalog.error && unrestricted && (
            <LoadError lang={lang} onRetry={catalog.reload} />
          )}
          {(pool.loading || catalog.loading) && !games.length ? (
            <div className="awards-picker-grid" aria-hidden>
              {Array.from({ length: 6 }, (_, i) => (
                <div className="awards-picker-loading" key={i}>
                  <span className="skeleton-block awards-nominee-cover" />
                  <span className="skeleton-block" />
                  <span className="skeleton-block" />
                </div>
              ))}
            </div>
          ) : (
            <div
              className="awards-picker-grid"
              ref={results}
              aria-busy={pool.loading || catalog.loading}
            >
              {games.map((g) => (
                <button
                  type="button"
                  key={g.id}
                  disabled={full}
                  aria-label={`${tri(lang, "Indicar", "Nominate", "Nominar")} ${g.name}`}
                  onClick={() => onAdd(g)}
                >
                  <span className="awards-nominee-cover">
                    <SafeImage src={g.coverUrl} alt="" fill sizes="120px" />
                  </span>
                  <strong>{g.name}</strong>
                  <Plus size={16} />
                </button>
              ))}
            </div>
          )}
          {catalog.loading && (
            <p role="status" className="awards-help">
              {tri(
                lang,
                "Buscando no catálogo...",
                "Searching the catalogue...",
                "Buscando en el catálogo...",
              )}
            </p>
          )}
          {!pool.loading &&
            !catalog.loading &&
            !games.length &&
            !pool.error &&
            !catalog.error && (
              <p className="awards-empty">
                {full
                  ? tri(
                      lang,
                      "Limite de indicados atingido.",
                      "Nominee limit reached.",
                      "Límite de nominados alcanzado.",
                    )
                  : tri(
                      lang,
                      "Nenhum jogo encontrado. Tente outra busca ou revise sua lista base.",
                      "No games found. Try another search or review the source list.",
                      "No se encontraron juegos. Prueba otra búsqueda o revisa la lista base.",
                    )}
              </p>
            )}
          <footer>
            <button
              type="button"
              className="awards-button"
              disabled={page === 1 || pool.loading}
              onClick={() => changePage(page - 1)}
            >
              <ChevronLeft size={16} />
              {t.previous}
            </button>
            <button
              type="button"
              className="awards-button"
              disabled={!pool.payload?.has_more || pool.loading}
              onClick={() => changePage(page + 1)}
            >
              {t.next}
              {pool.loading ? (
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
