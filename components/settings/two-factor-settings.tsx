"use client";

/* eslint-disable @next/next/no-img-element */

import * as Dialog from "@radix-ui/react-dialog";
import {
  Check,
  Clipboard,
  KeyRound,
  LoaderCircle,
  Plus,
  ShieldCheck,
  Smartphone,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type TotpFactor = {
  id: string;
  friendly_name?: string;
  status: "verified" | "unverified";
  created_at: string;
};

type Enrollment = {
  id: string;
  qr: string;
  secret: string;
};

export function TwoFactorSettings({ lang }: { lang: "pt-BR" | "en" }) {
  const pt = lang === "pt-BR";
  const [factors, setFactors] = useState<TotpFactor[]>([]);
  const [pending, setPending] = useState<string | null>("load");
  const [error, setError] = useState<string | null>(null);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [removeFactor, setRemoveFactor] = useState<TotpFactor | null>(null);
  const [removeCode, setRemoveCode] = useState("");

  async function loadFactors() {
    const { data, error: actionError } =
      await createClient().auth.mfa.listFactors();
    if (actionError) {
      setError(
        pt
          ? "Não foi possível carregar a verificação em duas etapas."
          : "Could not load two-factor authentication.",
      );
    } else {
      setFactors(
        (data.totp ?? []).map((factor) => ({
          id: factor.id,
          friendly_name: factor.friendly_name,
          status: "verified",
          created_at: factor.created_at,
        })),
      );
    }
    setPending(null);
  }

  useEffect(() => {
    void createClient()
      .auth.mfa.listFactors()
      .then(({ data, error: actionError }) => {
        if (actionError) {
          setError(
            pt
              ? "Não foi possível carregar a verificação em duas etapas."
              : "Could not load two-factor authentication.",
          );
        } else {
          setFactors(
            (data.totp ?? []).map((factor) => ({
              id: factor.id,
              friendly_name: factor.friendly_name,
              status: "verified",
              created_at: factor.created_at,
            })),
          );
        }
        setPending(null);
      });
  }, [pt]);

  async function beginEnrollment() {
    setPending("enroll");
    setError(null);
    const supabase = createClient();
    const existing = await supabase.auth.mfa.listFactors();
    await Promise.all(
      (existing.data?.all ?? [])
        .filter(
          (factor) =>
            factor.factor_type === "totp" && factor.status === "unverified",
        )
        .map((factor) => supabase.auth.mfa.unenroll({ factorId: factor.id })),
    );
    const { data, error: actionError } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName:
        name.trim() || (pt ? "Meu autenticador" : "My authenticator"),
      issuer: "uloggd",
    });
    if (actionError || !data.totp) {
      setError(
        pt
          ? "Não foi possível iniciar a configuração. Tente novamente."
          : "Could not start setup. Try again.",
      );
    } else {
      setEnrollment({
        id: data.id,
        qr: data.totp.qr_code,
        secret: data.totp.secret,
      });
      setCode("");
    }
    setPending(null);
  }

  async function cancelEnrollment() {
    if (enrollment) {
      await createClient().auth.mfa.unenroll({ factorId: enrollment.id });
    }
    setEnrollment(null);
    setCode("");
    setError(null);
  }

  async function verifyEnrollment(event: React.FormEvent) {
    event.preventDefault();
    if (!enrollment || !/^\d{6}$/.test(code)) return;
    setPending("verify");
    setError(null);
    const { error: actionError } =
      await createClient().auth.mfa.challengeAndVerify({
        factorId: enrollment.id,
        code,
      });
    if (actionError) {
      setError(
        pt
          ? "Código inválido ou expirado. Confira o aplicativo e tente novamente."
          : "Invalid or expired code. Check your app and try again.",
      );
    } else {
      setEnrollment(null);
      setName("");
      setCode("");
      await loadFactors();
    }
    setPending(null);
  }

  async function copySecret() {
    if (!enrollment) return;
    await navigator.clipboard.writeText(enrollment.secret);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  async function confirmRemoval(event: React.FormEvent) {
    event.preventDefault();
    if (!removeFactor || !/^\d{6}$/.test(removeCode)) return;
    setPending(removeFactor.id);
    setError(null);
    const supabase = createClient();
    const verification = await supabase.auth.mfa.challengeAndVerify({
      factorId: removeFactor.id,
      code: removeCode,
    });
    const removal = verification.error
      ? null
      : await supabase.auth.mfa.unenroll({ factorId: removeFactor.id });
    if (verification.error || removal?.error) {
      setError(
        pt
          ? "Não foi possível remover. Confira o código atual."
          : "Could not remove it. Check the current code.",
      );
    } else {
      setFactors((current) =>
        current.filter((factor) => factor.id !== removeFactor.id),
      );
      setRemoveFactor(null);
      setRemoveCode("");
      await supabase.auth.refreshSession();
    }
    setPending(null);
  }

  return (
    <section className="settings-security-card settings-mfa-card">
      <header>
        <span data-active={factors.length > 0 || undefined}>
          <ShieldCheck size={20} />
        </span>
        <div>
          <div className="settings-security-title-row">
            <h2>
              {pt ? "Verificação em duas etapas" : "Two-factor authentication"}
            </h2>
            <small data-active={factors.length > 0 || undefined}>
              {factors.length > 0
                ? pt
                  ? "ATIVA"
                  : "ACTIVE"
                : pt
                  ? "DESATIVADA"
                  : "OFF"}
            </small>
          </div>
          <p>
            {pt
              ? "Exija um código temporário do seu aplicativo autenticador sempre que entrar em um novo dispositivo."
              : "Require a temporary code from your authenticator app whenever you sign in on a new device."}
          </p>
        </div>
      </header>

      {pending === "load" ? (
        <div className="settings-passkey-loading">
          <LoaderCircle className="spin" size={18} />
        </div>
      ) : factors.length > 0 ? (
        <div className="settings-mfa-list">
          {factors.map((factor) => (
            <article key={factor.id}>
              <span>
                <Smartphone size={17} />
              </span>
              <div>
                <strong>
                  {factor.friendly_name ||
                    (pt ? "Aplicativo autenticador" : "Authenticator app")}
                </strong>
                <small>
                  {pt ? "Adicionado em" : "Added"}{" "}
                  {new Intl.DateTimeFormat(lang, {
                    dateStyle: "medium",
                  }).format(new Date(factor.created_at))}
                </small>
              </div>
              <button
                type="button"
                onClick={() => setRemoveFactor(factor)}
                aria-label={
                  pt ? "Remover autenticador" : "Remove authenticator"
                }
              >
                {pending === factor.id ? (
                  <LoaderCircle className="spin" size={15} />
                ) : (
                  <Trash2 size={15} />
                )}
              </button>
            </article>
          ))}
          {factors.length === 1 && (
            <div className="settings-mfa-backup-note">
              <ShieldCheck size={15} />
              <p>
                <strong>
                  {pt
                    ? "Adicione um segundo autenticador"
                    : "Add a second authenticator"}
                </strong>
                <span>
                  {pt
                    ? "O Supabase não gera códigos de recuperação. Um segundo dispositivo evita perder o acesso se o primeiro não estiver disponível."
                    : "Supabase does not generate recovery codes. A second device helps preserve access if the first is unavailable."}
                </span>
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="settings-mfa-empty">
          <KeyRound size={17} />
          <p>
            <strong>
              {pt
                ? "Sua conta usa apenas uma etapa"
                : "Your account uses one step"}
            </strong>
            <span>
              {pt
                ? "Adicione um autenticador para impedir acessos mesmo se sua senha for descoberta."
                : "Add an authenticator to prevent access even if your password is compromised."}
            </span>
          </p>
        </div>
      )}

      {error && (
        <p className="settings-security-error" role="alert">
          {error}
        </p>
      )}

      <Dialog.Root
        open={Boolean(enrollment)}
        onOpenChange={(next) => {
          if (!next) void cancelEnrollment();
        }}
      >
        <div className="settings-mfa-enroll-row">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={40}
            placeholder={
              pt ? "Nome do dispositivo (opcional)" : "Device name (optional)"
            }
            aria-label={pt ? "Nome do autenticador" : "Authenticator name"}
          />
          <button
            type="button"
            onClick={beginEnrollment}
            disabled={Boolean(pending) || factors.length >= 10}
          >
            {pending === "enroll" ? (
              <LoaderCircle className="spin" size={15} />
            ) : (
              <Plus size={15} />
            )}
            {factors.length >= 10
              ? pt
                ? "Limite atingido"
                : "Limit reached"
              : pt
                ? "Adicionar autenticador"
                : "Add authenticator"}
          </button>
        </div>
        <Dialog.Portal>
          <Dialog.Overlay className="mfa-dialog-overlay" />
          <Dialog.Content className="mfa-setup-dialog">
            <header>
              <div>
                <span>{pt ? "PROTEÇÃO DA CONTA" : "ACCOUNT PROTECTION"}</span>
                <Dialog.Title>
                  {pt
                    ? "Conecte seu autenticador"
                    : "Connect your authenticator"}
                </Dialog.Title>
                <Dialog.Description>
                  {pt
                    ? "Escaneie o QR code e confirme com o código de seis dígitos."
                    : "Scan the QR code and confirm with the six-digit code."}
                </Dialog.Description>
              </div>
              <Dialog.Close aria-label={pt ? "Fechar" : "Close"}>
                <X size={18} />
              </Dialog.Close>
            </header>
            {enrollment && (
              <form onSubmit={verifyEnrollment}>
                <div className="mfa-setup-grid">
                  <div className="mfa-qr-frame">
                    <img
                      src={enrollment.qr}
                      alt={
                        pt ? "QR code do autenticador" : "Authenticator QR code"
                      }
                    />
                  </div>
                  <div className="mfa-setup-steps">
                    <p>
                      <span>1</span>
                      {pt
                        ? "Abra Google Authenticator, 1Password, Authy ou outro app TOTP."
                        : "Open Google Authenticator, 1Password, Authy, or another TOTP app."}
                    </p>
                    <p>
                      <span>2</span>
                      {pt
                        ? "Escaneie o QR code. Se não conseguir, copie a chave abaixo."
                        : "Scan the QR code. If needed, copy the key below."}
                    </p>
                    <button
                      type="button"
                      className="mfa-secret"
                      onClick={copySecret}
                      data-copied={copied || undefined}
                    >
                      <code>{enrollment.secret}</code>
                      {copied ? <Check size={15} /> : <Clipboard size={15} />}
                    </button>
                  </div>
                </div>
                <label>
                  {pt ? "Código de confirmação" : "Confirmation code"}
                  <input
                    value={code}
                    onChange={(event) =>
                      setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]{6}"
                    placeholder="000000"
                    autoFocus
                  />
                </label>
                {error && <p role="alert">{error}</p>}
                <footer>
                  <Dialog.Close type="button">
                    {pt ? "Cancelar" : "Cancel"}
                  </Dialog.Close>
                  <button
                    type="submit"
                    disabled={pending === "verify" || code.length !== 6}
                  >
                    {pending === "verify" && (
                      <LoaderCircle className="spin" size={15} />
                    )}
                    {pt ? "Ativar proteção" : "Enable protection"}
                  </button>
                </footer>
              </form>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root
        open={Boolean(removeFactor)}
        onOpenChange={(next) => !next && setRemoveFactor(null)}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="mfa-dialog-overlay" />
          <Dialog.Content className="mfa-remove-dialog">
            <Dialog.Close aria-label={pt ? "Fechar" : "Close"}>
              <X size={18} />
            </Dialog.Close>
            <span>
              <Trash2 size={22} />
            </span>
            <Dialog.Title>
              {pt ? "Remover autenticador?" : "Remove authenticator?"}
            </Dialog.Title>
            <Dialog.Description>
              {pt
                ? "Confirme com um código atual. Você pode perder a proteção da conta se este for o único autenticador."
                : "Confirm with a current code. Your account may lose protection if this is your only authenticator."}
            </Dialog.Description>
            {error && <p role="alert">{error}</p>}
            <form onSubmit={confirmRemoval}>
              <input
                value={removeCode}
                onChange={(event) =>
                  setRemoveCode(
                    event.target.value.replace(/\D/g, "").slice(0, 6),
                  )
                }
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                placeholder="000000"
                aria-label={pt ? "Código atual" : "Current code"}
                autoFocus
              />
              <button
                type="submit"
                disabled={removeCode.length !== 6 || Boolean(pending)}
              >
                {pt ? "Confirmar remoção" : "Confirm removal"}
              </button>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  );
}
