"use client";

import * as Dialog from "@/components/ui/dialog";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Building2, X } from "lucide-react";
import { tri, uiText, type UiLang } from "@/lib/ui-text";
import { Tooltip } from "@/components/ui/tooltip";

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

/** Same 24px identity slot used by the interactive profile badge. */
export function VerifiedNameMark() {
  return (
    <span className="verified-name-mark" aria-hidden="true">
      <VerifiedMark />
    </span>
  );
}

/**
 * Says an account represents an organization rather than a person.
 *
 * Neutral on purpose, and never styled like the verified mark: registering an
 * organization is open to anyone, so this is the account's own claim about
 * itself, while the blue badge is moderation vouching for it. Conflating the
 * two visually would lend unearned weight to a self-declaration.
 */
export function OrganizationMark({ lang }: { lang: UiLang }) {
  const label = tri(lang, "Organização", "Organization", "Organización");
  return (
    <Tooltip label={label}>
      <span className="organization-mark">
        <Building2 size={12} aria-hidden />
        <span className="sr-only">{label}</span>
      </span>
    </Tooltip>
  );
}

export type Verifier = {
  username: string;
  display_name: string | null;
  avatar_url: string | null;
};

/**
 * `verifiedAt` is when the badge was granted and `verifiedBy` is the account
 * that granted it, read from `profiles.verified_by`.
 *
 * That account is a moderator, so this names a staff member on every profile
 * they have ever reviewed. It is what the product asked for, and it is worth
 * knowing it works that way. Grants with no recorded reviewer, including ones
 * whose reviewer account was deleted, credit uloggd instead.
 */
export function VerifiedBadge({
  lang,
  verifiedAt,
  verifiedBy,
}: {
  lang: UiLang;
  verifiedAt?: string | null;
  verifiedBy?: Verifier | null;
}) {
  const t = uiText(lang);
  const grantedOn = verifiedAt
    ? new Intl.DateTimeFormat(lang, {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(new Date(verifiedAt))
    : null;

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

          <div className="verified-dialog-source">
            <span className="verified-dialog-source-mark" aria-hidden>
              {verifiedBy?.avatar_url ? (
                // A remote avatar the Next optimizer is configured to skip.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={verifiedBy.avatar_url} alt="" />
              ) : (
                <VerifiedMark size={20} />
              )}
            </span>
            <p>
              <strong>
                {tri(lang, "Verificado por", "Verified by", "Verificado por")}
              </strong>
              {verifiedBy ? (
                <Link
                  className="verified-dialog-source-account"
                  href={`/${lang}/u/${verifiedBy.username}`}
                >
                  {verifiedBy.display_name || `@${verifiedBy.username}`}
                  <small>@{verifiedBy.username}</small>
                </Link>
              ) : (
                <span>uloggd</span>
              )}
              {grantedOn && <small>{grantedOn}</small>}
            </p>
          </div>

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

          <Link
            className="verified-dialog-learn"
            href={`/${lang}/verification`}
          >
            {tri(
              lang,
              "Saiba mais sobre verificação",
              "Learn more about verification",
              "Más sobre la verificación",
            )}
            <ArrowRight size={14} />
          </Link>
          <Dialog.Close className="verified-dialog-confirm">
            {tri(lang, "Entendi", "Got it", "Entendido")}
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
