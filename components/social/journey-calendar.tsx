"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef, useState } from "react";

export type JourneyInterval = { start: string; end: string | null };

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function dayKey(year: number, month: number, day: number) {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

function shiftDay(key: string, delta: number) {
  const date = new Date(`${key}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + delta);
  return date.toISOString().slice(0, 10);
}

function monthOf(value: string | null): { year: number; month: number } {
  if (value && /^\d{4}-\d{2}/.test(value)) {
    return {
      year: Number(value.slice(0, 4)),
      month: Number(value.slice(5, 7)) - 1,
    };
  }
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() };
}

/**
 * Month grid with drag-across-days range selection. A click selects a single
 * day; pressing and dragging selects the whole range. Existing journey
 * entries render as continuous "played" bands across their days, so the
 * calendar reads as the game's play history while a new range is picked.
 * The calendar is a pointer affordance only (aria-hidden): the paired date
 * inputs rendered by the parent form remain the keyboard and screen-reader
 * path.
 */
export function JourneyCalendar({
  lang,
  start,
  end,
  maxDate,
  played = [],
  onChange,
}: {
  lang: "pt-BR" | "en";
  start: string;
  end: string;
  maxDate: string;
  played?: JourneyInterval[];
  onChange: (range: { start: string; end: string }) => void;
}) {
  const pt = lang === "pt-BR";
  const [view, setView] = useState(() => monthOf(start || null));
  const [drag, setDrag] = useState<{ anchor: string; hover: string } | null>(
    null,
  );
  const gridRef = useRef<HTMLDivElement>(null);

  const monthTitle = new Intl.DateTimeFormat(lang, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(view.year, view.month, 15)));
  const weekdayFormat = new Intl.DateTimeFormat(lang, {
    weekday: "narrow",
    timeZone: "UTC",
  });
  // 2026-02-01 is a Sunday; derive localized initials without hardcoding.
  const weekdays = Array.from({ length: 7 }, (_, index) =>
    weekdayFormat.format(new Date(Date.UTC(2026, 1, 1 + index))),
  );

  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
  const leadingBlanks = new Date(view.year, view.month, 1).getDay();

  const rangeStart = drag
    ? drag.anchor <= drag.hover
      ? drag.anchor
      : drag.hover
    : start;
  const rangeEnd = drag
    ? drag.anchor <= drag.hover
      ? drag.hover
      : drag.anchor
    : end || start;

  function covered(key: string) {
    return played.some(
      (interval) => key >= interval.start && key <= (interval.end ?? interval.start),
    );
  }

  function bandFor(key: string, weekday: number) {
    if (!covered(key)) return null;
    return {
      capStart: !covered(shiftDay(key, -1)) || weekday === 0,
      capEnd: !covered(shiftDay(key, 1)) || weekday === 6,
      label: played.some((interval) => interval.start === key),
    };
  }

  function dayFromPoint(clientX: number, clientY: number) {
    const target = document
      .elementFromPoint(clientX, clientY)
      ?.closest<HTMLElement>("[data-day]");
    const day = target?.dataset.day;
    return day && day <= maxDate ? day : null;
  }

  function commit(anchor: string, hover: string) {
    const from = anchor <= hover ? anchor : hover;
    const to = anchor <= hover ? hover : anchor;
    onChange({ start: from, end: to === from ? "" : to });
  }

  function shiftMonth(offset: number) {
    setView((current) => {
      const next = new Date(current.year, current.month + offset, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });
  }

  function selectToday() {
    setView(monthOf(maxDate));
    onChange({ start: maxDate, end: "" });
  }

  return (
    <div className="journey-calendar">
      <header>
        <button
          type="button"
          data-motion="none"
          onClick={() => shiftMonth(-1)}
          aria-label={pt ? "Mês anterior" : "Previous month"}
        >
          <ChevronLeft size={15} />
        </button>
        <div>
          <strong>{monthTitle}</strong>
          <button
            type="button"
            className="journey-calendar-today"
            onClick={selectToday}
          >
            {pt ? "Hoje" : "Today"}
          </button>
        </div>
        <button
          type="button"
          data-motion="none"
          onClick={() => shiftMonth(1)}
          aria-label={pt ? "Próximo mês" : "Next month"}
        >
          <ChevronRight size={15} />
        </button>
      </header>
      <div
        ref={gridRef}
        className="journey-calendar-grid"
        aria-hidden="true"
        data-dragging={drag ? "" : undefined}
        onPointerDown={(event) => {
          const day = dayFromPoint(event.clientX, event.clientY);
          if (!day) return;
          event.preventDefault();
          gridRef.current?.setPointerCapture(event.pointerId);
          setDrag({ anchor: day, hover: day });
        }}
        onPointerMove={(event) => {
          if (!drag) return;
          const day = dayFromPoint(event.clientX, event.clientY);
          if (day && day !== drag.hover)
            setDrag({ anchor: drag.anchor, hover: day });
        }}
        onPointerUp={() => {
          if (!drag) return;
          commit(drag.anchor, drag.hover);
          setDrag(null);
        }}
        onPointerCancel={() => setDrag(null)}
      >
        {weekdays.map((weekday, index) => (
          <span className="journey-calendar-weekday" key={index}>
            {weekday}
          </span>
        ))}
        {Array.from({ length: leadingBlanks }, (_, index) => (
          <span key={`blank-${index}`} />
        ))}
        {Array.from({ length: daysInMonth }, (_, index) => {
          const key = dayKey(view.year, view.month, index + 1);
          const weekday = (leadingBlanks + index) % 7;
          const disabled = key > maxDate;
          const selected =
            Boolean(rangeStart) && key >= rangeStart && key <= rangeEnd;
          const band = bandFor(key, weekday);
          return (
            <span
              key={key}
              data-day={disabled ? undefined : key}
              data-disabled={disabled || undefined}
              data-selected={selected || undefined}
              data-edge={
                (selected && (key === rangeStart || key === rangeEnd)) ||
                undefined
              }
              data-today={key === maxDate || undefined}
            >
              {index + 1}
              {band && (
                <i
                  data-cap-start={band.capStart || undefined}
                  data-cap-end={band.capEnd || undefined}
                >
                  {band.label ? (pt ? "Jogado" : "Played") : ""}
                </i>
              )}
            </span>
          );
        })}
      </div>
      <p className="journey-calendar-hint">
        {pt
          ? "Toque em um dia ou arraste para marcar um intervalo."
          : "Tap a day or drag to mark a range."}
      </p>
    </div>
  );
}
