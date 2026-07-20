"use client";

import * as Dialog from "@radix-ui/react-dialog";
import Image from "next/image";
import { X } from "lucide-react";
import { uiText } from "@/lib/ui-text";

export function VerifiedMark({ size = 18 }: { size?: number }) {
  return (
    <Image
      className="verified-mark"
      src="/twitter-verified-badge.svg"
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
    />
  );
}

export function VerifiedBadge({ lang }: { lang: "pt-BR" | "en" }) {
  const pt = lang === "pt-BR";
  const t = uiText(lang);

  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button
          className="verified-badge"
          type="button"
          aria-label={
            pt
              ? "Saiba mais sobre esta conta verificada"
              : "Learn about this verified account"
          }
        >
          <VerifiedMark />
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="verified-dialog-overlay" />
        <Dialog.Content className="verified-dialog">
          <Dialog.Close className="verified-dialog-close" aria-label={t.close}>
            <X size={18} />
          </Dialog.Close>

          <div className="verified-dialog-mark" aria-hidden="true">
            <VerifiedMark size={46} />
          </div>
          <Dialog.Title>
            {pt ? "Esta conta é verificada" : "This account is verified"}
          </Dialog.Title>
          <Dialog.Description>
            {pt
              ? "O uloggd confirmou que esta conta representa a pessoa, marca ou organização indicada no perfil."
              : "uloggd confirmed that this account represents the person, brand, or organization shown on the profile."}
          </Dialog.Description>

          <div className="verified-dialog-facts">
            <div>
              <p>
                <strong>
                  {pt ? "Identidade confirmada" : "Identity confirmed"}
                </strong>
                <span>
                  {pt
                    ? "A badge é atribuída pela moderação após análise."
                    : "The badge is assigned by moderation after review."}
                </span>
              </p>
            </div>
            <div>
              <p>
                <strong>
                  {pt ? "Sinal de autenticidade" : "Authenticity signal"}
                </strong>
                <span>
                  {pt
                    ? "A verificação identifica a conta; ela não endossa o conteúdo publicado."
                    : "Verification identifies the account; it does not endorse published content."}
                </span>
              </p>
            </div>
          </div>

          <Dialog.Close className="verified-dialog-confirm">
            {pt ? "Entendi" : "Got it"}
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
