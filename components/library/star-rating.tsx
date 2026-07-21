"use client";

import { Star } from "lucide-react";
import { useState } from "react";
import type { UiLang } from "@/lib/ui-text";

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
  lang: UiLang;
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
                const removesRating = selected === halfSteps;
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
                    onClick={() => {
                      if (removesRating) setPreview(null);
                      onChange(removesRating ? null : halfSteps * 10);
                    }}
                    aria-label={
                      removesRating
                        ? pt
                          ? `Remover avaliação de ${label} ${label === "1" ? "estrela" : "estrelas"}`
                          : `Remove ${label} ${label === "1" ? "star" : "stars"} rating`
                        : pt
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
    </div>
  );
}
