"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Trophy,
  Plus,
  Users,
  Pencil,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
} from "lucide-react";
import { useApi } from "@/lib/use-api";
import { AwardCreate } from "./award-create";
import { AwardCardsSkeleton } from "./award-skeleton";
import { LoadError } from "@/components/ui/load-error";
import { awardModeLabel, awardsLabel, type AwardPreview } from "@/lib/awards";
import { visibilityLabel } from "@/lib/visibility";
import { tri, uiText, type UiLang } from "@/lib/ui-text";
import { scrollPaginationResults } from "@/lib/pagination-scroll";
import { useRef } from "react";

export function AwardsWorkspace({
  lang,
  signedIn,
  year,
}: {
  lang: UiLang;
  signedIn: boolean;
  year: number;
}) {
  const t = uiText(lang);
  const params = useSearchParams();
  const pathname = usePathname();
  const username = params.get("username");
  const view =
    params.get("view") === "community" || !signedIn || username
      ? "community"
      : "mine";
  const page = Math.max(1, Math.trunc(Number(params.get("page")) || 1));
  const query = new URLSearchParams({ view, page: String(page) });
  if (username) query.set("username", username);
  const answer = useApi<{ data: AwardPreview[]; has_more: boolean }>(
    `/awards?${query}`,
    { keepPrevious: true },
  );
  const pager = useRef<HTMLDivElement>(null);
  function navigate(next: Record<string, string | null>) {
    const q = new URLSearchParams(params.toString());
    Object.entries(next).forEach(([key, v]) =>
      v === null ? q.delete(key) : q.set(key, v),
    );
    window.history.pushState(null, "", `${pathname}${q.size ? `?${q}` : ""}`);
  }
  return (
    <main className="awards-page" data-pagination-scope>
      <header className="awards-hero">
        <div>
          <span className="awards-eyebrow">
            <Trophy size={16} />
            {tri(
              lang,
              "Seu ano, seus vencedores",
              "Your year, your winners",
              "Tu año, tus ganadores",
            )}
          </span>
          <h1>{awardsLabel(lang)}</h1>
          <p>
            {tri(
              lang,
              "Crie suas categorias, escolha quem concorre e dê o prêmio aos seus favoritos.",
              "Create your categories, choose the nominees and award your favorites.",
              "Crea tus categorías, elige los nominados y premia a tus favoritos.",
            )}
          </p>
        </div>
        {signedIn ? (
          <AwardCreate lang={lang} year={year} />
        ) : (
          <Link
            className="awards-button"
            data-primary
            href={`/${lang}/login?next=/${lang}/awards`}
          >
            <Plus size={16} />
            {tri(lang, "Criar premiação", "Create awards", "Crear premiación")}
          </Link>
        )}
      </header>
      <div className="awards-body">
        <nav
          className="game-page-nav app-tabs awards-tabs"
          aria-label={awardsLabel(lang)}
          data-pagination-start
        >
          {signedIn && (
            <button
              type="button"
              aria-current={view === "mine" ? "page" : undefined}
              onClick={() =>
                navigate({ view: "mine", username: null, page: null })
              }
            >
              <Pencil size={15} />
              {tri(lang, "Minhas premiações", "My awards", "Mis premios")}
            </button>
          )}
          <button
            type="button"
            aria-current={
              view === "community" && !username ? "page" : undefined
            }
            onClick={() =>
              navigate({ view: "community", username: null, page: null })
            }
          >
            <Users size={15} />
            {t.community}
          </button>
          {username && (
            <button type="button" aria-current="page">
              @{username}
            </button>
          )}
        </nav>
        {answer.loading && !answer.payload ? (
          <AwardCardsSkeleton />
        ) : answer.error && !answer.payload ? (
          <LoadError lang={lang} onRetry={answer.reload} />
        ) : (
          <>
            {answer.error && <LoadError lang={lang} onRetry={answer.reload} />}
            {!answer.payload?.data.length ? (
              <div className="awards-empty">
                <Trophy size={36} />
                <h2>
                  {tri(
                    lang,
                    "Esta prateleira ainda está vazia",
                    "This shelf is still empty",
                    "Este estante aún está vacío",
                  )}
                </h2>
                <p>
                  {tri(
                    lang,
                    "Comece uma edição ou explore as premiações da comunidade.",
                    "Start an edition or explore the community's awards.",
                    "Crea una edición o explora los premios de la comunidad.",
                  )}
                </p>
              </div>
            ) : (
              <div className="awards-grid" aria-busy={answer.loading}>
                {answer.payload.data.map((award) => (
                  <article className="awards-preview" key={award.public_id}>
                    <div className="awards-preview-meta">
                      <Trophy size={20} />
                      <span>{award.year}</span>
                      <span className="awards-badge">
                        {award.status === "DRAFT"
                          ? tri(lang, "Rascunho", "Draft", "Borrador")
                          : visibilityLabel(award.visibility, lang)}
                      </span>
                    </div>
                    <h2>
                      <Link href={`/${lang}/awards/${award.public_id}`}>
                        {award.name}
                      </Link>
                    </h2>
                    <p>{awardModeLabel(award.mode, lang)}</p>
                    <div className="awards-preview-counts">
                      <span>
                        {award.category_count}{" "}
                        {tri(lang, "categorias", "categories", "categorías")}
                      </span>
                      <span>
                        {award.winner_count}{" "}
                        {tri(lang, "vencedores", "winners", "ganadores")}
                      </span>
                    </div>
                    <Link
                      className="awards-author"
                      href={`/${lang}/u/${award.author.username}`}
                    >
                      @{award.author.username}
                    </Link>
                  </article>
                ))}
              </div>
            )}
          </>
        )}
        {(page > 1 || answer.payload?.has_more) && (
          <div className="awards-pagination" ref={pager}>
            <button
              type="button"
              className="awards-button"
              disabled={page === 1 || answer.loading}
              onClick={() => {
                navigate({ page: String(page - 1) });
                scrollPaginationResults(pager.current);
              }}
            >
              <ChevronLeft size={16} />
              {t.previous}
            </button>
            <span>
              {tri(lang, `Página ${page}`, `Page ${page}`, `Página ${page}`)}
            </span>
            <button
              type="button"
              className="awards-button"
              disabled={!answer.payload?.has_more || answer.loading}
              onClick={() => {
                navigate({ page: String(page + 1) });
                scrollPaginationResults(pager.current);
              }}
            >
              {t.next}
              {answer.loading ? (
                <LoaderCircle size={16} className="spin" />
              ) : (
                <ChevronRight size={16} />
              )}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
