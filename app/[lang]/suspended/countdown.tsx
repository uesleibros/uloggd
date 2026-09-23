"use client";

import Link from "next/link";
import { useNow } from "@/lib/use-now";
import { tri, type UiLang } from "@/lib/ui-text";

/**
 * How much of the suspension is left, counting down.
 *
 * The screen used to say "in 6 days" and nothing else, which is the one
 * sentence somebody reads it for and the one it made them work out for
 * themselves from a date. This is the same fact, moving: the two largest
 * units that still matter, and a bar for how much of the sentence has been
 * served.
 *
 */
export function SuspensionCountdown({
  from,
  until,
  lang,
}: {
  from: string;
  until: string;
  lang: UiLang;
}) {
  const ends = new Date(until).getTime();
  const started = new Date(from).getTime();
  // Every second, because the last minute of a suspension is the one somebody
  // is actually watching, and this is the only thing on the screen that moves.
  const now = useNow(1000);
  const left = Math.max(0, ends - now);

  if (left === 0)
    return (
      <div className="suspension-countdown" data-over>
        <strong>
          {tri(
            lang,
            "A suspensão terminou",
            "The suspension is over",
            "La suspensión terminó",
          )}
        </strong>
        <Link href={`/${lang}`} prefetch={false}>
          {tri(lang, "Voltar ao uloggd", "Back to uloggd", "Volver a uloggd")}
        </Link>
      </div>
    );

  const total = Math.max(1, ends - started);
  const served = Math.min(100, Math.max(0, ((total - left) / total) * 100));
  const seconds = Math.floor(left / 1000);
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;

  const unit = (
    value: number,
    pt: [string, string],
    en: [string, string],
    es: [string, string],
  ) =>
    `${value} ${tri(lang, value === 1 ? pt[0] : pt[1], value === 1 ? en[0] : en[1], value === 1 ? es[0] : es[1])}`;
  const parts = days
    ? [
        unit(days, ["dia", "dias"], ["day", "days"], ["día", "días"]),
        unit(hours, ["hora", "horas"], ["hour", "hours"], ["hora", "horas"]),
      ]
    : hours
      ? [
          unit(hours, ["hora", "horas"], ["hour", "hours"], ["hora", "horas"]),
          unit(
            minutes,
            ["minuto", "minutos"],
            ["minute", "minutes"],
            ["minuto", "minutos"],
          ),
        ]
      : [
          unit(
            minutes,
            ["minuto", "minutos"],
            ["minute", "minutes"],
            ["minuto", "minutos"],
          ),
          unit(
            rest,
            ["segundo", "segundos"],
            ["second", "seconds"],
            ["segundo", "segundos"],
          ),
        ];

  return (
    <div className="suspension-countdown">
      <small>
        {tri(lang, "Tempo restante", "Time left", "Tiempo restante")}
      </small>
      <strong>{parts.join(tri(lang, " e ", " and ", " y "))}</strong>
      <span
        className="suspension-progress"
        style={{ "--served": `${served}%` } as React.CSSProperties}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(served)}
        aria-label={tri(
          lang,
          "Parte da suspensão já cumprida",
          "Part of the suspension already served",
          "Parte de la suspensión ya cumplida",
        )}
      />
    </div>
  );
}
