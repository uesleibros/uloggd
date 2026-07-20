"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Check, Copy, Send, Share2, X } from "lucide-react";
import { useState, useSyncExternalStore } from "react";

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
  lang: "pt-BR" | "en";
  /** Controlled mode: the dialog is opened by something else (a menu item),
   *  so this component renders no trigger of its own. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const pt = lang === "pt-BR";
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
            <Dialog.Close aria-label={pt ? "Fechar" : "Close"}>
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
              <strong>
                {copied ? copiedLabel : pt ? "Copiar link" : "Copy link"}
              </strong>
              <small>{pt ? "URL desta página" : "This page URL"}</small>
            </button>
            <button type="button" onClick={send} disabled={!canShare}>
              <span>
                <Send size={19} />
              </span>
              <strong>{pt ? "Enviar para alguém" : "Send to someone"}</strong>
              <small>
                {canShare
                  ? pt
                    ? "Abrir opções do dispositivo"
                    : "Open device sharing options"
                  : pt
                    ? "Indisponível neste navegador"
                    : "Unavailable in this browser"}
              </small>
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
