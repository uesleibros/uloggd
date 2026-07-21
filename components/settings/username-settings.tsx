"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { AtSign, Check, Clock3, LoaderCircle, Pencil, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { usernameSchema } from "@/lib/auth-validation";
import { createClient } from "@/lib/supabase/client";
import { uiText, type UiLang } from "@/lib/ui-text";

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
    ? new Intl.DateTimeFormat(lang, { dateStyle: "long" }).format(nextChangeAt)
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
      return pt
        ? "3–32 caracteres: letras minúsculas, números e _."
        : "3–32 characters: lowercase letters, numbers, and _.";
    if (reserved.has(normalized))
      return pt ? "Esse nome é reservado." : "That name is reserved.";
    if (normalized === username)
      return pt ? "Esse já é o seu @ atual." : "That is already your handle.";
    if (!valid) return pt ? "Formato inválido." : "Invalid format.";
    if (valid && available === null)
      return pt ? "Verificando disponibilidade…" : "Checking availability…";
    if (available === false)
      return pt ? "Esse @ já está em uso." : "That handle is already taken.";
    if (available === true)
      return pt ? "Esse @ está disponível." : "That handle is available.";
    return pt ? "Formato válido." : "Valid format.";
  }, [available, normalized, pt, username, valid]);

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
          ? pt
            ? "Você ainda está no período de espera para outra alteração."
            : "You are still in the waiting period for another change."
          : message.includes("unavailable") || actionError.code === "23505"
            ? pt
              ? "Esse @ não está disponível."
              : "That handle is not available."
            : message.includes("second factor")
              ? pt
                ? "Confirme seu segundo fator antes de alterar o @."
                : "Complete your second factor before changing your handle."
              : pt
                ? "Não foi possível alterar seu @."
                : "Could not change your handle.",
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
        <small>{pt ? "NOME DE USUÁRIO" : "USERNAME"}</small>
        <strong>@{username}</strong>
        <p>
          {coolingDown
            ? pt
              ? `Você poderá alterar novamente em ${nextChangeLabel}.`
              : `You can change it again on ${nextChangeLabel}.`
            : pt
              ? "Seu identificador único. Pode ser alterado a cada 30 dias."
              : "Your unique identifier. It can be changed every 30 days."}
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
              ? pt
                ? "Em espera"
                : "Waiting"
              : pt
                ? "Alterar"
                : "Change"}
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
                <span>{pt ? "IDENTIDADE DA CONTA" : "ACCOUNT IDENTITY"}</span>
                <Dialog.Title>
                  {pt ? "Alterar nome de usuário" : "Change username"}
                </Dialog.Title>
              </div>
              <Dialog.Close aria-label={t.close}>
                <X size={17} />
              </Dialog.Close>
            </header>
            <form onSubmit={submit}>
              <Dialog.Description id="username-change-description">
                {pt
                  ? "Seu perfil passará a usar o novo endereço. O @ anterior ficará reservado e redirecionando para você por 30 dias."
                  : "Your profile will use the new address. Your previous handle will remain reserved and redirect to you for 30 days."}
              </Dialog.Description>
              <label>
                {pt ? "Novo @" : "New handle"}
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
                      {pt ? "Intervalo de 30 dias" : "30-day interval"}
                    </strong>
                    {pt
                      ? "Depois da mudança, não será possível escolher outro @ antes do prazo."
                      : "After changing it, you cannot choose another handle before the deadline."}
                  </span>
                </p>
                <p>
                  <AtSign size={15} />
                  <span>
                    <strong>
                      {pt ? "Proteção do @ anterior" : "Old handle protection"}
                    </strong>
                    {pt
                      ? "Ele não poderá ser usado por outra pessoa durante o período."
                      : "Nobody else can claim it during that period."}
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
                    ? pt
                      ? "Alterando…"
                      : "Changing…"
                    : pt
                      ? "Confirmar alteração"
                      : "Confirm change"}
                </button>
              </footer>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  );
}
