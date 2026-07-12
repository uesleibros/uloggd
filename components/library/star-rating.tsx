"use client";

import { Star } from "lucide-react";

export function StarRating({
  value,
  onChange,
  disabled = false,
  compact = false,
  lang,
}: {
  value: number | null;
  onChange: (value: number) => void;
  disabled?: boolean;
  compact?: boolean;
  lang: "pt-BR" | "en";
}) {
  const selected = value ? Math.round(value / 20) : 0;
  const pt = lang === "pt-BR";

  return (
    <div
      className={`star-rating${compact ? " star-rating-compact" : ""}`}
      role="group"
      aria-label={pt ? "Sua avaliação" : "Your rating"}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          data-active={star <= selected || undefined}
          disabled={disabled}
          onClick={() => onChange(star * 20)}
          aria-label={
            pt
              ? `Avaliar com ${star} ${star === 1 ? "estrela" : "estrelas"}`
              : `Rate ${star} ${star === 1 ? "star" : "stars"}`
          }
          aria-pressed={star === selected}
        >
          <Star size={compact ? 14 : 18} fill="currentColor" />
        </button>
      ))}
      {!compact && (
        <span aria-live="polite">
          {selected
            ? pt
              ? `${selected} de 5`
              : `${selected} out of 5`
            : pt
              ? "Sem nota"
              : "Not rated"}
        </span>
      )}
    </div>
  );
}
