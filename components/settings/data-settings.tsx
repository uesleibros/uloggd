"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import {
  BookOpen,
  Database,
  Download,
  Eraser,
  Eye,
  Images,
  LibraryBig,
  ListTree,
  LoaderCircle,
  MessageSquare,
  Route,
  Star,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { EASE_OUT, MOTION_MS } from "@/lib/motion";
import { tri, type UiLang } from "@/lib/ui-text";

/**
 * What can be cleared, one at a time.
 *
 * Deleting the account is deliberately not here: it already lives in the
 * General tab, and two paths to the most destructive action on the site means
 * two places to keep correct forever. This tab is about the data inside a
 * living account.
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
 * Export first, then clearing, category by category or all at once.
 *
 * Export sits above the erasure on purpose: clearing is only a reasonable
 * thing to offer when the person could have kept a copy first, and the order
 * on the page is the cheapest way to say so.
 */
export function DataSettings({
  lang,
  username,
}: {
  lang: UiLang;
  username: string;
}) {
  const router = useRouter();
  const still = useReducedMotion();
  const [pending, setPending] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [armed, setArmed] = useState<string | null>(null);
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

  return (
    <div className="settings-security-stack data-settings">
      <section className="settings-security-card">
        <header>
          <span>
            <Download size={20} />
          </span>
          <div>
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
          </div>
        </header>
        <button
          type="button"
          className="settings-passkey-add data-export-button"
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

      <section className="settings-security-card">
        <header>
          <span>
            <Database size={20} />
          </span>
          <div>
            <h2>{tri(lang, "Limpar dados", "Clear data", "Limpiar datos")}</h2>
            <p>
              {tri(
                lang,
                "Removido para sempre, uma categoria por vez. Não dá para desfazer.",
                "Removed for good, one category at a time. There is no undo.",
                "Eliminado para siempre, una categoría a la vez. No hay deshacer.",
              )}
            </p>
          </div>
        </header>
        <ul className="data-categories">
          {CATEGORIES.map(({ id, Icon, label, note }, index) => (
            <motion.li
              key={id}
              initial={still ? false : { opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={
                still
                  ? { duration: 0 }
                  : {
                      duration: MOTION_MS.quick / 1000,
                      ease: EASE_OUT,
                      delay: Math.min(index, 6) * 0.03,
                    }
              }
            >
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
            </motion.li>
          ))}
        </ul>

        {/* All eight at once, in one transaction. Kept inside the same card
            rather than a card of its own: it is the same action at a larger
            radius, not a different kind of action. */}
        <div className="data-everything">
          <span>
            <strong>
              {tri(lang, "Limpar tudo", "Clear everything", "Limpiar todo")}
            </strong>
            <small>
              {tri(
                lang,
                "Todas as categorias acima de uma vez. A conta e o perfil ficam.",
                "Every category above at once. The account and profile stay.",
                "Todas las categorías de arriba a la vez. La cuenta y el perfil quedan.",
              )}
            </small>
          </span>
          {armed === "everything" ? (
            <span className="data-confirm">
              <button
                type="button"
                className="data-confirm-yes"
                onClick={() => void erase("everything")}
                disabled={pending !== null}
              >
                {pending === "everything" ? (
                  <LoaderCircle className="spin" size={13} aria-hidden />
                ) : null}
                {tri(
                  lang,
                  "Apagar tudo mesmo",
                  "Really clear everything",
                  "Borrar todo de verdad",
                )}
              </button>
              <button type="button" onClick={() => setArmed(null)}>
                {tri(lang, "Cancelar", "Cancel", "Cancelar")}
              </button>
            </span>
          ) : (
            <button
              type="button"
              className="data-everything-arm"
              onClick={() => {
                setArmed("everything");
                setResult(null);
              }}
              disabled={pending !== null}
            >
              <Eraser size={13} aria-hidden />
              {tri(lang, "Limpar tudo", "Clear everything", "Limpiar todo")}
            </button>
          )}
        </div>

        {result && (
          <p className="data-result" role="status">
            {result}
          </p>
        )}
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
      </section>
    </div>
  );
}
