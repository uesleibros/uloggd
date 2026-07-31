"use client";

import * as Dialog from "@/components/ui/dialog";
import {
  Building2,
  Check,
  LoaderCircle,
  Pencil,
  UserRound,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { tri, uiText, type UiLang } from "@/lib/ui-text";

export type AccountType = "PERSON" | "ORGANIZATION";

const MAX_TAGLINE = 60;

/**
 * Switches the account between representing a person and representing an
 * organization — a store, studio, publisher, outlet or community.
 *
 * Deliberately not tied to the verified badge: anyone may register an
 * organization account, and the badge stays a separate moderation decision.
 * The label an account gives itself is a claim, not a confirmation.
 */
export function AccountTypeSettings({
  initialType,
  initialTagline,
  lang,
}: {
  initialType: AccountType;
  initialTagline: string | null;
  lang: UiLang;
}) {
  const t = uiText(lang);
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<AccountType>(initialType);
  const [tagline, setTagline] = useState(initialTagline ?? "");
  const [draftType, setDraftType] = useState<AccountType>(initialType);
  const [draftTagline, setDraftTagline] = useState(initialTagline ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);

  const organization = type === "ORGANIZATION";
  const dirty =
    draftType !== type ||
    (draftType === "ORGANIZATION" && draftTagline.trim() !== (tagline ?? ""));

  async function save() {
    if (pending || !dirty) return;
    setPending(true);
    setError(false);
    const { data, error: rpcError } = await createClient().rpc(
      "set_account_type",
      {
        next_type: draftType,
        next_tagline:
          draftType === "ORGANIZATION" ? draftTagline.trim() || null : null,
      },
    );
    if (rpcError || !data) {
      setError(true);
      setPending(false);
      return;
    }
    setType(draftType);
    setTagline(draftType === "ORGANIZATION" ? draftTagline.trim() : "");
    setPending(false);
    setOpen(false);
    router.refresh();
  }

  function openEditor(next: boolean) {
    if (next) {
      setDraftType(type);
      setDraftTagline(tagline ?? "");
      setError(false);
    }
    if (!pending) setOpen(next);
  }

  return (
    <section className="settings-account-card">
      <span>
        {organization ? <Building2 size={20} /> : <UserRound size={20} />}
      </span>
      <div>
        <small>
          {tri(lang, "TIPO DE CONTA", "ACCOUNT TYPE", "TIPO DE CUENTA")}
        </small>
        <strong>
          {organization
            ? tri(lang, "Organização", "Organization", "Organización")
            : tri(lang, "Pessoa", "Person", "Persona")}
        </strong>
        <p>
          {organization
            ? tagline ||
              tri(
                lang,
                "Perfil de uma loja, estúdio, publicadora ou comunidade.",
                "Profile of a store, studio, publisher, or community.",
                "Perfil de una tienda, estudio, editora o comunidad.",
              )
            : tri(
                lang,
                "Conta pessoal. Mude para organização se este perfil representa uma marca.",
                "Personal account. Switch to organization if this profile represents a brand.",
                "Cuenta personal. Cámbiala a organización si este perfil representa una marca.",
              )}
        </p>
      </div>
      <Dialog.Root open={open} onOpenChange={openEditor}>
        <Dialog.Trigger asChild>
          <button type="button" className="settings-account-card-action">
            <Pencil size={14} />
            {t.edit}
          </button>
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay className="drawer-backdrop" />
          <Dialog.Content
            className="social-editor-dialog account-type-dialog"
            aria-describedby={undefined}
          >
            <header>
              <div>
                <span>
                  {tri(lang, "TIPO DE CONTA", "ACCOUNT TYPE", "TIPO DE CUENTA")}
                </span>
                <Dialog.Title>
                  {tri(
                    lang,
                    "Quem este perfil representa?",
                    "Who does this profile represent?",
                    "¿A quién representa este perfil?",
                  )}
                </Dialog.Title>
              </div>
              <Dialog.Close aria-label={t.close} disabled={pending}>
                <X size={19} />
              </Dialog.Close>
            </header>
            <div className="social-editor-form">
              <div className="account-type-choices" role="radiogroup">
                {(
                  [
                    {
                      value: "PERSON" as const,
                      icon: UserRound,
                      title: tri(lang, "Pessoa", "Person", "Persona"),
                      copy: tri(
                        lang,
                        "Uma conta pessoal, como qualquer jogador.",
                        "A personal account, like any player's.",
                        "Una cuenta personal, como la de cualquier jugador.",
                      ),
                    },
                    {
                      value: "ORGANIZATION" as const,
                      icon: Building2,
                      title: tri(
                        lang,
                        "Organização",
                        "Organization",
                        "Organización",
                      ),
                      copy: tri(
                        lang,
                        "Loja, estúdio, publicadora, veículo ou comunidade.",
                        "Store, studio, publisher, outlet, or community.",
                        "Tienda, estudio, editora, medio o comunidad.",
                      ),
                    },
                  ] as const
                ).map((choice) => {
                  const Icon = choice.icon;
                  const active = draftType === choice.value;
                  return (
                    <button
                      key={choice.value}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      data-active={active || undefined}
                      disabled={pending}
                      onClick={() => setDraftType(choice.value)}
                    >
                      <Icon size={17} />
                      <span>
                        <strong>{choice.title}</strong>
                        <small>{choice.copy}</small>
                      </span>
                      {active && <Check size={15} aria-hidden />}
                    </button>
                  );
                })}
              </div>
              {draftType === "ORGANIZATION" && (
                <label className="account-type-tagline">
                  <span>
                    {tri(
                      lang,
                      "Descrição curta (opcional)",
                      "Short description (optional)",
                      "Descripción corta (opcional)",
                    )}
                  </span>
                  <input
                    value={draftTagline}
                    maxLength={MAX_TAGLINE}
                    disabled={pending}
                    placeholder={tri(
                      lang,
                      "ex: Loja de jogos digitais",
                      "e.g. Digital game store",
                      "ej.: Tienda de juegos digitales",
                    )}
                    onChange={(event) => setDraftTagline(event.target.value)}
                  />
                  <small>
                    {draftTagline.length}/{MAX_TAGLINE}
                  </small>
                </label>
              )}
              <p className="account-type-note">
                {tri(
                  lang,
                  "Marcar a conta como organização não concede o selo de verificado — ele continua sendo uma análise da moderação.",
                  "Marking the account as an organization does not grant the verified badge — that remains a moderation review.",
                  "Marcar la cuenta como organización no otorga la insignia de verificado: sigue siendo una revisión de moderación.",
                )}
              </p>
              {error && (
                <p className="social-form-error" role="alert">
                  {t.couldNotSave}
                </p>
              )}
              <footer>
                <Dialog.Close type="button" disabled={pending}>
                  {t.cancel}
                </Dialog.Close>
                <button
                  type="button"
                  disabled={pending || !dirty}
                  aria-busy={pending}
                  onClick={() => void save()}
                >
                  {pending && (
                    <LoaderCircle className="spin" size={15} aria-hidden />
                  )}
                  {pending ? t.saving : t.save}
                </button>
              </footer>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  );
}
