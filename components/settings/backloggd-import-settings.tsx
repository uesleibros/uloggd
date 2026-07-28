"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Check,
  CheckCircle2,
  DatabaseZap,
  Download,
  ExternalLink,
  Gamepad2,
  LoaderCircle,
  RotateCcw,
  SearchCheck,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import { useState } from "react";
import { tri, type UiLang } from "@/lib/ui-text";

type PreviewGame = {
  id: number;
  name: string;
  slug: string;
  coverUrl: string;
  releaseYear: number | null;
  alreadySaved: boolean;
};

type Preview = {
  importId: string;
  sourceUsername: string;
  discoveredCount: number;
  validatedCount: number;
  existingCount: number;
  readyCount: number;
  skippedCount: number;
  games: PreviewGame[];
  previewedCount: number;
  expiresAt: string;
};

type ImportResult = {
  sourceCount: number;
  validatedCount: number;
  importedCount: number;
  existingCount: number;
};

function errorMessage(lang: UiLang, code: string) {
  const messages: Record<string, [string, string, string]> = {
    invalid_profile: [
      "Informe um usuário ou link público válido do Backloggd.",
      "Enter a valid public Backloggd username or profile link.",
      "Introduce un usuario o enlace público válido de Backloggd.",
    ],
    profile_not_found: [
      "Esse perfil não foi encontrado no Backloggd.",
      "That Backloggd profile could not be found.",
      "No se encontró ese perfil de Backloggd.",
    ],
    profile_private: [
      "A coleção precisa estar pública durante a validação.",
      "The collection must be public while it is validated.",
      "La colección debe ser pública durante la validación.",
    ],
    partner_access_required: [
      "A conexão de parceria ainda não foi liberada pelo Backloggd para este servidor. Nenhum dado foi importado.",
      "Backloggd has not yet allowed the partner connection for this server. No data was imported.",
      "Backloggd aún no ha permitido la conexión de socios para este servidor. No se importó ningún dato.",
    ],
    source_too_large: [
      "A coleção ultrapassou o limite seguro desta importação.",
      "The collection exceeded this import's safety limit.",
      "La colección superó el límite seguro de esta importación.",
    ],
    rate_limited: [
      "Você já iniciou três conferências recentes. Aguarde alguns minutos.",
      "You already started three recent checks. Wait a few minutes.",
      "Ya iniciaste tres comprobaciones recientes. Espera unos minutos.",
    ],
    preview_expired: [
      "A prévia expirou. Valide o perfil novamente antes de importar.",
      "The preview expired. Validate the profile again before importing.",
      "La vista previa caducó. Valida el perfil de nuevo antes de importar.",
    ],
  };
  const message = messages[code] ?? [
    "Não foi possível concluir a conferência agora. Tente novamente mais tarde.",
    "The check could not be completed right now. Try again later.",
    "No se pudo completar la comprobación. Inténtalo de nuevo más tarde.",
  ];
  return tri(lang, ...message);
}

function gameCount(lang: UiLang, count: number) {
  return tri(
    lang,
    `${count} ${count === 1 ? "jogo" : "jogos"}`,
    `${count} ${count === 1 ? "game" : "games"}`,
    `${count} ${count === 1 ? "juego" : "juegos"}`,
  );
}

export function BackloggdImportSettings({ lang }: { lang: UiLang }) {
  const router = useRouter();
  const [profile, setProfile] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [pending, setPending] = useState<"preview" | "commit" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const profileIsUrl = /^https?:\/\//i.test(profile.trim());

  async function validateProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending("preview");
    setError(null);
    setPreview(null);
    setResult(null);
    try {
      const response = await fetch("/api/imports/backloggd/preview", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile }),
      });
      const payload = (await response.json()) as Preview & { error?: string };
      if (!response.ok || payload.error)
        throw new Error(payload.error ?? "preview_failed");
      setPreview(payload);
    } catch (requestError) {
      setError(
        errorMessage(
          lang,
          requestError instanceof Error
            ? requestError.message
            : "preview_failed",
        ),
      );
    } finally {
      setPending(null);
    }
  }

  async function commitImport() {
    if (!preview || pending || preview.readyCount <= 0) return;
    setPending("commit");
    setError(null);
    try {
      const response = await fetch("/api/imports/backloggd/commit", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ importId: preview.importId }),
      });
      const payload = (await response.json()) as ImportResult & {
        error?: string;
      };
      if (!response.ok || payload.error)
        throw new Error(payload.error ?? "import_failed");
      setResult(payload);
      setPreview(null);
      router.refresh();
    } catch (requestError) {
      setError(
        errorMessage(
          lang,
          requestError instanceof Error
            ? requestError.message
            : "import_failed",
        ),
      );
    } finally {
      setPending(null);
    }
  }

  function reset() {
    setPreview(null);
    setResult(null);
    setError(null);
    setProfile("");
  }

  return (
    <section
      className="backloggd-import"
      aria-labelledby="backloggd-import-title"
    >
      <header className="backloggd-import-header">
        <span className="backloggd-import-mark" aria-hidden>
          <Download size={19} />
        </span>
        <div>
          <small>{tri(lang, "IMPORTAÇÃO", "IMPORT", "IMPORTACIÓN")}</small>
          <h2 id="backloggd-import-title">
            {tri(
              lang,
              "Trazer jogos do Backloggd",
              "Bring games from Backloggd",
              "Traer juegos de Backloggd",
            )}
          </h2>
          <p>
            {tri(
              lang,
              "Confira uma coleção pública, valide os jogos no catálogo da IGDB e escolha quando adicionar os resultados.",
              "Check a public collection, validate its games against the IGDB catalog, and choose when to add the results.",
              "Comprueba una colección pública, valida sus juegos con el catálogo de IGDB y elige cuándo añadirlos.",
            )}
          </p>
        </div>
      </header>

      {!preview && !result && (
        <>
          <form className="backloggd-import-form" onSubmit={validateProfile}>
            <label htmlFor="backloggd-profile">
              {tri(
                lang,
                "Usuário ou link público",
                "Public username or link",
                "Usuario o enlace público",
              )}
            </label>
            <div
              className="backloggd-import-control"
              data-url={profileIsUrl || undefined}
            >
              {!profileIsUrl && <span aria-hidden>backloggd.com/u/</span>}
              <input
                id="backloggd-profile"
                name="backloggd-profile"
                type="text"
                inputMode="text"
                autoComplete="off"
                spellCheck={false}
                maxLength={200}
                value={profile}
                onChange={(event) => {
                  setProfile(event.target.value);
                  setError(null);
                }}
                placeholder={tri(
                  lang,
                  "seu-usuario",
                  "your-username",
                  "tu-usuario",
                )}
                disabled={pending !== null}
              />
              <button
                type="submit"
                disabled={pending !== null || !profile.trim()}
              >
                {pending === "preview" ? (
                  <LoaderCircle className="spin" size={16} />
                ) : (
                  <SearchCheck size={16} />
                )}
                {pending === "preview"
                  ? tri(lang, "Conferindo…", "Checking…", "Comprobando…")
                  : tri(
                      lang,
                      "Validar jogos",
                      "Validate games",
                      "Validar juegos",
                    )}
              </button>
            </div>
            <p>
              {tri(
                lang,
                "Não informe senha nem cookie. A coleta usa somente a página pública de jogos.",
                "Do not enter a password or cookie. Collection uses only the public games page.",
                "No introduzcas contraseña ni cookie. Solo se usa la página pública de juegos.",
              )}
            </p>
          </form>

          <div className="backloggd-import-guardrails">
            <article>
              <Gamepad2 size={17} />
              <div>
                <strong>
                  {tri(lang, "Somente jogos", "Games only", "Solo juegos")}
                </strong>
                <span>
                  {tri(
                    lang,
                    "Sem avaliações, notas ou diário.",
                    "No reviews, notes, or journal.",
                    "Sin reseñas, notas ni diario.",
                  )}
                </span>
              </div>
            </article>
            <article>
              <DatabaseZap size={17} />
              <div>
                <strong>
                  {tri(lang, "IGDB exata", "Exact IGDB", "IGDB exacta")}
                </strong>
                <span>
                  {tri(
                    lang,
                    "Slugs incertos são ignorados.",
                    "Uncertain slugs are skipped.",
                    "Los slugs inciertos se omiten.",
                  )}
                </span>
              </div>
            </article>
            <article>
              <ShieldCheck size={17} />
              <div>
                <strong>
                  {tri(
                    lang,
                    "Prévia primeiro",
                    "Preview first",
                    "Vista previa primero",
                  )}
                </strong>
                <span>
                  {tri(
                    lang,
                    "Nada é salvo sem confirmação.",
                    "Nothing is saved without confirmation.",
                    "Nada se guarda sin confirmación.",
                  )}
                </span>
              </div>
            </article>
          </div>
        </>
      )}

      {pending === "preview" && (
        <div
          className="backloggd-import-loading"
          aria-live="polite"
          aria-busy="true"
        >
          <span className="skeleton-block" />
          {Array.from({ length: 4 }, (_, index) => (
            <article key={index}>
              <span className="skeleton-block" />
              <div>
                <span className="skeleton-block" />
                <span className="skeleton-block" />
              </div>
            </article>
          ))}
        </div>
      )}

      {preview && (
        <div className="backloggd-import-preview">
          <div className="backloggd-preview-heading">
            <div>
              <small>
                {tri(
                  lang,
                  "PRÉVIA VALIDADA",
                  "VALIDATED PREVIEW",
                  "VISTA VALIDADA",
                )}
              </small>
              <h3>@{preview.sourceUsername}</h3>
              <p>
                {tri(
                  lang,
                  "A confirmação adiciona apenas jogos novos como não classificados e preserva tudo que já existe.",
                  "Confirmation adds only new games as unclassified and preserves everything already saved.",
                  "La confirmación añade solo juegos nuevos como no clasificados y conserva todo lo existente.",
                )}
              </p>
            </div>
            <a
              href={`https://backloggd.com/u/${encodeURIComponent(preview.sourceUsername)}/games/`}
              target="_blank"
              rel="noreferrer"
            >
              Backloggd <ExternalLink size={13} />
            </a>
          </div>

          <dl className="backloggd-preview-stats">
            <div>
              <dt>{tri(lang, "Encontrados", "Found", "Encontrados")}</dt>
              <dd>{preview.discoveredCount}</dd>
            </div>
            <div data-valid>
              <dt>{tri(lang, "Validados", "Validated", "Validados")}</dt>
              <dd>{preview.validatedCount}</dd>
            </div>
            <div>
              <dt>{tri(lang, "Já salvos", "Already saved", "Ya guardados")}</dt>
              <dd>{preview.existingCount}</dd>
            </div>
            <div data-warning={preview.skippedCount > 0 || undefined}>
              <dt>{tri(lang, "Ignorados", "Skipped", "Omitidos")}</dt>
              <dd>{preview.skippedCount}</dd>
            </div>
          </dl>

          {preview.games.length > 0 ? (
            <div className="backloggd-preview-games">
              {preview.games.map((game) => (
                <article
                  key={game.id}
                  data-existing={game.alreadySaved || undefined}
                >
                  <span className="backloggd-preview-cover">
                    <Image
                      src={game.coverUrl}
                      alt=""
                      fill
                      sizes="44px"
                      draggable={false}
                    />
                  </span>
                  <div>
                    <strong>{game.name}</strong>
                    <small>
                      {game.releaseYear ??
                        tri(lang, "Sem ano", "No year", "Sin año")}
                    </small>
                  </div>
                  <span>
                    {game.alreadySaved ? (
                      <>
                        <Check size={13} />
                        {tri(
                          lang,
                          "Na biblioteca",
                          "In library",
                          "En la biblioteca",
                        )}
                      </>
                    ) : (
                      <>{tri(lang, "Novo", "New", "Nuevo")}</>
                    )}
                  </span>
                </article>
              ))}
            </div>
          ) : (
            <p className="backloggd-preview-empty">
              {tri(
                lang,
                "Nenhum jogo pôde ser validado com segurança.",
                "No game could be validated safely.",
                "No se pudo validar ningún juego de forma segura.",
              )}
            </p>
          )}

          {preview.validatedCount > preview.previewedCount && (
            <p className="backloggd-preview-more">
              {tri(
                lang,
                `Mostrando ${preview.previewedCount} de ${preview.validatedCount} correspondências validadas.`,
                `Showing ${preview.previewedCount} of ${preview.validatedCount} validated matches.`,
                `Mostrando ${preview.previewedCount} de ${preview.validatedCount} coincidencias validadas.`,
              )}
            </p>
          )}

          <footer className="backloggd-preview-actions">
            <button type="button" onClick={reset} disabled={pending !== null}>
              <RotateCcw size={15} />
              {tri(lang, "Outro perfil", "Another profile", "Otro perfil")}
            </button>
            <button
              type="button"
              onClick={() => void commitImport()}
              disabled={pending !== null || preview.readyCount <= 0}
            >
              {pending === "commit" ? (
                <LoaderCircle className="spin" size={16} />
              ) : (
                <Download size={16} />
              )}
              {pending === "commit"
                ? tri(lang, "Importando…", "Importing…", "Importando…")
                : preview.readyCount > 0
                  ? tri(
                      lang,
                      `Importar ${gameCount(lang, preview.readyCount)}`,
                      `Import ${gameCount(lang, preview.readyCount)}`,
                      `Importar ${gameCount(lang, preview.readyCount)}`,
                    )
                  : tri(
                      lang,
                      "Biblioteca já sincronizada",
                      "Library already synced",
                      "Biblioteca ya sincronizada",
                    )}
            </button>
          </footer>
        </div>
      )}

      {result && (
        <div className="backloggd-import-success" role="status">
          <CheckCircle2 size={24} />
          <div>
            <small>
              {tri(
                lang,
                "IMPORTAÇÃO CONCLUÍDA",
                "IMPORT COMPLETE",
                "IMPORTACIÓN LISTA",
              )}
            </small>
            <h3>
              {tri(
                lang,
                `${gameCount(lang, result.importedCount)} ${result.importedCount === 1 ? "adicionado" : "adicionados"}`,
                `${gameCount(lang, result.importedCount)} added`,
                `${gameCount(lang, result.importedCount)} ${result.importedCount === 1 ? "añadido" : "añadidos"}`,
              )}
            </h3>
            <p>
              {tri(
                lang,
                `${gameCount(lang, result.existingCount)} já ${result.existingCount === 1 ? "estava" : "estavam"} na biblioteca e não ${result.existingCount === 1 ? "foi alterado" : "foram alterados"}.`,
                `${gameCount(lang, result.existingCount)} ${result.existingCount === 1 ? "was" : "were"} already in the library and left unchanged.`,
                `${gameCount(lang, result.existingCount)} ya ${result.existingCount === 1 ? "estaba" : "estaban"} en la biblioteca y no ${result.existingCount === 1 ? "se modificó" : "se modificaron"}.`,
              )}
            </p>
            <div>
              <Link href={`/${lang}/library`}>
                {tri(
                  lang,
                  "Abrir biblioteca",
                  "Open library",
                  "Abrir biblioteca",
                )}
              </Link>
              <button type="button" onClick={reset}>
                {tri(
                  lang,
                  "Nova importação",
                  "New import",
                  "Nueva importación",
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <p className="backloggd-import-error" role="alert">
          <TriangleAlert size={15} />
          {error}
        </p>
      )}
    </section>
  );
}
