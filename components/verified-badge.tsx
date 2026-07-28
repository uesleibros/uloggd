"use client";

import * as Dialog from "@/components/ui/dialog";
import Image from "next/image";
import { X } from "lucide-react";
import { tri, uiText, type UiLang } from "@/lib/ui-text";

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

export function VerifiedBadge({ lang }: { lang: UiLang }) {
  const t = uiText(lang);

  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button
          className="verified-badge"
          type="button"
          aria-label={tri(
            lang,
            "Saiba mais sobre esta conta verificada",
            "Learn about this verified account",
            "Más sobre esta cuenta verificada",
          )}
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
            {tri(
              lang,
              "Esta conta é verificada",
              "This account is verified",
              "Esta cuenta está verificada",
            )}
          </Dialog.Title>
          <Dialog.Description>
            {tri(
              lang,
              "O uloggd confirmou que esta conta representa a pessoa, marca ou organização indicada no perfil.",
              "uloggd confirmed that this account represents the person, brand, or organization shown on the profile.",
              "uloggd confirmó que esta cuenta representa a la persona, marca u organización indicada en el perfil.",
            )}
          </Dialog.Description>

          <div className="verified-dialog-facts">
            <div>
              <p>
                <strong>
                  {tri(
                    lang,
                    "Identidade confirmada",
                    "Identity confirmed",
                    "Identidad confirmada",
                  )}
                </strong>
                <span>
                  {tri(
                    lang,
                    "A badge é atribuída pela moderação após análise.",
                    "The badge is assigned by moderation after review.",
                    "La insignia la asigna la moderación tras revisar.",
                  )}
                </span>
              </p>
            </div>
            <div>
              <p>
                <strong>
                  {tri(
                    lang,
                    "Sinal de autenticidade",
                    "Authenticity signal",
                    "Señal de autenticidad",
                  )}
                </strong>
                <span>
                  {tri(
                    lang,
                    "A verificação identifica a conta; ela não endossa o conteúdo publicado.",
                    "Verification identifies the account; it does not endorse published content.",
                    "La verificación identifica la cuenta; no respalda el contenido publicado.",
                  )}
                </span>
              </p>
            </div>
          </div>

          <Dialog.Close className="verified-dialog-confirm">
            {tri(lang, "Entendi", "Got it", "Entendido")}
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
