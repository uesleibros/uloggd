"use client";

import * as Dialog from "@/components/ui/dialog";
import { TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { tri, type UiLang } from "@/lib/ui-text";

/**
 * Warns before leaving a screen with unsaved edits.
 *
 * In-app navigation is caught by listening for link clicks in the capture
 * phase, because the App Router has no way to block a navigation once it has
 * started. That keeps the warning as a normal dialog in our own style rather
 * than the browser's.
 *
 * Closing the tab still goes through beforeunload, whose dialog we cannot
 * style or replace. It stays on anyway: an unstyled warning beats losing the
 * text someone just wrote.
 */
export function UnsavedChangesGuard({
  dirty,
  lang,
  message,
}: {
  dirty: boolean;
  lang: UiLang;
  message?: string;
}) {
  const router = useRouter();
  const [target, setTarget] = useState<string | null>(null);

  useEffect(() => {
    if (!dirty) return;

    const onClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const anchor = (event.target as HTMLElement | null)?.closest?.("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) return;

      const url = new URL(href, window.location.href);
      if (url.origin !== window.location.origin) return;
      // Staying on the same route is not leaving, so a tab or filter link
      // never triggers the warning.
      if (url.pathname === window.location.pathname) return;

      event.preventDefault();
      setTarget(url.pathname + url.search);
    };

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };

    document.addEventListener("click", onClick, true);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [dirty]);

  return (
    <Dialog.Root
      open={target !== null}
      onOpenChange={(open) => {
        if (!open) setTarget(null);
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="recent-unfollow-overlay" />
        <Dialog.Content className="recent-unfollow-dialog">
          <span className="recent-unfollow-mark" aria-hidden>
            <TriangleAlert size={20} />
          </span>
          <Dialog.Title>
            {tri(
              lang,
              "Sair sem salvar?",
              "Leave without saving?",
              "¿Salir sin guardar?",
            )}
          </Dialog.Title>
          <Dialog.Description>
            {message ??
              tri(
                lang,
                "Você tem alterações que ainda não foram salvas. Se sair agora, elas serão perdidas.",
                "You have changes that have not been saved. If you leave now, they will be lost.",
                "Tienes cambios sin guardar. Si sales ahora, se perderán.",
              )}
          </Dialog.Description>
          <footer>
            <Dialog.Close>
              {tri(lang, "Continuar aqui", "Stay here", "Quedarme aquí")}
            </Dialog.Close>
            <button
              type="button"
              data-danger
              onClick={() => {
                const next = target;
                setTarget(null);
                if (next) router.push(next);
              }}
            >
              {tri(
                lang,
                "Sair mesmo assim",
                "Leave anyway",
                "Salir de todos modos",
              )}
            </button>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
