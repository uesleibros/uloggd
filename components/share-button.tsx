"use client";

import * as Dialog from "@/components/ui/dialog";
import { Check, Copy, Send, Share2, X } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { tri, uiText, type UiLang } from "@/lib/ui-text";

const subscribe = () => () => undefined;

export function ShareButton({
  title,
  text,
  label,
  copiedLabel,
  className,
  lang,
  open,
  onOpenChange,
}: {
  title: string;
  text: string;
  label: string;
  copiedLabel: string;
  className?: string;
  lang: UiLang;
  /** Controlled mode: the dialog is opened by something else (a menu item),
   *  so this component renders no trigger of its own. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const t = uiText(lang);
  const [copied, setCopied] = useState(false);
  const canShare = useSyncExternalStore(
    subscribe,
    () => typeof navigator.share === "function",
    () => false,
  );
  async function copy() {
    const url = window.location.href;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }
  async function send() {
    const url = window.location.href;
    if (!navigator.share) return;
    try {
      await navigator.share({ title, text, url });
    } catch {
      return;
    }
  }
  const controlled = open !== undefined;
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      {!controlled && (
        <Dialog.Trigger asChild>
          <button
            className={["share-action-button", className]
              .filter(Boolean)
              .join(" ")}
            type="button"
            aria-label={label}
          >
            <Share2 size={15} />
            <span>{label}</span>
          </button>
        </Dialog.Trigger>
      )}
      <Dialog.Portal>
        <Dialog.Overlay className="drawer-backdrop" />
        <Dialog.Content className="share-dialog">
          <header>
            <div>
              <span>{label.toUpperCase()}</span>
              <Dialog.Title>{title}</Dialog.Title>
              <Dialog.Description>{text}</Dialog.Description>
            </div>
            <Dialog.Close aria-label={t.close}>
              <X size={17} />
            </Dialog.Close>
          </header>
          <div className="share-dialog-actions">
            <button
              type="button"
              onClick={copy}
              data-success={copied || undefined}
            >
              <span>{copied ? <Check size={19} /> : <Copy size={19} />}</span>
              <strong>{copied ? copiedLabel : t.copyLink}</strong>
              <small>
                {tri(
                  lang,
                  "URL desta página",
                  "This page URL",
                  "URL de esta página",
                )}
              </small>
            </button>
            <button type="button" onClick={send} disabled={!canShare}>
              <span>
                <Send size={19} />
              </span>
              <strong>
                {tri(
                  lang,
                  "Enviar para alguém",
                  "Send to someone",
                  "Enviar a alguien",
                )}
              </strong>
              <small>
                {canShare
                  ? tri(
                      lang,
                      "Abrir opções do dispositivo",
                      "Open device sharing options",
                      "Abrir opciones del dispositivo",
                    )
                  : tri(
                      lang,
                      "Indisponível neste navegador",
                      "Unavailable in this browser",
                      "No disponible en este navegador",
                    )}
              </small>
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
