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
import * as Dialog from "@/components/ui/dialog";
import { tri, type UiLang } from "@/lib/ui-text";

type ImportStatus = "WISHLIST" | "BACKLOG" | "PLAYING" | "COMPLETED";

type PreviewGame = {
  id: number;
  name: string;
  slug: string;
  coverUrl: string;
  releaseYear: number | null;
  alreadySaved: boolean;
  status: ImportStatus;
  playing: boolean;
  backlog: boolean;
  wishlist: boolean;
  personalRating: number | null;
};

type Preview = {
  importId: string;
  sourceUsername: string;
  sourceDisplayName: string;
  sourceAvatarUrl: string | null;
  sourcePageCount: number;
  discoveredCount: number;
  validatedCount: number;
  existingCount: number;
  readyCount: number;
  readyRatedCount: number;
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

type ImportErrorState = {
  title: string;
  message: string;
  reference?: string;
};

class ImportRequestError extends Error {
  constructor(
    code: string,
    public readonly reference?: string,
  ) {
    super(code);
    this.name = "ImportRequestError";
  }
}

const BACKLOGGD_MARK_URL = "https://backloggd.com/apple-touch-icon.png";

function BackloggdMark() {
  const [failed, setFailed] = useState(false);
  return (
    <span className="backloggd-import-mark" aria-hidden>
      {failed ? (
        <span>B</span>
      ) : (
        <Image
          src={BACKLOGGD_MARK_URL}
          width={42}
          height={42}
          alt=""
          unoptimized
          onError={() => setFailed(true)}
        />
      )}
    </span>
  );
}

function BackloggdAvatar({ src, name }: { src: string | null; name: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className="backloggd-preview-avatar" aria-hidden>
      {src && !failed ? (
        <Image
          src={src}
          width={48}
          height={48}
          alt=""
          unoptimized
          onError={() => setFailed(true)}
        />
      ) : (
        name.slice(0, 1).toUpperCase()
      )}
    </span>
  );
}

function fallbackErrorCode(status: number) {
  if (status === 401) return "unauthorized";
  if (status === 403) return "request_blocked";
  if (status === 429) return "rate_limited";
  if (status === 502) return "gateway_error";
  if (status === 503) return "service_unavailable";
  if (status === 504) return "source_timeout";
  return "request_failed";
}

async function readImportResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  let payload: { error?: string; reference?: string } | null = null;
  if (text) {
    try {
      const parsed: unknown = JSON.parse(text);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed))
        payload = parsed as { error?: string; reference?: string };
    } catch {
      payload = null;
    }
  }
  const reference =
    payload?.reference ??
    response.headers.get("X-Import-Reference") ??
    undefined;
  if (!response.ok || payload?.error)
    throw new ImportRequestError(
      payload?.error ?? fallbackErrorCode(response.status),
      reference,
    );
  if (!payload) throw new ImportRequestError("invalid_response", reference);
  return payload as T;
}

function errorCopy(lang: UiLang, code: string, reference?: string) {
  const titles: Record<string, [string, string, string]> = {
    partner_access_required: [
      "Verificação do Backloggd não concluída",
      "Backloggd verification could not finish",
      "No se completó la verificación de Backloggd",
    ],
    source_timeout: [
      "Backloggd demorou para responder",
      "Backloggd took too long to respond",
      "Backloggd tardó demasiado en responder",
    ],
    request_blocked: [
      "Solicitação bloqueada",
      "Request blocked",
      "Solicitud bloqueada",
    ],
    rate_limited: [
      "Limite temporário atingido",
      "Temporary limit reached",
      "Límite temporal alcanzado",
    ],
  };
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
      "O desafio de acesso mudou ou ultrapassou os limites seguros da importação. Tente novamente; nenhum dado foi importado.",
      "The access challenge changed or exceeded the import safety limits. Try again; no data was imported.",
      "El desafío de acceso cambió o superó los límites seguros de importación. Inténtalo de nuevo; no se importó ningún dato.",
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
    source_timeout: [
      "A coleção não respondeu dentro do limite seguro. Aguarde um instante e tente novamente.",
      "The collection did not respond within the safe time limit. Wait a moment and try again.",
      "La colección no respondió dentro del límite seguro. Espera un momento e inténtalo de nuevo.",
    ],
    source_unavailable: [
      "O Backloggd respondeu com uma indisponibilidade temporária. Nenhum dado foi importado.",
      "Backloggd returned a temporary availability error. No data was imported.",
      "Backloggd devolvió un error temporal de disponibilidad. No se importó ningún dato.",
    ],
    invalid_source: [
      "A resposta do Backloggd não correspondeu a uma coleção pública válida.",
      "The Backloggd response did not match a valid public collection.",
      "La respuesta de Backloggd no correspondió a una colección pública válida.",
    ],
    catalog_unavailable: [
      "A coleção foi lida, mas o catálogo não pôde validá-la agora. Tente novamente em alguns minutos.",
      "The collection was read, but the catalog could not validate it right now. Try again in a few minutes.",
      "La colección fue leída, pero el catálogo no pudo validarla ahora. Inténtalo de nuevo en unos minutos.",
    ],
    partner_configuration_invalid: [
      "A credencial de parceria está incompleta no servidor. A equipe já pode localizar esta tentativa pela referência abaixo.",
      "The partner credential is incomplete on the server. The team can locate this attempt using the reference below.",
      "La credencial de socio está incompleta en el servidor. El equipo puede localizar este intento con la referencia siguiente.",
    ],
    request_blocked: [
      "A proteção de acesso do ambiente interrompeu a solicitação. Recarregue a página e tente novamente.",
      "The environment's access protection interrupted the request. Reload the page and try again.",
      "La protección de acceso del entorno interrumpió la solicitud. Recarga la página e inténtalo de nuevo.",
    ],
    unauthorized: [
      "Sua sessão expirou. Entre novamente antes de iniciar a importação.",
      "Your session expired. Sign in again before starting the import.",
      "Tu sesión caducó. Inicia sesión de nuevo antes de importar.",
    ],
    gateway_error: [
      "Um serviço externo interrompeu a conferência. Tente novamente em alguns minutos.",
      "An external service interrupted the check. Try again in a few minutes.",
      "Un servicio externo interrumpió la comprobación. Inténtalo de nuevo en unos minutos.",
    ],
    service_unavailable: [
      "A importação está temporariamente indisponível. Tente novamente em alguns minutos.",
      "Import is temporarily unavailable. Try again in a few minutes.",
      "La importación no está disponible temporalmente. Inténtalo de nuevo en unos minutos.",
    ],
    preview_expired: [
      "A prévia expirou. Valide o perfil novamente antes de importar.",
      "The preview expired. Validate the profile again before importing.",
      "La vista previa caducó. Valida el perfil de nuevo antes de importar.",
    ],
    import_not_found: [
      "Essa prévia não existe mais ou pertence a outra sessão. Valide o perfil novamente.",
      "This preview no longer exists or belongs to another session. Validate the profile again.",
      "Esta vista previa ya no existe o pertenece a otra sesión. Valida el perfil de nuevo.",
    ],
    import_unavailable: [
      "Essa prévia não está mais disponível para confirmação. Inicie uma nova conferência.",
      "This preview is no longer available for confirmation. Start a new check.",
      "Esta vista previa ya no está disponible para confirmar. Inicia una nueva comprobación.",
    ],
    import_failed: [
      "A biblioteca não pôde salvar a prévia. Nenhum jogo foi adicionado; tente novamente.",
      "The library could not save the preview. No games were added; try again.",
      "La biblioteca no pudo guardar la vista previa. No se añadió ningún juego; inténtalo de nuevo.",
    ],
  };
  const title = titles[code] ?? [
    "Não foi possível conferir",
    "The check could not be completed",
    "No se pudo completar la comprobación",
  ];
  const message = messages[code] ?? [
    "Não foi possível concluir a conferência agora. Tente novamente mais tarde.",
    "The check could not be completed right now. Try again later.",
    "No se pudo completar la comprobación. Inténtalo de nuevo más tarde.",
  ];
  return {
    title: tri(lang, ...title),
    message: tri(lang, ...message),
    reference,
  };
}

function gameCount(lang: UiLang, count: number) {
  return tri(
    lang,
    `${count} ${count === 1 ? "jogo" : "jogos"}`,
    `${count} ${count === 1 ? "game" : "games"}`,
    `${count} ${count === 1 ? "juego" : "juegos"}`,
  );
}

function gameCategories(lang: UiLang, game: PreviewGame) {
  const categories: string[] = [];
  if (game.status === "COMPLETED")
    categories.push(tri(lang, "Jogado", "Played", "Jugado"));
  if (game.playing) categories.push(tri(lang, "Jogando", "Playing", "Jugando"));
  if (game.backlog) categories.push("Backlog");
  if (game.wishlist)
    categories.push(tri(lang, "Desejos", "Wishlist", "Deseos"));
  return categories;
}

function personalRating(lang: UiLang, rating: number) {
  const locale = lang === "pt-BR" ? "pt-BR" : lang === "es" ? "es" : "en";
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(rating / 20)} ★`;
}

export function BackloggdImportSettings({ lang }: { lang: UiLang }) {
  const router = useRouter();
  const [profile, setProfile] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [pending, setPending] = useState<"preview" | "commit" | null>(null);
  const [error, setError] = useState<ImportErrorState | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const profileIsUrl = /^https?:\/\//i.test(profile.trim());

  async function validateProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending("preview");
    setError(null);
    setPreview(null);
    setResult(null);
    setConfirmOpen(false);
    try {
      const response = await fetch("/api/imports/backloggd/preview", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile }),
      });
      const payload = await readImportResponse<Preview>(response);
      setPreview(payload);
    } catch (requestError) {
      const code =
        requestError instanceof Error ? requestError.message : "preview_failed";
      const reference =
        requestError instanceof ImportRequestError
          ? requestError.reference
          : undefined;
      setError(errorCopy(lang, code, reference));
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
      const payload = await readImportResponse<ImportResult>(response);
      setResult(payload);
      setPreview(null);
      setConfirmOpen(false);
      router.refresh();
    } catch (requestError) {
      const code =
        requestError instanceof Error ? requestError.message : "import_failed";
      const reference =
        requestError instanceof ImportRequestError
          ? requestError.reference
          : undefined;
      setError(errorCopy(lang, code, reference));
      setConfirmOpen(false);
    } finally {
      setPending(null);
    }
  }

  function reset() {
    setPreview(null);
    setResult(null);
    setError(null);
    setProfile("");
    setConfirmOpen(false);
  }

  return (
    <section
      className="backloggd-import"
      aria-labelledby="backloggd-import-title"
    >
      <header className="backloggd-import-header">
        <BackloggdMark />
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
                    "Categorias e nota pessoal incluídas; sem reviews ou diário.",
                    "Categories and personal rating included; no reviews or journal.",
                    "Categorías y nota personal incluidas; sin reseñas ni diario.",
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
          <div className="backloggd-import-loading-profile">
            <span className="skeleton-block" />
            <div>
              <span className="skeleton-block" />
              <span className="skeleton-block" />
            </div>
          </div>
          <div className="backloggd-import-loading-stats">
            {Array.from({ length: 4 }, (_, index) => (
              <span className="skeleton-block" key={index} />
            ))}
          </div>
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
            <div className="backloggd-preview-profile">
              <BackloggdAvatar
                key={preview.sourceAvatarUrl ?? preview.sourceUsername}
                src={preview.sourceAvatarUrl}
                name={preview.sourceDisplayName}
              />
              <div>
                <small>
                  {tri(
                    lang,
                    "PRÉVIA VALIDADA",
                    "VALIDATED PREVIEW",
                    "VISTA VALIDADA",
                  )}
                </small>
                <h3>{preview.sourceDisplayName}</h3>
                <span className="backloggd-preview-handle">
                  @{preview.sourceUsername} · {preview.sourcePageCount}{" "}
                  {tri(
                    lang,
                    preview.sourcePageCount === 1
                      ? "página conferida"
                      : "páginas conferidas",
                    preview.sourcePageCount === 1
                      ? "page checked"
                      : "pages checked",
                    preview.sourcePageCount === 1
                      ? "página comprobada"
                      : "páginas comprobadas",
                  )}
                </span>
                <p>
                  {tri(
                    lang,
                    "Cada jogo novo mantém suas categorias e sua nota pessoal do Backloggd. O que já existe permanece intacto.",
                    "Each new game keeps its Backloggd categories and personal rating. Existing records remain untouched.",
                    "Cada juego nuevo conserva sus categorías y su nota personal de Backloggd. Lo existente permanece intacto.",
                  )}
                </p>
              </div>
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
                    <small className="backloggd-preview-metadata">
                      <span>
                        {game.releaseYear ??
                          tri(lang, "Sem ano", "No year", "Sin año")}
                      </span>
                      {gameCategories(lang, game).map((category) => (
                        <span data-category key={category}>
                          {category}
                        </span>
                      ))}
                      {game.personalRating !== null && (
                        <span data-rating>
                          {personalRating(lang, game.personalRating)}
                        </span>
                      )}
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
              onClick={() => setConfirmOpen(true)}
              disabled={pending !== null || preview.readyCount <= 0}
            >
              <Download size={16} />
              {preview.readyCount > 0
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

          <Dialog.Root
            open={confirmOpen}
            onOpenChange={(open) => {
              if (pending !== "commit") setConfirmOpen(open);
            }}
          >
            <Dialog.Portal>
              <Dialog.Overlay className="backloggd-confirm-overlay" />
              <Dialog.Content className="backloggd-confirm-dialog">
                <span className="backloggd-confirm-mark" aria-hidden>
                  <Download size={20} />
                </span>
                <Dialog.Title>
                  {tri(
                    lang,
                    "Confirmar importação?",
                    "Confirm import?",
                    "¿Confirmar importación?",
                  )}
                </Dialog.Title>
                <Dialog.Description>
                  {tri(
                    lang,
                    `Você está prestes a adicionar ${gameCount(lang, preview.readyCount)} de @${preview.sourceUsername}.`,
                    `You are about to add ${gameCount(lang, preview.readyCount)} from @${preview.sourceUsername}.`,
                    `Estás a punto de añadir ${gameCount(lang, preview.readyCount)} de @${preview.sourceUsername}.`,
                  )}
                </Dialog.Description>
                <dl className="backloggd-confirm-summary">
                  <div>
                    <dt>
                      {tri(lang, "Jogos novos", "New games", "Juegos nuevos")}
                    </dt>
                    <dd>{preview.readyCount}</dd>
                  </div>
                  <div>
                    <dt>
                      {tri(
                        lang,
                        "Com categoria",
                        "With category",
                        "Con categoría",
                      )}
                    </dt>
                    <dd>{preview.readyCount}</dd>
                  </div>
                  <div>
                    <dt>{tri(lang, "Com nota", "With rating", "Con nota")}</dt>
                    <dd>{preview.readyRatedCount}</dd>
                  </div>
                </dl>
                <p className="backloggd-confirm-note">
                  <ShieldCheck size={14} />
                  {tri(
                    lang,
                    `${gameCount(lang, preview.existingCount)} já salvos não serão alterados.`,
                    `${gameCount(lang, preview.existingCount)} already saved will not be changed.`,
                    `${gameCount(lang, preview.existingCount)} ya guardados no se modificarán.`,
                  )}
                </p>
                <footer>
                  <Dialog.Close type="button" disabled={pending === "commit"}>
                    {tri(lang, "Cancelar", "Cancel", "Cancelar")}
                  </Dialog.Close>
                  <button
                    type="button"
                    onClick={() => void commitImport()}
                    disabled={pending === "commit"}
                  >
                    {pending === "commit" ? (
                      <LoaderCircle className="spin" size={16} />
                    ) : (
                      <Download size={16} />
                    )}
                    {pending === "commit"
                      ? tri(lang, "Importando…", "Importing…", "Importando…")
                      : tri(
                          lang,
                          "Sim, importar agora",
                          "Yes, import now",
                          "Sí, importar ahora",
                        )}
                  </button>
                </footer>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
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
        <div className="backloggd-import-error" role="alert">
          <TriangleAlert size={15} />
          <div>
            <strong>{error.title}</strong>
            <span>{error.message}</span>
            {error.reference && (
              <small>
                {tri(lang, "Referência", "Reference", "Referencia")}:{" "}
                {error.reference}
              </small>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
