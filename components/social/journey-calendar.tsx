"use client";

import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FastForward,
  Flag,
  Play,
  Rewind,
} from "lucide-react";
import { useRef, useState } from "react";
import { tri, type UiLang } from "@/lib/ui-text";

export type JourneySession = {
  id: string;
  start: string;
  end: string | null;
  minutes: number | null;
  note: string | null;
  marksStart: boolean;
  marksFinish: boolean;
  spoilers: boolean;
  visibility: "PUBLIC" | "FOLLOWERS" | "PRIVATE";
  commentsScope: "EVERYONE" | "FOLLOWERS" | "NOBODY";
  journeyId: string | null;
};

export type JourneyOption = {
  id: string;
  title: string;
  publicId?: string | null;
};

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

function intensity(session: JourneySession | undefined) {
  if (!session) return 0;
  const total = session.minutes ?? 0;
  if (total <= 30) return 1;
  if (total <= 60) return 2;
  if (total <= 120) return 3;
  if (total <= 240) return 4;
  return 5;
}

export function formatSessionTime(minutes: number | null) {
  if (!minutes) return null;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours > 0 && rest > 0) return `${hours}:${pad(rest)}`;
  if (hours > 0) return `${hours}h`;
  return `${rest}m`;
}

/**
 * The journal calendar IS the session editor, mirroring the legacy uloggd
 * journal: every logged day shows its played time with a heat intensity,
 * contiguous days fuse into bars, tapping a day opens that day's session,
 * and dragging paints (or erases, when starting on a logged day) whole
 * stretches at once. The grid is pointer-only (aria-hidden): the parent
 * form provides the accessible date-input path.
 */
export function JourneyCalendar({
  lang,
  maxDate,
  sessions,
  busy = false,
  onDayOpen,
  onBulkAdd,
  onBulkRemove,
}: {
  lang: UiLang;
  maxDate: string;
  sessions: JourneySession[];
  busy?: boolean;
  onDayOpen: (day: string, session: JourneySession | null) => void;
  onBulkAdd: (days: string[]) => void;
  onBulkRemove: (days: string[]) => void;
}) {
  const pt = lang === "pt-BR";
  const [view, setView] = useState(() => monthOf(null));
  const [drag, setDrag] = useState<{
    mode: "add" | "remove";
    anchor: string;
    hover: string;
  } | null>(null);
  const pendingRef = useRef<{ day: string; mode: "add" | "remove" } | null>(
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

  function sessionFor(key: string) {
    return sessions.find(
      (session) =>
        key >= session.start && key <= (session.end ?? session.start),
    );
  }

  function dayFromPoint(clientX: number, clientY: number) {
    const target = document
      .elementFromPoint(clientX, clientY)
      ?.closest<HTMLElement>("[data-day]");
    const day = target?.dataset.day;
    return day && day <= maxDate ? day : null;
  }

  function daysBetween(a: string, b: string) {
    const [from, to] = a <= b ? [a, b] : [b, a];
    const days: string[] = [];
    let cursor = from;
    while (cursor <= to && days.length < 366) {
      days.push(cursor);
      cursor = shiftDay(cursor, 1);
    }
    return days;
  }

  const dragDays = drag ? new Set(daysBetween(drag.anchor, drag.hover)) : null;

  function extendTo(day: string) {
    const pending = pendingRef.current;
    if (drag) {
      if (day !== drag.hover)
        setDrag({ mode: drag.mode, anchor: drag.anchor, hover: day });
      return;
    }
    if (pending && day !== pending.day) {
      setDrag({ mode: pending.mode, anchor: pending.day, hover: day });
      pendingRef.current = null;
    }
  }

  function finish() {
    const pending = pendingRef.current;
    pendingRef.current = null;
    if (pending && !drag) {
      onDayOpen(pending.day, sessionFor(pending.day) ?? null);
      return;
    }
    if (drag) {
      const days = daysBetween(drag.anchor, drag.hover);
      if (drag.mode === "add") onBulkAdd(days);
      else onBulkRemove(days);
      setDrag(null);
    }
  }

  function shiftMonth(offset: number) {
    setView((current) => {
      const next = new Date(current.year, current.month + offset, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });
  }

  const sortedStarts = [...sessions].sort((a, b) =>
    a.start.localeCompare(b.start),
  );
  const jumpTargets = {
    start:
      sortedStarts.find((session) => session.marksStart)?.start ??
      sortedStarts[0]?.start ??
      null,
    latest: sortedStarts.at(-1)?.start ?? null,
    finish:
      [...sortedStarts].reverse().find((session) => session.marksFinish)
        ?.start ?? null,
  };
  const jumps: Array<{
    key: string;
    label: string;
    icon: typeof Rewind;
    target: string | null;
  }> = [
    {
      key: "start",
      label: tri(lang, "Início", "Start", "Inicio"),
      icon: Rewind,
      target: jumpTargets.start,
    },
    {
      key: "today",
      label: tri(lang, "Hoje", "Today", "Hoy"),
      icon: CalendarDays,
      target: maxDate,
    },
    {
      key: "latest",
      label: tri(lang, "Último", "Latest", "Último"),
      icon: Clock3,
      target: jumpTargets.latest,
    },
    {
      key: "finish",
      label: tri(lang, "Fim", "Finish", "Fin"),
      icon: FastForward,
      target: jumpTargets.finish,
    },
  ];

  return (
    <div className="journey-calendar" data-busy={busy || undefined}>
      <header>
        <button
          type="button"
          data-motion="none"
          onClick={() => shiftMonth(-1)}
          aria-label={tri(
            lang,
            "Mês anterior",
            "Previous month",
            "Mes anterior",
          )}
        >
          <ChevronLeft size={15} />
        </button>
        <strong>{monthTitle}</strong>
        <button
          type="button"
          data-motion="none"
          onClick={() => shiftMonth(1)}
          aria-label={tri(lang, "Próximo mês", "Next month", "Mes siguiente")}
        >
          <ChevronRight size={15} />
        </button>
      </header>
      <div
        ref={gridRef}
        className="journey-calendar-grid"
        aria-hidden="true"
        data-dragging={drag ? drag.mode : undefined}
        onPointerDown={(event) => {
          if (busy) return;
          const day = dayFromPoint(event.clientX, event.clientY);
          if (!day) return;
          event.preventDefault();
          gridRef.current?.setPointerCapture(event.pointerId);
          pendingRef.current = {
            day,
            mode: sessionFor(day) ? "remove" : "add",
          };
        }}
        onPointerMove={(event) => {
          if (!pendingRef.current && !drag) return;
          const day = dayFromPoint(event.clientX, event.clientY);
          if (day) extendTo(day);
        }}
        onPointerUp={finish}
        onPointerCancel={() => {
          pendingRef.current = null;
          setDrag(null);
        }}
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
          const session = sessionFor(key);
          const level = intensity(session);
          const time = session ? formatSessionTime(session.minutes) : null;
          const prevLogged =
            weekday > 0 &&
            index > 0 &&
            Boolean(sessionFor(dayKey(view.year, view.month, index)));
          const nextLogged =
            weekday < 6 &&
            index + 1 < daysInMonth &&
            Boolean(sessionFor(dayKey(view.year, view.month, index + 2)));
          const dragged = Boolean(dragDays?.has(key));
          const dragConnLeft =
            dragged && weekday > 0 && dragDays?.has(shiftDay(key, -1));
          const dragConnRight =
            dragged && weekday < 6 && dragDays?.has(shiftDay(key, 1));
          return (
            <span
              key={key}
              data-day={disabled ? undefined : key}
              data-disabled={disabled || undefined}
              data-logged={Boolean(session) || undefined}
              data-level={session ? level : undefined}
              data-conn-left={(session && prevLogged) || undefined}
              data-conn-right={(session && nextLogged) || undefined}
              data-adding={(dragged && drag?.mode === "add") || undefined}
              data-removing={(dragged && drag?.mode === "remove") || undefined}
              data-sel-left={dragConnLeft || undefined}
              data-sel-right={dragConnRight || undefined}
              data-today={key === maxDate || undefined}
            >
              {(session?.marksStart || session?.marksFinish) && (
                <i className="journey-day-marks">
                  {session.marksStart && (
                    <Play size={9} fill="currentColor" data-mark="start" />
                  )}
                  {session.marksFinish && (
                    <Flag size={9} fill="currentColor" data-mark="finish" />
                  )}
                </i>
              )}
              <b>{index + 1}</b>
              {time && <small>{time}</small>}
            </span>
          );
        })}
      </div>
      <div className="journey-calendar-jumps">
        <span>{tri(lang, "Ir para", "Jump to", "Ir a")}</span>
        {jumps.map(({ key, label, icon: Icon, target }) => (
          <button
            key={key}
            type="button"
            disabled={!target}
            onClick={() => target && setView(monthOf(target))}
          >
            <Icon size={12} /> {label}
          </button>
        ))}
      </div>
      <p className="journey-calendar-hint">
        {tri(
          lang,
          "Toque em um dia para editar a sessão. Arraste para adicionar vários dias — ou remover, começando por um dia jogado.",
          "Tap a day to edit its session. Drag to add several days — or remove, starting from a played day.",
          "Toca un día para editar su sesión. Arrastra para añadir varios días, o para quitarlos empezando por un día jugado.",
        )}
      </p>
      <div
        className="journey-drag-pill"
        data-visible={drag ? "" : undefined}
        data-mode={drag?.mode}
        aria-hidden="true"
      >
        {drag?.mode === "remove"
          ? pt
            ? `Removendo ${dragDays?.size ?? 0} ${(dragDays?.size ?? 0) === 1 ? "dia" : "dias"}`
            : `Removing ${dragDays?.size ?? 0} ${(dragDays?.size ?? 0) === 1 ? "day" : "days"}`
          : pt
            ? `Adicionando ${dragDays?.size ?? 0} ${(dragDays?.size ?? 0) === 1 ? "dia" : "dias"}`
            : `Adding ${dragDays?.size ?? 0} ${(dragDays?.size ?? 0) === 1 ? "day" : "days"}`}
      </div>
    </div>
  );
}
