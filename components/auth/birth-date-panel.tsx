"use client";

import {
  CalendarDays,
  Check,
  LoaderCircle,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ageOnDate, birthDateLimits } from "@/lib/age-access";
import { createClient } from "@/lib/supabase/client";

export function BirthDatePanel({ lang }: { lang: "pt-BR" | "en" }) {
  const pt = lang === "pt-BR";
  const router = useRouter();
  const limits = useMemo(() => birthDateLimits(), []);
  const [value, setValue] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const age = value ? ageOnDate(value) : null;
  const valid = age !== null && age >= 12 && age <= 120;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!valid || !confirmed || pending) return;
    setPending(true);
    setError(null);
    const { error: actionError } = await createClient().rpc("set_birth_date", {
      candidate: value,
    });
    if (actionError) {
      setError(
        actionError.code === "PGRST202" || actionError.code === "42883"
          ? pt
            ? "A etapa de idade ainda não está disponível. A configuração do banco precisa ser aplicada."
            : "The age step is not available yet. The database configuration must be applied."
          : pt
            ? "Não foi possível registrar sua data. Confira os dados e tente novamente."
            : "Could not record your date. Check it and try again.",
      );
      setPending(false);
      return;
    }
    router.replace(`/${lang}`);
    router.refresh();
  }

  return (
    <section className="login-panel birth-date-panel">
      <div
        className="onboarding-progress"
        aria-label={pt ? "Etapa 2 de 2" : "Step 2 of 2"}
      >
        <span>
          <Check size={12} aria-hidden />
        </span>
        <i />
        <span data-current>2</span>
      </div>
      <div className="login-panel-heading">
        <span className="onboarding-icon">
          <ShieldCheck size={21} />
        </span>
        <h1>{pt ? "Proteja sua experiência" : "Protect your experience"}</h1>
        <p>
          {pt
            ? "Sua data de nascimento define quais jogos podem ser acessados conforme a Classificação Indicativa brasileira."
            : "Your birth date determines which games you can access under Brazil’s age-rating system."}
        </p>
      </div>
      <form className="auth-form" onSubmit={submit}>
        <label>
          {pt ? "Data de nascimento" : "Birth date"}
          <span className="birth-date-input">
            <CalendarDays size={17} aria-hidden />
            <input
              type="date"
              value={value}
              min={limits.min}
              max={limits.max}
              required
              autoComplete="bday"
              onChange={(event) => {
                setValue(event.target.value);
                setConfirmed(false);
                setError(null);
              }}
            />
          </span>
        </label>
        <label className="birth-date-confirmation">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(event) => setConfirmed(event.target.checked)}
          />
          <span>
            {pt
              ? "Confirmo que a data está correta. Depois de salva, ela não poderá ser alterada."
              : "I confirm this date is correct. Once saved, it cannot be changed."}
          </span>
        </label>
        <div className="birth-date-privacy">
          <LockKeyhole size={15} aria-hidden />
          <p>
            {pt
              ? "A data não aparece no seu perfil. Ela é usada para proteção etária e segurança da conta. O cadastro exige pelo menos 12 anos."
              : "The date is never shown on your profile. It is used for age protection and account safety. You must be at least 12."}
          </p>
        </div>
        <button
          className="auth-primary"
          disabled={!valid || !confirmed || pending}
        >
          {pending ? (
            <LoaderCircle className="spin" size={18} />
          ) : (
            <ShieldCheck size={17} />
          )}
          {pt ? "Confirmar e entrar" : "Confirm and enter"}
        </button>
      </form>
      {error && (
        <div className="auth-error" role="alert">
          {error}
        </div>
      )}
    </section>
  );
}
