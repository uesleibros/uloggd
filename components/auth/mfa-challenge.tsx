"use client";

import { KeyRound, LoaderCircle, LogOut, ShieldCheck } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { safeInternalNext } from "@/lib/auth-validation";
import { createClient } from "@/lib/supabase/client";
import "./mfa.css";
import { uiText, type UiLang } from "@/lib/ui-text";

type Factor = { id: string; friendly_name?: string; status: string };

export function MfaChallenge({ lang }: { lang: UiLang }) {
  const pt = lang === "pt-BR";
  const t = uiText(lang);
  const searchParams = useSearchParams();
  const [factors, setFactors] = useState<Factor[]>([]);
  const [selected, setSelected] = useState("");
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.mfa
      .listFactors()
      .then(({ data, error: actionError }) => {
        const verified = (data?.totp ?? []).filter(
          (factor) => factor.status === "verified",
        );
        if (actionError || verified.length === 0) {
          setError(
            pt
              ? "Nenhum autenticador ativo foi encontrado."
              : "No active authenticator was found.",
          );
        } else {
          setFactors(verified);
          setSelected(verified[0].id);
        }
        setPending(false);
      });
  }, [pt]);

  async function verify(event: React.FormEvent) {
    event.preventDefault();
    if (!selected || code.length !== 6) return;
    setPending(true);
    setError(null);
    const { error: actionError } =
      await createClient().auth.mfa.challengeAndVerify({
        factorId: selected,
        code,
      });
    if (actionError) {
      setError(
        pt
          ? "Código inválido ou expirado. Abra o aplicativo e tente novamente."
          : "Invalid or expired code. Open your app and try again.",
      );
      setCode("");
      setPending(false);
      return;
    }
    window.location.replace(safeInternalNext(searchParams.get("next"), lang));
  }

  async function signOut() {
    setPending(true);
    await createClient().auth.signOut();
    window.location.replace(`/${lang}/login`);
  }

  return (
    <section className="mfa-challenge-card">
      <div className="mfa-challenge-mark">
        <ShieldCheck size={28} />
      </div>
      <span>{pt ? "SEGUNDA ETAPA" : "SECOND STEP"}</span>
      <h1>{pt ? "Confirme que é você" : "Confirm it's you"}</h1>
      <p>
        {pt
          ? "Digite o código temporário do seu aplicativo autenticador para concluir o acesso."
          : "Enter the temporary code from your authenticator app to complete sign-in."}
      </p>
      {factors.length > 1 && (
        <div
          className="mfa-factor-picker"
          role="radiogroup"
          aria-label={pt ? "Autenticador" : "Authenticator"}
        >
          {factors.map((factor) => (
            <button
              key={factor.id}
              type="button"
              role="radio"
              aria-checked={selected === factor.id}
              onClick={() => setSelected(factor.id)}
            >
              <KeyRound size={15} />
              {factor.friendly_name || t.authenticatorApp}
            </button>
          ))}
        </div>
      )}
      <form onSubmit={verify}>
        <label>
          {pt ? "Código de seis dígitos" : "Six-digit code"}
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
        <button
          type="submit"
          disabled={pending || code.length !== 6 || !selected}
        >
          {pending && <LoaderCircle className="spin" size={16} />}
          {pt ? "Verificar e continuar" : "Verify and continue"}
        </button>
      </form>
      <button
        className="mfa-challenge-signout"
        type="button"
        onClick={signOut}
        disabled={pending}
      >
        <LogOut size={14} />{" "}
        {pt ? "Entrar com outra conta" : "Use another account"}
      </button>
    </section>
  );
}
