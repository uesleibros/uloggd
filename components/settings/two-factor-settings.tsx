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
import { RelativeTime } from "@/components/relative-time";
import { createClient } from "@/lib/supabase/client";
import "../auth/mfa.css";
import { tri, uiText, type UiLang } from "@/lib/ui-text";

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

export function TwoFactorSettings({ lang }: { lang: UiLang }) {
  const t = uiText(lang);
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
        tri(
          lang,
          "Não foi possível carregar a verificação em duas etapas.",
          "Could not load two-factor authentication.",
          "No se pudo cargar la verificación en dos pasos.",
        ),
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
            tri(
              lang,
              "Não foi possível carregar a verificação em duas etapas.",
              "Could not load two-factor authentication.",
              "No se pudo cargar la verificación en dos pasos.",
            ),
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
  }, [lang]);

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
        name.trim() ||
        tri(lang, "Meu autenticador", "My authenticator", "Mi autenticador"),
      issuer: "uloggd",
    });
    if (actionError || !data.totp) {
      setError(
        tri(
          lang,
          "Não foi possível iniciar a configuração. Tente novamente.",
          "Could not start setup. Try again.",
          "No se pudo iniciar la configuración. Inténtalo de nuevo.",
        ),
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
        tri(
          lang,
          "Código inválido ou expirado. Confira o aplicativo e tente novamente.",
          "Invalid or expired code. Check your app and try again.",
          "Código inválido o caducado. Revisa la aplicación e inténtalo de nuevo.",
        ),
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
        tri(
          lang,
          "Não foi possível remover. Confira o código atual.",
          "Could not remove it. Check the current code.",
          "No se pudo quitar. Revisa el código actual.",
        ),
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
              {tri(
                lang,
                "Verificação em duas etapas",
                "Two-factor authentication",
                "Verificación en dos pasos",
              )}
            </h2>
            <small data-active={factors.length > 0 || undefined}>
              {factors.length > 0
                ? tri(lang, "ATIVA", "ACTIVE", "ACTIVA")
                : tri(lang, "DESATIVADA", "OFF", "DESACTIVADA")}
            </small>
          </div>
          <p>
            {tri(
              lang,
              "Exija um código temporário do seu aplicativo autenticador sempre que entrar em um novo dispositivo.",
              "Require a temporary code from your authenticator app whenever you sign in on a new device.",
              "Exige un código temporal de tu aplicación de autenticación cada vez que entres en un dispositivo nuevo.",
            )}
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
                <strong>{factor.friendly_name || t.authenticatorApp}</strong>
                <small>
                  {tri(lang, "Adicionado em", "Added", "Añadido el")}{" "}
                  <RelativeTime value={factor.created_at} lang={lang} />
                </small>
              </div>
              <button
                type="button"
                onClick={() => setRemoveFactor(factor)}
                aria-label={tri(
                  lang,
                  "Remover autenticador",
                  "Remove authenticator",
                  "Quitar autenticador",
                )}
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
                  {tri(
                    lang,
                    "Adicione um segundo autenticador",
                    "Add a second authenticator",
                    "Añade un segundo autenticador",
                  )}
                </strong>
                <span>
                  {tri(
                    lang,
                    "O Supabase não gera códigos de recuperação. Um segundo dispositivo evita perder o acesso se o primeiro não estiver disponível.",
                    "Supabase does not generate recovery codes. A second device helps preserve access if the first is unavailable.",
                    "Supabase no genera códigos de recuperación. Un segundo dispositivo evita perder el acceso si el primero no está disponible.",
                  )}
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
              {tri(
                lang,
                "Sua conta usa apenas uma etapa",
                "Your account uses one step",
                "Tu cuenta usa un solo paso",
              )}
            </strong>
            <span>
              {tri(
                lang,
                "Adicione um autenticador para impedir acessos mesmo se sua senha for descoberta.",
                "Add an authenticator to prevent access even if your password is compromised.",
                "Añade un autenticador para impedir accesos aunque descubran tu contraseña.",
              )}
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
            placeholder={tri(
              lang,
              "Nome do dispositivo (opcional)",
              "Device name (optional)",
              "Nombre del dispositivo (opcional)",
            )}
            aria-label={tri(
              lang,
              "Nome do autenticador",
              "Authenticator name",
              "Nombre del autenticador",
            )}
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
              ? tri(
                  lang,
                  "Limite atingido",
                  "Limit reached",
                  "Límite alcanzado",
                )
              : tri(
                  lang,
                  "Adicionar autenticador",
                  "Add authenticator",
                  "Añadir autenticador",
                )}
          </button>
        </div>
        <Dialog.Portal>
          <Dialog.Overlay className="mfa-dialog-overlay" />
          <Dialog.Content className="mfa-setup-dialog">
            <header>
              <div>
                <span>
                  {tri(
                    lang,
                    "PROTEÇÃO DA CONTA",
                    "ACCOUNT PROTECTION",
                    "PROTECCIÓN DE LA CUENTA",
                  )}
                </span>
                <Dialog.Title>
                  {tri(
                    lang,
                    "Conecte seu autenticador",
                    "Connect your authenticator",
                    "Conecta tu autenticador",
                  )}
                </Dialog.Title>
                <Dialog.Description>
                  {tri(
                    lang,
                    "Escaneie o QR code e confirme com o código de seis dígitos.",
                    "Scan the QR code and confirm with the six-digit code.",
                    "Escanea el código QR y confirma con el código de seis dígitos.",
                  )}
                </Dialog.Description>
              </div>
              <Dialog.Close aria-label={t.close}>
                <X size={18} />
              </Dialog.Close>
            </header>
            {enrollment && (
              <form onSubmit={verifyEnrollment}>
                <div className="mfa-setup-grid">
                  <div className="mfa-qr-frame">
                    <img
                      src={enrollment.qr}
                      alt={tri(
                        lang,
                        "QR code do autenticador",
                        "Authenticator QR code",
                        "Código QR del autenticador",
                      )}
                    />
                  </div>
                  <div className="mfa-setup-steps">
                    <p>
                      <span>1</span>
                      {tri(
                        lang,
                        "Abra Google Authenticator, 1Password, Authy ou outro app TOTP.",
                        "Open Google Authenticator, 1Password, Authy, or another TOTP app.",
                        "Abre Google Authenticator, 1Password, Authy u otra app TOTP.",
                      )}
                    </p>
                    <p>
                      <span>2</span>
                      {tri(
                        lang,
                        "Escaneie o QR code. Se não conseguir, copie a chave abaixo.",
                        "Scan the QR code. If needed, copy the key below.",
                        "Escanea el código QR. Si no puedes, copia la clave de abajo.",
                      )}
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
                  {tri(
                    lang,
                    "Código de confirmação",
                    "Confirmation code",
                    "Código de confirmación",
                  )}
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
                  <Dialog.Close type="button">{t.cancel}</Dialog.Close>
                  <button
                    type="submit"
                    disabled={pending === "verify" || code.length !== 6}
                  >
                    {pending === "verify" && (
                      <LoaderCircle className="spin" size={15} />
                    )}
                    {tri(
                      lang,
                      "Ativar proteção",
                      "Enable protection",
                      "Activar protección",
                    )}
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
            <Dialog.Close aria-label={t.close}>
              <X size={18} />
            </Dialog.Close>
            <span>
              <Trash2 size={22} />
            </span>
            <Dialog.Title>
              {tri(
                lang,
                "Remover autenticador?",
                "Remove authenticator?",
                "¿Quitar autenticador?",
              )}
            </Dialog.Title>
            <Dialog.Description>
              {tri(
                lang,
                "Confirme com um código atual. Você pode perder a proteção da conta se este for o único autenticador.",
                "Confirm with a current code. Your account may lose protection if this is your only authenticator.",
                "Confirma con un código actual. Tu cuenta puede perder protección si este es tu único autenticador.",
              )}
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
                aria-label={tri(
                  lang,
                  "Código atual",
                  "Current code",
                  "Código actual",
                )}
                autoFocus
              />
              <button
                type="submit"
                disabled={removeCode.length !== 6 || Boolean(pending)}
              >
                {tri(
                  lang,
                  "Confirmar remoção",
                  "Confirm removal",
                  "Confirmar eliminación",
                )}
              </button>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  );
}
