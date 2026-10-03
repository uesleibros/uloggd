"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Copy,
  Pencil,
  Plus,
  Save,
  Trash2,
  Trophy,
  X,
  LoaderCircle,
} from "lucide-react";
import * as Dialog from "@/components/ui/dialog";
import { Tooltip } from "@/components/ui/tooltip";
import { UnsavedChangesGuard } from "@/components/ui/unsaved-changes";
import { SafeImage } from "@/components/safe-image";
import { api, ApiError } from "@/lib/api-client";
import { tri, uiText, type UiLang } from "@/lib/ui-text";
import {
  awardModeLabel,
  newAwardCategory,
  parseAward,
  type AwardAnswer,
  type AwardCategory,
  type AwardDocument,
  type AwardGame,
  type AwardRecord,
} from "@/lib/awards";
import { AwardSettings } from "./award-settings";
import { AwardNomineePicker } from "./award-nominee-picker";

export function AwardDetail({
  initial,
  lang,
}: {
  initial: AwardAnswer;
  lang: UiLang;
}) {
  const t = uiText(lang);
  const router = useRouter();
  const params = useSearchParams();
  const [saved, setSaved] = useState(initial.data);
  const [doc, setDoc] = useState<AwardDocument>(initial.data);
  const [games, setGames] = useState(initial.games);
  const [edit, setEdit] = useState(initial.owned && params.get("edit") === "1");
  const [sourceName, setSourceName] = useState(
    initial.source_list?.name ?? null,
  );
  const [pending, setPending] = useState(false);
  const [action, setAction] = useState<"DRAFT" | "PUBLISHED" | "DELETE" | null>(
    null,
  );
  const errorRef = useRef<HTMLParagraphElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState(false);
  const [settingsDoc, setSettingsDoc] = useState<AwardDocument>(initial.data);
  const [settingsName, setSettingsName] = useState(sourceName);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [invalid, setInvalid] = useState(initial.invalid_ids.length > 0);
  useEffect(() => {
    if (error && !deleteOpen)
      errorRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
  }, [error, deleteOpen]);
  const dirty =
    JSON.stringify(parseComparable(doc)) !==
    JSON.stringify(parseComparable(saved));
  const gameMap = new Map(games.map((g) => [g.id, g]));
  const sourceChanged =
    doc.source !== saved.source ||
    doc.source_list_id !== saved.source_list_id ||
    (doc.source === "PLAYED_YEAR" && doc.year !== saved.year);
  function updateCategory(id: string, change: Partial<AwardCategory>) {
    setDoc((current) => ({
      ...current,
      categories: current.categories.map((c) =>
        c.id === id ? { ...c, ...change } : c,
      ),
    }));
    setMessage(null);
  }
  function reorder(index: number, direction: number) {
    const categories = [...doc.categories];
    [categories[index], categories[index + direction]] = [
      categories[index + direction],
      categories[index],
    ];
    setDoc({ ...doc, categories });
  }
  function add(category: AwardCategory, game: AwardGame) {
    if (
      category.nominees.includes(game.id) ||
      category.nominees.length >= category.max_nominees
    )
      return;
    setGames((current) =>
      current.some((g) => g.id === game.id) ? current : [...current, game],
    );
    updateCategory(category.id, { nominees: [...category.nominees, game.id] });
  }
  async function save(status: AwardDocument["status"]) {
    setAction(status);
    if (pending) return;
    setError(null);
    setMessage(null);
    setPending(true);
    try {
      const value = parseAward({ ...doc, status });
      const answer = await api.patch<{ data: AwardRecord }>(
        `/awards/${saved.public_id}`,
        { ...value, version: saved.version },
      );
      setSaved(answer.data);
      setDoc(answer.data);
      setInvalid(false);
      setMessage(
        tri(lang, "Premiação salva.", "Awards saved.", "Premios guardados."),
      );
      if (status === "PUBLISHED") setEdit(false);
    } catch (reason) {
      setError(
        reason instanceof ApiError && reason.code === "conflict"
          ? tri(
              lang,
              "Esta edição foi alterada em outra aba. Recarregue para ver a versão atual antes de salvar.",
              "This edition changed in another tab. Reload to see the current version before saving.",
              "Esta edición cambió en otra pestaña. Recarga para ver la versión actual antes de guardar.",
            )
          : tri(
              lang,
              "Confira os nomes, limites e jogos elegíveis. Para publicar, todas as categorias precisam de ao menos um indicado.",
              "Check names, limits and eligible games. Publishing requires at least one nominee in every category.",
              "Revisa nombres, límites y juegos elegibles. Para publicar, todas las categorías necesitan al menos un nominado.",
            ),
      );
    } finally {
      setPending(false);
    }
  }
  async function remove() {
    setAction("DELETE");
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      await api.delete(`/awards/${saved.public_id}`);
      router.replace(`/${lang}/awards`);
    } catch {
      setError(
        tri(
          lang,
          "Não foi possível excluir esta edição.",
          "Could not delete this edition.",
          "No se pudo eliminar esta edición.",
        ),
      );
      setPending(false);
    }
  }
  const winnerLabel =
    doc.mode === "PREDICTIONS"
      ? tri(lang, "Meu palpite", "My prediction", "Mi predicción")
      : tri(lang, "Vencedor", "Winner", "Ganador");
  const eligibilityChanged =
    settingsDoc.source !== doc.source ||
    settingsDoc.source_list_id !== doc.source_list_id ||
    (settingsDoc.source === "PLAYED_YEAR" && settingsDoc.year !== doc.year);
  return (
    <main className="awards-page awards-detail">
      <UnsavedChangesGuard dirty={dirty && !pending} lang={lang} />
      <Link className="awards-back" href={`/${lang}/awards`}>
        <ArrowLeft size={16} />
        {tri(lang, "Premiações", "Awards", "Premios")}
      </Link>
      <header className="awards-hero">
        <div>
          <span className="awards-eyebrow">
            <Trophy size={16} />
            {doc.year} · {awardModeLabel(doc.mode, lang)}
          </span>
          <h1>{doc.name}</h1>
          <div className="awards-header-meta">
            <Link
              className="awards-author"
              href={`/${lang}/u/${initial.author.username}`}
            >
              @{initial.author.username}
            </Link>
            <span className="awards-badge">
              {saved.status === "DRAFT"
                ? tri(lang, "Rascunho", "Draft", "Borrador")
                : tri(lang, "Publicado", "Published", "Publicado")}
            </span>
          </div>
        </div>
        <div className="awards-actions">
          <button
            type="button"
            className="awards-button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(
                  `${location.origin}/${lang}/awards/${saved.public_id}`,
                );
                setMessage(
                  tri(lang, "Link copiado.", "Link copied.", "Enlace copiado."),
                );
              } catch {
                setError(
                  tri(
                    lang,
                    "Não foi possível copiar o link.",
                    "Could not copy the link.",
                    "No se pudo copiar el enlace.",
                  ),
                );
              }
            }}
          >
            <Copy size={15} />
            {t.copyLink}
          </button>
          {initial.owned && !edit && (
            <button
              type="button"
              className="awards-button"
              data-primary
              onClick={() => setEdit(true)}
            >
              <Pencil size={15} />
              {t.edit}
            </button>
          )}
        </div>
      </header>
      <section className="awards-rules">
        <h2>
          {tri(
            lang,
            "Regras desta edição",
            "Edition rules",
            "Reglas de la edición",
          )}
        </h2>
        <p className="awards-rule-text">
          {doc.rules ||
            tri(
              lang,
              "As categorias e os limites de indicados são definidos pelo autor.",
              "Categories and nominee limits are set by the author.",
              "El autor define las categorías y los límites de nominados.",
            )}
        </p>
        <p className="awards-help">
          {doc.source === "LIST" ? (
            <>
              {tri(
                lang,
                "Jogos da lista atual: ",
                "Games from the current list: ",
                "Juegos de la lista actual: ",
              )}
              {initial.source_list &&
              doc.source_list_id === initial.data.source_list_id ? (
                <Link href={`/${lang}/lists/${initial.source_list.public_id}`}>
                  {sourceName}
                </Link>
              ) : (
                sourceName ||
                tri(lang, "Lista base", "Source list", "Lista base")
              )}
              .{" "}
              {tri(
                lang,
                "Se um jogo sair da lista, sua indicação e vitória deixam de aparecer.",
                "If a game leaves the list, its nomination and win stop appearing.",
                "Si un juego sale de la lista, su nominación y victoria dejan de aparecer.",
              )}
            </>
          ) : doc.source === "PLAYED_YEAR" ? (
            tri(
              lang,
              `Jogos registrados pelo autor em ${doc.year}.`,
              `Games logged by the author in ${doc.year}.`,
              `Juegos registrados por el autor en ${doc.year}.`,
            )
          ) : (
            tri(
              lang,
              "Todo o catálogo de jogos é elegível.",
              "The entire game catalogue is eligible.",
              "Todo el catálogo de juegos es elegible.",
            )
          )}
        </p>
      </section>
      {invalid && initial.owned && (
        <p className="awards-notice" role="status">
          {tri(
            lang,
            "Alguns jogos não pertencem mais à base elegível. As indicações e vitórias deles foram ocultadas. Revise as categorias e salve a edição.",
            "Some games no longer belong to the eligible pool. Their nominations and wins were hidden. Review the categories and save this edition.",
            "Algunos juegos ya no pertenecen a la base elegible. Sus nominaciones y victorias se ocultaron. Revisa las categorías y guarda la edición.",
          )}
        </p>
      )}
      {message && (
        <p role="status" className="awards-notice">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" ref={errorRef} className="awards-error">
          {error}
        </p>
      )}
      {edit && (
        <div className="awards-editor-bar">
          <button
            className="awards-button"
            disabled={pending}
            type="button"
            onClick={() => {
              setSettingsDoc(doc);
              setSettingsName(sourceName);
              setSettings(true);
            }}
          >
            <Pencil size={15} />
            {tri(lang, "Nome e regras", "Name and rules", "Nombre y reglas")}
          </button>
          <span>
            {doc.categories.length}/30{" "}
            {tri(lang, "categorias", "categories", "categorías")}
          </span>
          <button
            className="awards-button"
            disabled={pending || doc.categories.length >= 30}
            type="button"
            onClick={() =>
              setDoc({
                ...doc,
                categories: [
                  ...doc.categories,
                  newAwardCategory(
                    tri(
                      lang,
                      "Nova categoria",
                      "New category",
                      "Nueva categoría",
                    ),
                    crypto.randomUUID(),
                  ),
                ],
              })
            }
          >
            <Plus size={15} />
            {tri(lang, "Nova categoria", "New category", "Nueva categoría")}
          </button>
        </div>
      )}
      {sourceChanged && edit && (
        <p className="awards-notice">
          {tri(
            lang,
            "Salve as novas regras antes de escolher indicados.",
            "Save the new rules before choosing nominees.",
            "Guarda las nuevas reglas antes de elegir nominados.",
          )}
        </p>
      )}
      <div className="awards-categories">
        {doc.categories.map((category, index) => (
          <section className="awards-category" key={category.id}>
            <header className="awards-category-header">
              <span className="awards-category-number">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div>
                {edit ? (
                  <>
                    <input
                      aria-label={tri(
                        lang,
                        "Nome da categoria",
                        "Category name",
                        "Nombre de la categoría",
                      )}
                      maxLength={100}
                      value={category.name}
                      disabled={pending}
                      onChange={(e) =>
                        updateCategory(category.id, { name: e.target.value })
                      }
                    />
                    <textarea
                      rows={1}
                      maxLength={1000}
                      disabled={pending}
                      aria-label={tri(
                        lang,
                        "Descrição da categoria",
                        "Category description",
                        "Descripción de la categoría",
                      )}
                      placeholder={tri(
                        lang,
                        "Descrição ou regra específica (opcional)",
                        "Description or specific rule (optional)",
                        "Descripción o regla específica (opcional)",
                      )}
                      value={category.description}
                      onChange={(e) =>
                        updateCategory(category.id, {
                          description: e.target.value,
                        })
                      }
                    />
                  </>
                ) : (
                  <>
                    <h2>{category.name}</h2>
                    {category.description && <p>{category.description}</p>}
                  </>
                )}
              </div>
              {edit && (
                <div className="awards-category-controls">
                  <Tooltip
                    label={tri(lang, "Mover para cima", "Move up", "Subir")}
                  >
                    <button
                      type="button"
                      className="awards-icon-button"
                      disabled={pending || index === 0}
                      onClick={() => reorder(index, -1)}
                      aria-label={tri(
                        lang,
                        "Mover para cima",
                        "Move up",
                        "Subir",
                      )}
                    >
                      <ArrowUp size={16} />
                    </button>
                  </Tooltip>
                  <Tooltip
                    label={tri(lang, "Mover para baixo", "Move down", "Bajar")}
                  >
                    <button
                      type="button"
                      className="awards-icon-button"
                      disabled={pending || index === doc.categories.length - 1}
                      onClick={() => reorder(index, 1)}
                      aria-label={tri(
                        lang,
                        "Mover para baixo",
                        "Move down",
                        "Bajar",
                      )}
                    >
                      <ArrowDown size={16} />
                    </button>
                  </Tooltip>
                  <Tooltip
                    label={tri(
                      lang,
                      "Remover categoria",
                      "Remove category",
                      "Eliminar categoría",
                    )}
                  >
                    <button
                      type="button"
                      className="awards-icon-button"
                      data-danger
                      disabled={pending || doc.categories.length === 1}
                      onClick={() =>
                        setDoc({
                          ...doc,
                          categories: doc.categories.filter(
                            (c) => c.id !== category.id,
                          ),
                        })
                      }
                      aria-label={tri(
                        lang,
                        "Remover categoria",
                        "Remove category",
                        "Eliminar categoría",
                      )}
                    >
                      <Trash2 size={16} />
                    </button>
                  </Tooltip>
                </div>
              )}
            </header>
            {edit && (
              <div className="awards-category-limit">
                <label>
                  {tri(
                    lang,
                    "Limite de indicados",
                    "Nominee limit",
                    "Límite de nominados",
                  )}
                  <input
                    type="number"
                    min={Math.max(1, category.nominees.length)}
                    max={20}
                    value={category.max_nominees || ""}
                    disabled={pending}
                    onChange={(e) =>
                      updateCategory(category.id, {
                        max_nominees: Number(e.target.value),
                      })
                    }
                  />
                </label>
                <span>
                  {category.nominees.length}/{category.max_nominees}
                </span>
              </div>
            )}
            <div className="awards-nominees">
              {category.nominees.map((id) => {
                const game = gameMap.get(id);
                if (!game) return null;
                const winner = category.winner === id;
                return (
                  <article
                    className="awards-nominee"
                    data-winner={winner || undefined}
                    key={id}
                  >
                    <Link
                      href={`/${lang}/game/${game.slug}`}
                      className="awards-nominee-cover"
                    >
                      <SafeImage
                        src={game.coverUrl}
                        alt={game.name}
                        fill
                        sizes="(max-width: 600px) 40vw, 180px"
                      />
                      {winner && (
                        <span className="awards-winner">
                          <Trophy size={15} />
                          {winnerLabel}
                        </span>
                      )}
                    </Link>
                    <Link
                      className="awards-game-name"
                      href={`/${lang}/game/${game.slug}`}
                    >
                      {game.name}
                    </Link>
                    {edit && (
                      <div className="awards-nominee-actions">
                        <button
                          type="button"
                          disabled={pending}
                          className="awards-button"
                          data-selected={winner || undefined}
                          aria-pressed={winner}
                          aria-label={`${winnerLabel}: ${game.name}`}
                          onClick={() =>
                            updateCategory(category.id, {
                              winner: winner ? null : id,
                            })
                          }
                        >
                          <Trophy size={14} />
                          {winnerLabel}
                        </button>
                        <Tooltip
                          label={tri(
                            lang,
                            "Remover indicado",
                            "Remove nominee",
                            "Eliminar nominado",
                          )}
                        >
                          <button
                            type="button"
                            disabled={pending}
                            className="awards-icon-button"
                            aria-label={`${tri(lang, "Remover", "Remove", "Eliminar")} ${game.name}`}
                            onClick={() =>
                              updateCategory(category.id, {
                                nominees: category.nominees.filter(
                                  (n) => n !== id,
                                ),
                                winner: winner ? null : category.winner,
                              })
                            }
                          >
                            <X size={16} />
                          </button>
                        </Tooltip>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
            {!category.nominees.length && (
              <p className="awards-empty-category">
                {tri(
                  lang,
                  "Nenhum indicado nesta categoria ainda.",
                  "No nominees in this category yet.",
                  "Todavía no hay nominados en esta categoría.",
                )}
              </p>
            )}
            {edit && (
              <AwardNomineePicker
                awardId={saved.public_id}
                category={category}
                unrestricted={doc.source === "CATALOG"}
                disabled={pending || sourceChanged}
                onAdd={(g) => add(category, g)}
                lang={lang}
              />
            )}
          </section>
        ))}
      </div>
      {edit && (
        <footer className="awards-save-bar">
          <button
            type="button"
            className="awards-button"
            data-danger
            disabled={pending}
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 size={15} />
            {tri(lang, "Excluir edição", "Delete edition", "Eliminar edición")}
          </button>
          <span>
            {dirty
              ? t.unsavedChanges
              : tri(lang, "Tudo salvo", "All saved", "Todo guardado")}
          </span>
          <button
            type="button"
            className="awards-button"
            disabled={pending}
            onClick={() => void save("DRAFT")}
          >
            {pending && action === "DRAFT" ? (
              <LoaderCircle size={15} className="spin" />
            ) : (
              <Save size={15} />
            )}
            {tri(lang, "Salvar rascunho", "Save draft", "Guardar borrador")}
          </button>
          <button
            type="button"
            className="awards-button"
            data-primary
            disabled={pending}
            onClick={() => void save("PUBLISHED")}
          >
            {pending && action === "PUBLISHED" ? (
              <LoaderCircle size={15} className="spin" />
            ) : (
              <Trophy size={15} />
            )}{" "}
            {tri(
              lang,
              "Publicar edição",
              "Publish edition",
              "Publicar edición",
            )}
          </button>
        </footer>
      )}
      <Dialog.Root open={settings} onOpenChange={setSettings}>
        <Dialog.Portal>
          <Dialog.Overlay className="create-list-overlay" />
          <Dialog.Content className="create-list-dialog awards-create-dialog">
            <header>
              <div>
                <Dialog.Title>
                  {tri(
                    lang,
                    "Configurar edição",
                    "Edition settings",
                    "Configurar edición",
                  )}
                </Dialog.Title>
                <Dialog.Description>
                  {tri(
                    lang,
                    "Personalize sua premiação.",
                    "Customize your awards.",
                    "Personaliza tus premios.",
                  )}
                </Dialog.Description>
              </div>
              <Dialog.Close aria-label={t.close}>
                <X size={18} />
              </Dialog.Close>
            </header>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setDoc({
                  ...settingsDoc,
                  categories: eligibilityChanged
                    ? settingsDoc.categories.map((c) => ({
                        ...c,
                        nominees: [],
                        winner: null,
                      }))
                    : settingsDoc.categories,
                });
                setSourceName(settingsName);
                setSettings(false);
              }}
            >
              <AwardSettings
                doc={settingsDoc}
                onChange={setSettingsDoc}
                sourceName={settingsName}
                onSourceName={setSettingsName}
                lang={lang}
              />
              {eligibilityChanged &&
                doc.categories.some((c) => c.nominees.length > 0) && (
                  <p className="awards-notice">
                    {tri(
                      lang,
                      "Ao aplicar uma nova base de jogos, as indicações e vencedores desta edição serão limpos para você escolher novamente.",
                      "Applying a new game pool clears this edition's nominees and winners so you can choose again.",
                      "Aplicar una nueva base de juegos borra los nominados y ganadores de esta edición para elegir de nuevo.",
                    )}
                  </p>
                )}
              <footer>
                <Dialog.Close className="awards-button">
                  {t.cancel}
                </Dialog.Close>
                <button
                  type="submit"
                  className="awards-button"
                  data-primary
                  disabled={
                    settingsDoc.source === "LIST" && !settingsDoc.source_list_id
                  }
                >
                  {tri(lang, "Aplicar regras", "Apply rules", "Aplicar reglas")}
                </button>
              </footer>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      <Dialog.Root
        open={deleteOpen}
        onOpenChange={(next) => {
          if (!pending) setDeleteOpen(next);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="create-list-overlay" />
          <Dialog.Content className="create-list-dialog">
            <header>
              <div>
                <Dialog.Title>
                  {tri(
                    lang,
                    "Excluir esta edição?",
                    "Delete this edition?",
                    "¿Eliminar esta edición?",
                  )}
                </Dialog.Title>
                <Dialog.Description>
                  {tri(
                    lang,
                    "Categorias, indicações e vencedores serão removidos permanentemente.",
                    "Categories, nominees and winners will be permanently removed.",
                    "Las categorías, nominaciones y ganadores se eliminarán permanentemente.",
                  )}
                </Dialog.Description>
              </div>
            </header>
            {error && (
              <p role="alert" className="awards-error">
                {error}
              </p>
            )}
            <footer>
              <Dialog.Close className="awards-button" disabled={pending}>
                {t.cancel}
              </Dialog.Close>
              <button
                type="button"
                className="awards-button"
                data-danger
                disabled={pending}
                onClick={() => void remove()}
              >
                {pending && <LoaderCircle size={15} className="spin" />}
                {tri(
                  lang,
                  "Excluir edição",
                  "Delete edition",
                  "Eliminar edición",
                )}
              </button>
            </footer>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </main>
  );
}

function parseComparable(doc: AwardDocument): AwardDocument {
  const {
    name,
    year,
    mode,
    rules,
    source,
    source_list_id,
    visibility,
    status,
    categories,
  } = doc;
  return {
    name,
    year,
    mode,
    rules,
    source,
    source_list_id,
    visibility,
    status,
    categories,
  };
}
