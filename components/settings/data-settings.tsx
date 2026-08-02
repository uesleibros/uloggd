"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Download,
  LoaderCircle,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import {
  BookOpen,
  Eye,
  Images,
  LibraryBig,
  ListTree,
  MessageSquare,
  Route,
  Star,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { tri, type UiLang } from "@/lib/ui-text";

/**
 * What can be cleared, one at a time.
 *
 * Deliberately not an "everything" button that stops short of the account:
 * someone who wants all of it gone wants the account gone, and a half-erased
 * account that still appears in follower lists is the confusing middle state
 * nobody asked for.
 */
const CATEGORIES: {
  id: string;
  Icon: LucideIcon;
  label: (lang: UiLang) => string;
  note: (lang: UiLang) => string;
}[] = [
  {
    id: "library",
    Icon: LibraryBig,
    label: (lang) => tri(lang, "Biblioteca", "Library", "Biblioteca"),
    note: (lang) =>
      tri(
        lang,
        "Todos os jogos salvos, com status e notas.",
        "Every saved game, with its status and notes.",
        "Todos los juegos guardados, con estado y notas.",
      ),
  },
  {
    id: "reviews",
    Icon: Star,
    label: (lang) => tri(lang, "Avaliações", "Reviews", "Reseñas"),
    note: (lang) =>
      tri(
        lang,
        "Tudo que você escreveu.",
        "Everything you wrote.",
        "Todo lo que escribiste.",
      ),
  },
  {
    id: "sessions",
    Icon: BookOpen,
    label: (lang) => tri(lang, "Sessões", "Sessions", "Sesiones"),
    note: (lang) =>
      tri(
        lang,
        "Registros do diário, com imagens.",
        "Journal entries, with their images.",
        "Registros del diario, con sus imágenes.",
      ),
  },
  {
    id: "journeys",
    Icon: Route,
    label: (lang) => tri(lang, "Jornadas", "Journeys", "Recorridos"),
    note: (lang) =>
      tri(
        lang,
        "As sessões ficam, apenas soltas da jornada.",
        "The sessions stay, just detached from the journey.",
        "Las sesiones quedan, solo separadas del recorrido.",
      ),
  },
  {
    id: "lists",
    Icon: ListTree,
    label: (lang) => tri(lang, "Listas", "Lists", "Listas"),
    note: (lang) =>
      tri(
        lang,
        "Coleções, rankings e tier lists.",
        "Collections, rankings and tier lists.",
        "Colecciones, rankings y tier lists.",
      ),
  },
  {
    id: "screenshots",
    Icon: Images,
    label: (lang) => tri(lang, "Capturas", "Screenshots", "Capturas"),
    note: (lang) =>
      tri(
        lang,
        "As imagens seguem no imgchest, fora daqui.",
        "The images stay on imgchest, outside this site.",
        "Las imágenes siguen en imgchest, fuera de aquí.",
      ),
  },
  {
    id: "comments",
    Icon: MessageSquare,
    label: (lang) => tri(lang, "Comentários", "Comments", "Comentarios"),
    note: (lang) =>
      tri(
        lang,
        "Os seus, em qualquer lugar do site.",
        "Yours, anywhere on the site.",
        "Los tuyos, en cualquier parte del sitio.",
      ),
  },
  {
    id: "views",
    Icon: Eye,
    label: (lang) =>
      tri(
        lang,
        "Vistos recentemente",
        "Recently viewed",
        "Vistos recientemente",
      ),
    note: (lang) =>
      tri(
        lang,
        "O que a busca lembra que você abriu.",
        "What search remembers you opened.",
        "Lo que la búsqueda recuerda que abriste.",
      ),
  },
];

/**
 * Export, erase by category, and close the account.
 *
 * Export comes first on the page on purpose: erasing is only a reasonable
 * thing to offer when the person could have kept a copy first, and putting the
 * download above the delete buttons is the cheapest way to say so.
 */
export function DataSettings({
  lang,
  username,
}: {
  lang: UiLang;
  username: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [armed, setArmed] = useState<string | null>(null);
  const [confirmName, setConfirmName] = useState("");
  const [error, setError] = useState(false);

  async function download() {
    setPending("export");
    setError(false);
    const { data, error: failed } = await createClient().rpc(
      "export_account_data",
    );
    setPending(null);
    if (failed || !data) {
      setError(true);
      return;
    }
    // Built and revoked here rather than pointing at an endpoint: the document
    // is already in memory and a round trip would only add a place for it to
    // be cached.
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `uloggd-${username}-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function erase(category: string) {
    setPending(category);
    setError(false);
    const { data, error: failed } = await createClient().rpc(
      "erase_account_data",
      { category },
    );
    setPending(null);
    setArmed(null);
    if (failed) {
      setError(true);
      return;
    }
    // The row count, not a flat "done": telling someone their data is gone
    // when there was none to remove is a claim, not a confirmation.
    setResult(
      tri(
        lang,
        `${data ?? 0} ${Number(data) === 1 ? "registro removido" : "registros removidos"}.`,
        `${data ?? 0} ${Number(data) === 1 ? "record removed" : "records removed"}.`,
        `${data ?? 0} ${Number(data) === 1 ? "registro eliminado" : "registros eliminados"}.`,
      ),
    );
    router.refresh();
  }

  async function closeAccount() {
    if (confirmName !== username) return;
    setPending("account");
    const supabase = createClient();
    const { error: failed } = await supabase.rpc("delete_own_account");
    if (failed) {
      setPending(null);
      setError(true);
      return;
    }
    await supabase.auth.signOut();
    window.location.href = `/${lang}`;
  }

  return (
    <div className="settings-section data-settings">
      <section className="settings-card">
        <header>
          <h2>
            {tri(lang, "Exportar dados", "Export data", "Exportar datos")}
          </h2>
          <p>
            {tri(
              lang,
              "Um arquivo JSON com tudo que você escreveu aqui: biblioteca, avaliações, sessões, jornadas, listas, capturas, comentários e minérios.",
              "A JSON file with everything you wrote here: library, reviews, sessions, journeys, lists, screenshots, comments and minerals.",
              "Un archivo JSON con todo lo que escribiste aquí: biblioteca, reseñas, sesiones, recorridos, listas, capturas, comentarios y minerales.",
            )}
          </p>
        </header>
        <button
          type="button"
          className="settings-passkey-add"
          onClick={() => void download()}
          disabled={pending !== null}
        >
          {pending === "export" ? (
            <LoaderCircle className="spin" size={15} aria-hidden />
          ) : (
            <Download size={15} aria-hidden />
          )}
          {tri(
            lang,
            "Baixar meus dados",
            "Download my data",
            "Descargar mis datos",
          )}
        </button>
      </section>

      <section className="settings-card">
        <header>
          <h2>{tri(lang, "Limpar dados", "Clear data", "Limpiar datos")}</h2>
          <p>
            {tri(
              lang,
              "Removido para sempre, uma categoria por vez. Não dá para desfazer.",
              "Removed for good, one category at a time. There is no undo.",
              "Eliminado para siempre, una categoría a la vez. No hay deshacer.",
            )}
          </p>
        </header>
        <ul className="data-categories">
          {CATEGORIES.map(({ id, Icon, label, note }) => (
            <li key={id}>
              <Icon size={16} aria-hidden />
              <span>
                <strong>{label(lang)}</strong>
                <small>{note(lang)}</small>
              </span>
              {armed === id ? (
                <span className="data-confirm">
                  <button
                    type="button"
                    className="data-confirm-yes"
                    onClick={() => void erase(id)}
                    disabled={pending !== null}
                  >
                    {pending === id ? (
                      <LoaderCircle className="spin" size={13} aria-hidden />
                    ) : null}
                    {tri(lang, "Confirmar", "Confirm", "Confirmar")}
                  </button>
                  <button type="button" onClick={() => setArmed(null)}>
                    {tri(lang, "Cancelar", "Cancel", "Cancelar")}
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setArmed(id);
                    setResult(null);
                  }}
                  disabled={pending !== null}
                >
                  <Trash2 size={13} aria-hidden />
                  {tri(lang, "Limpar", "Clear", "Limpiar")}
                </button>
              )}
            </li>
          ))}
        </ul>
        {result && (
          <p className="data-result" role="status">
            {result}
          </p>
        )}
      </section>

      <section className="settings-card data-danger">
        <header>
          <h2>
            <AlertTriangle size={16} aria-hidden />
            {tri(lang, "Excluir conta", "Delete account", "Eliminar cuenta")}
          </h2>
          <p>
            {tri(
              lang,
              "A conta e tudo nela desaparecem. O nome de usuário fica livre para outra pessoa.",
              "The account and everything in it go. The username becomes available to someone else.",
              "La cuenta y todo lo que hay en ella desaparecen. El nombre de usuario queda libre.",
            )}
          </p>
        </header>
        <label className="data-confirm-name">
          <span>
            {tri(
              lang,
              `Digite ${username} para confirmar`,
              `Type ${username} to confirm`,
              `Escribe ${username} para confirmar`,
            )}
          </span>
          <input
            value={confirmName}
            onChange={(event) => setConfirmName(event.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
        </label>
        <button
          type="button"
          className="data-delete-account"
          onClick={() => void closeAccount()}
          disabled={confirmName !== username || pending !== null}
        >
          {pending === "account" ? (
            <LoaderCircle className="spin" size={15} aria-hidden />
          ) : (
            <Trash2 size={15} aria-hidden />
          )}
          {tri(
            lang,
            "Excluir minha conta",
            "Delete my account",
            "Eliminar mi cuenta",
          )}
        </button>
      </section>

      {error && (
        <p className="social-form-error" role="alert">
          {tri(
            lang,
            "Não foi possível concluir. Tente novamente.",
            "Could not complete. Try again.",
            "No se pudo completar. Inténtalo de nuevo.",
          )}
        </p>
      )}
    </div>
  );
}
