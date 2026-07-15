"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Check, Copy, Send, Share2, X } from "lucide-react";
import { useState } from "react";

export function ShareButton({
  title,
  text,
  label,
  copiedLabel,
  className,
  lang,
}: {
  title: string;
  text: string;
  label: string;
  copiedLabel: string;
  className?: string;
  lang: "pt-BR" | "en";
}) {
  const pt = lang === "pt-BR";
  const [copied, setCopied] = useState(false);
  async function copy() {
    const url = window.location.href;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }
  async function send() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch {
        return;
      }
    }
    window.location.href = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`${text}\n\n${url}`)}`;
  }
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button className={className} type="button" aria-label={label}>
          <Share2 size={15} />
          <span>{label}</span>
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="social-editor-overlay" />
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
            <button type="button" onClick={send}>
              <span>
                <Send size={19} />
              </span>
              <strong>{pt ? "Enviar para alguém" : "Send to someone"}</strong>
              <small>
                {pt ? "Apps, contatos ou e-mail" : "Apps, contacts, or email"}
              </small>
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
