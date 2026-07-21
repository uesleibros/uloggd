"use client";

import { CalendarDays, LoaderCircle, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { birthDateLimits } from "@/lib/age-access";
import type { UiLang } from "@/lib/ui-text";

export function AnonymousAgeForm({
  minimumAge,
  lang,
}: {
  minimumAge: number;
  lang: UiLang;
}) {
  const pt = lang === "pt-BR";
  const router = useRouter();
  const limits = useMemo(() => birthDateLimits(), []);
  const [value, setValue] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!value || pending) return;
    setPending(true);
    setError(null);
    const response = await fetch("/api/age/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ birthDate: value, minimumAge }),
    });
    const result = (await response.json().catch(() => null)) as {
      eligible?: boolean;
    } | null;
    if (!response.ok)
      setError(
        pt
          ? "Confira a data e tente novamente."
          : "Check the date and try again.",
      );
    else if (!result?.eligible)
      setError(
        pt
          ? `Este conteúdo exige idade mínima de ${minimumAge} anos.`
          : `This content requires a minimum age of ${minimumAge}.`,
      );
    else router.refresh();
    setPending(false);
  }
  return (
    <form className="anonymous-age-form" onSubmit={submit}>
      <label>
        {pt ? "Informe sua data de nascimento" : "Enter your birth date"}
        <span>
          <CalendarDays size={16} />
          <input
            type="date"
            value={value}
            min={limits.min}
            max={new Date().toISOString().slice(0, 10)}
            required
            autoComplete="bday"
            onChange={(event) => {
              setValue(event.target.value);
              setError(null);
            }}
          />
        </span>
      </label>
      <button type="submit" disabled={!value || pending}>
        {pending ? (
          <LoaderCircle className="spin" size={16} />
        ) : (
          <ShieldCheck size={16} />
        )}
        {pt ? "Verificar idade" : "Verify age"}
      </button>
      {error && <p role="alert">{error}</p>}
      <small>
        {pt
          ? "A data não é armazenada. Guardamos somente uma declaração de idade protegida por 30 dias neste navegador."
          : "The date is not stored. We keep only a protected age assertion for 30 days in this browser."}
      </small>
    </form>
  );
}
