"use client";

import { Checkbox } from "@/components/ui/checkbox";

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
import { tri, type UiLang } from "@/lib/ui-text";

export function BirthDatePanel({ lang }: { lang: UiLang }) {
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
          ? tri(
              lang,
              "A etapa de idade ainda não está disponível. A configuração do banco precisa ser aplicada.",
              "The age step is not available yet. The database configuration must be applied.",
              "El paso de edad todavía no está disponible. Falta aplicar la configuración de la base de datos.",
            )
          : tri(
              lang,
              "Não foi possível registrar sua data. Confira os dados e tente novamente.",
              "Could not record your date. Check it and try again.",
              "No se pudo registrar tu fecha. Revísala e inténtalo de nuevo.",
            ),
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
        aria-label={tri(lang, "Etapa 2 de 2", "Step 2 of 2", "Paso 2 de 2")}
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
        <h1>
          {tri(
            lang,
            "Proteja sua experiência",
            "Protect your experience",
            "Protege tu experiencia",
          )}
        </h1>
        <p>
          {tri(
            lang,
            "Sua data de nascimento define quais jogos podem ser acessados conforme a Classificação Indicativa brasileira.",
            "Your birth date determines which games you can access under Brazil’s age-rating system.",
            "Tu fecha de nacimiento determina a qué juegos puedes acceder según la clasificación por edades brasileña.",
          )}
        </p>
      </div>
      <form className="auth-form" onSubmit={submit}>
        <label>
          {tri(lang, "Data de nascimento", "Birth date", "Fecha de nacimiento")}
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
          <Checkbox checked={confirmed} onCheckedChange={setConfirmed} />
          <span>
            {tri(
              lang,
              "Confirmo que a data está correta. Depois de salva, ela não poderá ser alterada.",
              "I confirm this date is correct. Once saved, it cannot be changed.",
              "Confirmo que la fecha es correcta. Una vez guardada, no se podrá cambiar.",
            )}
          </span>
        </label>
        <div className="birth-date-privacy">
          <LockKeyhole size={15} aria-hidden />
          <p>
            {tri(
              lang,
              "A data não aparece no seu perfil. Ela é usada para proteção etária e segurança da conta. O cadastro exige pelo menos 12 anos.",
              "The date is never shown on your profile. It is used for age protection and account safety. You must be at least 12.",
              "La fecha no aparece en tu perfil. Se usa para la protección por edad y la seguridad de la cuenta. El registro exige al menos 12 años.",
            )}
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
          {tri(
            lang,
            "Confirmar e entrar",
            "Confirm and enter",
            "Confirmar y entrar",
          )}
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
