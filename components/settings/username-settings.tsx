"use client";

import * as Dialog from "@/components/ui/dialog";
import { AtSign, Check, Clock3, LoaderCircle, Pencil, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { usernameSchema } from "@/lib/auth-validation";
import { createClient } from "@/lib/supabase/client";
import { tri, uiText, type UiLang } from "@/lib/ui-text";
import { formatRelativeTime } from "@/lib/relative-time";

const reserved = new Set([
  "admin",
  "administrator",
  "api",
  "auth",
  "callback",
  "help",
  "legal",
  "login",
  "logout",
  "moderator",
  "onboarding",
  "privacy",
  "profile",
  "reset-password",
  "settings",
  "support",
  "terms",
  "uloggd",
  "www",
]);

export function UsernameSettings({
  initialUsername,
  changedAt,
  lang,
}: {
  initialUsername: string;
  changedAt: string | null;
  lang: UiLang;
}) {
  const pt = lang === "pt-BR";
  const t = uiText(lang);
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState(initialUsername);
  const [lastChangedAt, setLastChangedAt] = useState(changedAt);
  const [value, setValue] = useState("");
  const [available, setAvailable] = useState<boolean | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [renderedAt] = useState(() => Date.now());
  const normalized = value.trim().toLowerCase();
  const valid =
    usernameSchema.safeParse(normalized).success &&
    !reserved.has(normalized) &&
    normalized !== username;
  const nextChangeAt = lastChangedAt
    ? new Date(new Date(lastChangedAt).getTime() + 30 * 24 * 60 * 60 * 1000)
    : null;
  const coolingDown = Boolean(
    nextChangeAt && nextChangeAt.getTime() > renderedAt,
  );
  const nextChangeLabel = nextChangeAt
    ? formatRelativeTime(nextChangeAt, lang, renderedAt)
    : null;

  useEffect(() => {
    if (!open || !valid) return;
    let ignore = false;
    const timer = window.setTimeout(async () => {
      const { data, error: checkError } = await createClient().rpc(
        "username_available",
        { candidate: normalized },
      );
      if (ignore) return;
      if (checkError) {
        setAvailable(null);
        return;
      }
      setAvailable(Boolean(data));
    }, 350);
    return () => {
      ignore = true;
      window.clearTimeout(timer);
    };
  }, [normalized, open, valid]);

  const hint = useMemo(() => {
    if (!normalized)
      return tri(
        lang,
        "3–32 caracteres: letras minúsculas, números e _.",
        "3–32 characters: lowercase letters, numbers, and _.",
        "3–32 caracteres: letras minúsculas, números y _.",
      );
    if (reserved.has(normalized))
      return tri(
        lang,
        "Esse nome é reservado.",
        "That name is reserved.",
        "Ese nombre está reservado.",
      );
    if (normalized === username)
      return tri(
        lang,
        "Esse já é o seu @ atual.",
        "That is already your handle.",
        "Ese ya es tu @ actual.",
      );
    if (!valid) return t.invalidFormat;
    if (valid && available === null)
      return tri(
        lang,
        "Verificando disponibilidade…",
        "Checking availability…",
        "Comprobando disponibilidad…",
      );
    if (available === false)
      return tri(
        lang,
        "Esse @ já está em uso.",
        "That handle is already taken.",
        "Ese @ ya está en uso.",
      );
    if (available === true)
      return tri(
        lang,
        "Esse @ está disponível.",
        "That handle is available.",
        "Ese @ está disponible.",
      );
    return t.validFormat;
  }, [
    available,
    normalized,
    lang,
    username,
    valid,
    t.invalidFormat,
    t.validFormat,
  ]);

  function resetDialog(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      setValue("");
      setAvailable(null);
      setError(null);
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!valid || available !== true || pending || coolingDown) return;
    setPending(true);
    setError(null);
    const { data, error: actionError } = await createClient().rpc(
      "change_username",
      { candidate: normalized },
    );
    if (actionError) {
      const message = actionError.message.toLowerCase();
      setError(
        message.includes("cooldown")
          ? tri(
              lang,
              "Você ainda está no período de espera para outra alteração.",
              "You are still in the waiting period for another change.",
              "Todavía estás en el periodo de espera para otro cambio.",
            )
          : message.includes("unavailable") || actionError.code === "23505"
            ? tri(
                lang,
                "Esse @ não está disponível.",
                "That handle is not available.",
                "Ese @ no está disponible.",
              )
            : message.includes("second factor")
              ? tri(
                  lang,
                  "Confirme seu segundo fator antes de alterar o @.",
                  "Complete your second factor before changing your handle.",
                  "Completa tu segundo factor antes de cambiar tu @.",
                )
              : tri(
                  lang,
                  "Não foi possível alterar seu @.",
                  "Could not change your handle.",
                  "No se pudo cambiar tu @.",
                ),
      );
      setPending(false);
      return;
    }
    const result = Array.isArray(data) ? data[0] : data;
    setUsername(result?.username ?? normalized);
    setLastChangedAt(result?.changed_at ?? new Date().toISOString());
    setPending(false);
    resetDialog(false);
    router.refresh();
  }

  return (
    <section className="settings-account-card settings-username-card">
      <span>
        <AtSign size={20} />
      </span>
      <div>
        <small>
          {tri(lang, "NOME DE USUÁRIO", "USERNAME", "NOMBRE DE USUARIO")}
        </small>
        <strong>@{username}</strong>
        <p>
          {coolingDown
            ? pt
              ? `Você poderá alterar novamente em ${nextChangeLabel}.`
              : `You can change it again on ${nextChangeLabel}.`
            : tri(
                lang,
                "Seu identificador único. Pode ser alterado a cada 30 dias.",
                "Your unique identifier. It can be changed every 30 days.",
                "Tu identificador único. Se puede cambiar cada 30 días.",
              )}
        </p>
      </div>
      <Dialog.Root open={open} onOpenChange={resetDialog}>
        <Dialog.Trigger asChild>
          <button
            type="button"
            className="settings-username-trigger"
            disabled={coolingDown}
          >
            {coolingDown ? <Clock3 size={14} /> : <Pencil size={14} />}
            {coolingDown
              ? tri(lang, "Em espera", "Waiting", "En espera")
              : t.change}
          </button>
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay className="username-change-overlay" />
          <Dialog.Content
            className="username-change-dialog"
            aria-describedby="username-change-description"
          >
            <header>
              <div>
                <span>
                  {tri(
                    lang,
                    "IDENTIDADE DA CONTA",
                    "ACCOUNT IDENTITY",
                    "IDENTIDAD DE LA CUENTA",
                  )}
                </span>
                <Dialog.Title>
                  {tri(
                    lang,
                    "Alterar nome de usuário",
                    "Change username",
                    "Cambiar nombre de usuario",
                  )}
                </Dialog.Title>
              </div>
              <Dialog.Close aria-label={t.close}>
                <X size={17} />
              </Dialog.Close>
            </header>
            <form onSubmit={submit}>
              <Dialog.Description id="username-change-description">
                {tri(
                  lang,
                  "Seu perfil passará a usar o novo endereço. O @ anterior ficará reservado e redirecionando para você por 30 dias.",
                  "Your profile will use the new address. Your previous handle will remain reserved and redirect to you for 30 days.",
                  "Tu perfil pasará a usar la nueva dirección. El @ anterior quedará reservado y redirigiendo a ti durante 30 días.",
                )}
              </Dialog.Description>
              <label>
                {tri(lang, "Novo @", "New handle", "Nuevo @")}
                <span className="username-change-input">
                  <AtSign size={15} />
                  <input
                    autoFocus
                    value={value}
                    onChange={(event) => {
                      setValue(event.target.value);
                      setAvailable(null);
                      setError(null);
                    }}
                    maxLength={32}
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    placeholder="seu_username"
                  />
                  {valid && available === null ? (
                    <LoaderCircle className="spin" size={14} />
                  ) : available === true ? (
                    <Check size={14} />
                  ) : null}
                </span>
              </label>
              <small
                className="username-change-hint"
                data-valid={available === true || undefined}
              >
                {hint}
              </small>
              <div className="username-change-rules">
                <p>
                  <Clock3 size={15} />
                  <span>
                    <strong>
                      {tri(
                        lang,
                        "Intervalo de 30 dias",
                        "30-day interval",
                        "Intervalo de 30 días",
                      )}
                    </strong>
                    {tri(
                      lang,
                      "Depois da mudança, não será possível escolher outro @ antes do prazo.",
                      "After changing it, you cannot choose another handle before the deadline.",
                      "Tras el cambio, no podrás elegir otro @ antes del plazo.",
                    )}
                  </span>
                </p>
                <p>
                  <AtSign size={15} />
                  <span>
                    <strong>
                      {tri(
                        lang,
                        "Proteção do @ anterior",
                        "Old handle protection",
                        "Protección del @ anterior",
                      )}
                    </strong>
                    {tri(
                      lang,
                      "Ele não poderá ser usado por outra pessoa durante o período.",
                      "Nobody else can claim it during that period.",
                      "Nadie más podrá usarlo durante ese periodo.",
                    )}
                  </span>
                </p>
              </div>
              {error && <p className="username-change-error">{error}</p>}
              <footer>
                <Dialog.Close type="button" disabled={pending}>
                  {t.cancel}
                </Dialog.Close>
                <button
                  type="submit"
                  disabled={
                    !valid || available !== true || pending || coolingDown
                  }
                >
                  {pending && (
                    <LoaderCircle className="spin" size={14} aria-hidden />
                  )}
                  {pending
                    ? tri(lang, "Alterando…", "Changing…", "Cambiando…")
                    : tri(
                        lang,
                        "Confirmar alteração",
                        "Confirm change",
                        "Confirmar cambio",
                      )}
                </button>
              </footer>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  );
}
