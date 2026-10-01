"use client";

import { ContextMenu } from "@base-ui/react/context-menu";
import {
  Copy,
  ExternalLink,
  Gamepad2,
  ImageIcon,
  Link2,
  List,
  MoreHorizontal,
  Reply,
  Scissors,
  TextSelect,
  User,
  ClipboardPaste,
  Heart,
  Pencil,
  Check,
  Bookmark,
  Trash2,
  ShieldX,
  UserPlus,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { contextLink, type ContextLinkKind } from "@/lib/context-menu";
import { tri, type UiLang } from "@/lib/ui-text";
import { MediaLightbox, type LightboxItem } from "@/components/media-lightbox";

type Action = {
  id: string;
  label: string;
  icon: ReactNode;
  run: () => void | Promise<void>;
  disabled?: boolean;
  danger?: boolean;
};
type Snapshot = {
  title: string;
  actions: Action[];
  target: HTMLElement | null;
};

export function SiteContextMenu({
  children,
  lang,
}: {
  children: ReactNode;
  lang: UiLang;
}) {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState<Snapshot>({
    title: "uloggd",
    actions: [],
    target: null,
  });
  const [notice, setNotice] = useState("");
  const [image, setImage] = useState<LightboxItem | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queuedAction = useRef<Action | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  const text = (pt: string, en: string, es: string) => tri(lang, pt, en, es);

  function feedback(message: string) {
    setNotice(message);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setNotice(""), 5000);
  }
  async function copy(value: string) {
    await navigator.clipboard.writeText(value);
    feedback(text("Copiado!", "Copied!", "¡Copiado!"));
  }
  function capture(element: EventTarget | null) {
    if (!(element instanceof Element)) return;
    const actions: Action[] = [];
    const input = element.closest("input, textarea, [contenteditable='true']");
    const editable =
      input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement;
    const sensitive =
      input instanceof HTMLInputElement && input.type === "password";
    const selection = editable
      ? input.value.slice(input.selectionStart ?? 0, input.selectionEnd ?? 0)
      : (window.getSelection()?.toString() ?? "");
    const scope = element.closest<HTMLElement>("[data-context-kind]");
    const focusTarget =
      element.closest<HTMLElement>(
        "button, a, input, textarea, [tabindex], [contenteditable='true']",
      ) ?? element.closest<HTMLElement>("[data-context-kind]");
    const mutateInput = (replacement: string) => {
      if (!editable || input.readOnly || input.disabled) return;
      input.focus();
      // The native setter lets React's controlled input receive the input event.
      const start = input.selectionStart ?? input.value.length;
      const end = input.selectionEnd ?? start;
      const setter = Object.getOwnPropertyDescriptor(
        input instanceof HTMLInputElement
          ? HTMLInputElement.prototype
          : HTMLTextAreaElement.prototype,
        "value",
      )?.set;
      setter?.call(
        input,
        input.value.slice(0, start) + replacement + input.value.slice(end),
      );
      input.setSelectionRange(
        start + replacement.length,
        start + replacement.length,
      );
      input.dispatchEvent(
        new InputEvent("input", {
          bubbles: true,
          inputType: replacement ? "insertFromPaste" : "deleteByCut",
          data: replacement,
        }),
      );
      input.dispatchEvent(new Event("change", { bubbles: true }));
    };
    let title = text("Página", "Page", "Página");
    if (input) {
      title = text("Texto", "Text", "Texto");
      if (editable) {
        if (selection && !sensitive)
          actions.push({
            id: "copy-text",
            label: text("Copiar texto", "Copy text", "Copiar texto"),
            icon: <Copy />,
            run: () => copy(selection),
          });
        if (
          !sensitive &&
          selection &&
          input.selectionStart !== null &&
          !input.readOnly &&
          !input.disabled
        )
          actions.push({
            id: "cut",
            label: text("Recortar", "Cut", "Cortar"),
            icon: <Scissors />,
            run: async () => {
              await copy(selection);
              mutateInput("");
            },
          });
        if (input.selectionStart !== null && !input.readOnly && !input.disabled)
          actions.push({
            id: "paste",
            label: text("Colar", "Paste", "Pegar"),
            icon: <ClipboardPaste />,
            run: async () => mutateInput(await navigator.clipboard.readText()),
          });
        actions.push({
          id: "select",
          label: text("Selecionar tudo", "Select all", "Seleccionar todo"),
          icon: <TextSelect />,
          run: () => {
            input.focus();
            input.select();
          },
        });
      } else if (input instanceof HTMLElement) {
        if (selection)
          actions.push({
            id: "copy-text",
            label: text("Copiar texto", "Copy text", "Copiar texto"),
            icon: <Copy />,
            run: () => copy(selection),
          });
        actions.push({
          id: "select",
          label: text("Selecionar tudo", "Select all", "Seleccionar todo"),
          icon: <TextSelect />,
          run: () => {
            input.focus();
            const range = document.createRange();
            range.selectNodeContents(input);
            const selected = window.getSelection();
            selected?.removeAllRanges();
            selected?.addRange(range);
          },
        });
      }
    } else {
      const links = new Map<string, ContextLinkKind>();
      const direct = element.closest<HTMLAnchorElement>("a[href]");
      const scopeHref = scope?.dataset.contextHref;
      if (!direct && scopeHref) {
        const link = contextLink(scopeHref, location.origin);
        if (link)
          links.set(
            link.url,
            scope?.dataset.contextKind === "image" ? "image" : link.kind,
          );
      }
      for (const anchor of [
        direct,
        ...(scope?.querySelectorAll<HTMLAnchorElement>(
          "a[data-context-link]",
        ) ?? []),
      ]) {
        if (!anchor) continue;
        if (
          anchor !== direct &&
          anchor.closest("[data-context-kind]") !== scope
        )
          continue;
        const link = contextLink(anchor.href, location.origin);
        if (link) links.set(link.url, link.kind);
      }
      const linkLabels = {
        game: text("Abrir jogo", "Open game", "Abrir juego"),
        profile: text("Ver perfil", "View profile", "Ver perfil"),
        list: text("Abrir lista", "Open list", "Abrir lista"),
        screenshot: text("Abrir captura", "Open screenshot", "Abrir captura"),
        image: text(
          "Abrir imagem original",
          "Open original image",
          "Abrir imagen original",
        ),
        link: text("Abrir link", "Open link", "Abrir enlace"),
      };
      const icons = {
        game: <Gamepad2 />,
        profile: <User />,
        list: <List />,
        screenshot: <ImageIcon />,
        image: <ImageIcon />,
        link: <ExternalLink />,
      };
      for (const [url, kind] of links) {
        actions.push({
          id: `open-${url}`,
          label: linkLabels[kind],
          icon: icons[kind],
          run: () => {
            if (kind !== "image" && new URL(url).origin === location.origin)
              router.push(url);
            else window.open(url, "_blank", "noopener,noreferrer");
          },
        });
      }
      const mainUrl = links.keys().next().value as string | undefined;
      if (mainUrl) {
        title =
          scope?.dataset.contextTitle ||
          direct?.textContent?.trim() ||
          linkLabels[links.get(mainUrl)!];
        actions.push({
          id: "new-tab",
          label: text(
            "Abrir em nova aba",
            "Open in new tab",
            "Abrir en nueva pestaña",
          ),
          icon: <ExternalLink />,
          run: () => {
            window.open(mainUrl, "_blank", "noopener,noreferrer");
          },
        });
        actions.push({
          id: "copy-link",
          label: text("Copiar link", "Copy link", "Copiar enlace"),
          icon: <Link2 />,
          run: () => copy(mainUrl),
        });
      }
      const viewer = element.closest<HTMLButtonElement>(
        "button[data-feedback='image'], button[data-context-action='image']",
      );
      const img =
        element instanceof HTMLImageElement
          ? element
          : (viewer?.querySelector("img") ??
            element.closest("[data-context-image]")?.querySelector("img"));
      if (viewer)
        actions.push({
          id: "image",
          label:
            viewer.getAttribute("aria-label") ||
            text("Ver imagem", "View image", "Ver imagen"),
          icon: <ImageIcon />,
          run: () => {
            viewer.click();
          },
        });
      // Censored covers and composite previews keep their existing reveal flow.
      else if (
        img &&
        scope?.dataset.contextKind !== "image" &&
        !element.closest(
          "[data-mark='DIM'], [data-sensitive='true'], [data-spoilers='true'], details:not([open]), [data-context-kind='list']",
        )
      ) {
        const url = contextLink(
          img.currentSrc || img.src,
          location.origin,
        )?.url;
        if (url)
          actions.push({
            id: "image",
            label: text("Ver imagem", "View image", "Ver imagen"),
            icon: <ImageIcon />,
            run: () => setImage({ id: url, url, alt: img.alt }),
          });
      }
      if (selection)
        actions.push({
          id: "copy-text",
          label: text(
            "Copiar texto selecionado",
            "Copy selected text",
            "Copiar texto seleccionado",
          ),
          icon: <Copy />,
          run: () => copy(selection),
        });
      const commentBody = scope?.querySelector<HTMLElement>(
        "[data-context-text]",
      );
      if (!selection && commentBody?.textContent) {
        const body = commentBody.textContent;
        actions.push({
          id: "copy-text",
          label: text("Copiar texto", "Copy text", "Copiar texto"),
          icon: <Copy />,
          run: () => copy(body),
        });
      }
      if (scope?.id.startsWith("comment-"))
        actions.push({
          id: "comment-link",
          label: text(
            "Copiar link do comentário",
            "Copy comment link",
            "Copiar enlace del comentario",
          ),
          icon: <Link2 />,
          run: () => {
            const url = new URL(location.href);
            url.hash = scope.id;
            return copy(url.href);
          },
        });
      for (const button of scope?.querySelectorAll<HTMLButtonElement>(
        "button[data-context-action]",
      ) ?? []) {
        if (
          button.dataset.contextAction === "image" ||
          button.closest("[data-context-kind]") !== scope ||
          button.disabled ||
          button.getAttribute("aria-disabled") === "true"
        )
          continue;
        const kind = button.dataset.contextAction;
        const icon =
          kind === "reply" ? (
            <Reply />
          ) : kind === "like" ? (
            <Heart />
          ) : kind === "edit" ? (
            <Pencil />
          ) : kind === "completed" ? (
            <Check />
          ) : kind === "backlog" ? (
            <Bookmark />
          ) : kind === "delete" ? (
            <Trash2 />
          ) : kind === "moderate" ? (
            <ShieldX />
          ) : kind === "follow" ? (
            <UserPlus />
          ) : (
            <MoreHorizontal />
          );
        actions.push({
          id: `action-${actions.length}`,
          danger: kind === "delete" || kind === "moderate",
          label:
            button.getAttribute("aria-label") ||
            button.textContent?.trim() ||
            text("Mais ações", "More actions", "Más acciones"),
          icon,
          run: () => {
            if (button.isConnected && !button.disabled) button.click();
          },
        });
      }
      if (!mainUrl)
        actions.push({
          id: "page-link",
          label: text(
            "Copiar link da página",
            "Copy page link",
            "Copiar enlace de la página",
          ),
          icon: <Link2 />,
          run: () => copy(location.href),
        });
    }
    setSnapshot({ title: title.slice(0, 100), actions, target: focusTarget });
  }

  return (
    <>
      <ContextMenu.Root
        onOpenChangeComplete={(open) => {
          if (open || !queuedAction.current) return;
          const action = queuedAction.current;
          queuedAction.current = null;
          // Run after the focus manager releases the page and restores focus.
          requestAnimationFrame(() => {
            Promise.resolve()
              .then(action.run)
              .catch(() =>
                feedback(
                  text(
                    "Não foi possível concluir a ação. Confira a permissão da área de transferência.",
                    "Could not complete the action. Check clipboard permission.",
                    "No se pudo completar la acción. Comprueba el permiso del portapapeles.",
                  ),
                ),
              );
          });
        }}
      >
        <ContextMenu.Trigger
          className="site-context-area"
          onContextMenuCapture={(event) => capture(event.target)}
          onTouchStartCapture={(event) => capture(event.target)}
          onKeyDownCapture={(event) => {
            if (
              event.key === "ContextMenu" ||
              (event.shiftKey && event.key === "F10")
            ) {
              event.preventDefault();
              const target = event.target as HTMLElement;
              const rect = target.getBoundingClientRect();
              target.dispatchEvent(
                new MouseEvent("contextmenu", {
                  bubbles: true,
                  cancelable: true,
                  clientX: rect.left + rect.width / 2,
                  clientY: rect.top + rect.height / 2,
                }),
              );
            }
          }}
        >
          {children}
          <MediaLightbox
            items={image ? [image] : []}
            active={image ? 0 : null}
            onActiveChange={(value) => {
              if (value === null) setImage(null);
            }}
            lang={lang}
            title={image?.alt || text("Imagem", "Image", "Imagen")}
            unoptimized
          />
        </ContextMenu.Trigger>
        <ContextMenu.Portal>
          <ContextMenu.Positioner
            className="site-context-positioner"
            sideOffset={4}
            collisionPadding={8}
          >
            <ContextMenu.Popup
              className="site-context-menu"
              onContextMenu={(event) => event.preventDefault()}
              aria-label={text(
                "Menu de contexto",
                "Context menu",
                "Menú contextual",
              )}
              finalFocus={() =>
                snapshot.target?.isConnected ? snapshot.target : false
              }
            >
              <div className="site-context-heading" role="presentation">
                {snapshot.title}
              </div>
              <ContextMenu.Separator />
              {snapshot.actions.map((action) => (
                <ContextMenu.Item
                  key={action.id}
                  disabled={action.disabled}
                  data-danger={action.danger || undefined}
                  onClick={() => {
                    queuedAction.current = action;
                  }}
                >
                  {action.icon}
                  <span>{action.label}</span>
                </ContextMenu.Item>
              ))}
            </ContextMenu.Popup>
          </ContextMenu.Positioner>
        </ContextMenu.Portal>
      </ContextMenu.Root>
      <div
        className="site-context-notice"
        role="status"
        aria-live="polite"
        hidden={!notice}
      >
        {notice}
      </div>
    </>
  );
}
