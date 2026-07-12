"use client";

import { Star, X } from "lucide-react";
import { useState } from "react";

export function StarRating({
  value,
  onChange,
  disabled = false,
  compact = false,
  lang,
}: {
  value: number | null;
  onChange: (value: number | null) => void;
  disabled?: boolean;
  compact?: boolean;
  lang: "pt-BR" | "en";
}) {
  const selected = value ? value / 10 : 0;
  const [preview, setPreview] = useState<number | null>(null);
  const visibleValue = preview ?? selected;
  const pt = lang === "pt-BR";
  const formatRating = (halfSteps: number) =>
    (halfSteps / 2).toLocaleString(lang, {
      minimumFractionDigits: halfSteps % 2,
      maximumFractionDigits: 1,
    });

  return (
    <div
      className={`star-rating${compact ? " star-rating-compact" : ""}`}
      role="group"
      aria-label={pt ? "Sua avaliação" : "Your rating"}
    >
      <div
        className="star-rating-stars"
        onMouseLeave={() => setPreview(null)}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) {
            setPreview(null);
          }
        }}
      >
        {[1, 2, 3, 4, 5].map((star) => {
          const firstHalf = star * 2 - 1;
          const secondHalf = star * 2;
          const fill =
            visibleValue >= secondHalf
              ? "full"
              : visibleValue >= firstHalf
                ? "half"
                : "empty";
          return (
            <span className="star-rating-star" data-fill={fill} key={star}>
              <Star className="star-rating-base" aria-hidden />
              <span className="star-rating-fill" aria-hidden>
                <Star fill="currentColor" />
              </span>
              {[firstHalf, secondHalf].map((halfSteps, index) => {
                const label = formatRating(halfSteps);
                return (
                  <button
                    className={
                      index === 0 ? "star-half-left" : "star-half-right"
                    }
                    key={halfSteps}
                    type="button"
                    disabled={disabled}
                    onMouseEnter={() => setPreview(halfSteps)}
                    onFocus={() => setPreview(halfSteps)}
                    onClick={() => onChange(halfSteps * 10)}
                    aria-label={
                      pt
                        ? `Avaliar com ${label} ${label === "1" ? "estrela" : "estrelas"}`
                        : `Rate ${label} ${label === "1" ? "star" : "stars"}`
                    }
                    aria-pressed={selected === halfSteps}
                  />
                );
              })}
            </span>
          );
        })}
      </div>
      {value !== null && (
        <button
          className="star-rating-clear"
          type="button"
          disabled={disabled}
          onClick={() => onChange(null)}
          aria-label={pt ? "Remover avaliação" : "Remove rating"}
          title={pt ? "Remover avaliação" : "Remove rating"}
        >
          <X size={compact ? 13 : 14} />
          {!compact && (pt ? "Remover" : "Remove")}
        </button>
      )}
      {!compact && (
        <span className="star-rating-value" aria-live="polite">
          {visibleValue
            ? pt
              ? `${formatRating(visibleValue)} de 5`
              : `${formatRating(visibleValue)} out of 5`
            : pt
              ? "Sem nota"
              : "Not rated"}
        </span>
      )}
    </div>
  );
}
