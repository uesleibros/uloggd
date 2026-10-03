import { getMediaUrl } from "@/lib/media-url";
import { Flag, ImageIcon, MapPin, Pencil } from "lucide-react";
import { playtimeClock } from "@/lib/playtime";
import Image from "next/image";
import Link from "next/link";
import type { SessionEvent } from "@/lib/content-types";
import { tri, uiText, type UiLang } from "@/lib/ui-text";

const MARKS = {
  NOTE: Pencil,
  PROGRESS: MapPin,
  SHOT: ImageIcon,
  STOP: Flag,
} as const;

/**
 * What the session was like, in the order it happened.
 *
 * Not a second copy of the note: the note is what somebody wrote afterwards,
 * and this is what they wrote while it was going. Append-only, so it reads as
 * a record rather than a draft, and the time on each line is the clock from
 * the start rather than a wall time nobody remembers.
 */
export function PlayTimeline({
  events,
  lang,
}: {
  events: SessionEvent[];
  lang: UiLang;
}) {
  const t = uiText(lang);
  if (!events.length) return null;
  // Counted from the first thing noted rather than from when the session
  // opened: `open_since` is cleared the moment it closes, and the first note
  // is the earliest instant the record still holds.
  const start = new Date(events[0].at).getTime();

  return (
    <section className="play-timeline">
      <header>
        <h2>
          {tri(
            lang,
            "Durante a sessão",
            "During the session",
            "Durante la sesión",
          )}
        </h2>
        <span>{events.length}</span>
      </header>
      <ol>
        {events.map((event) => {
          const Mark = MARKS[event.kind] ?? Pencil;
          const at = new Date(event.at).getTime();
          const minutes = Number.isFinite(start)
            ? Math.max(0, Math.floor((at - start) / 60000))
            : null;
          return (
            <li key={event.id} data-kind={event.kind}>
              <span className="play-timeline-mark" aria-hidden>
                <Mark size={12} />
              </span>
              {minutes !== null && (
                <time className="play-timeline-at">
                  {playtimeClock(minutes)}
                </time>
              )}
              <div className="play-timeline-said">
                {event.kind === "PROGRESS" ? (
                  <strong>{event.marker}</strong>
                ) : event.kind === "SHOT" ? (
                  event.screenshot_public_id ? (
                    <Link href={`/${lang}/shot/${event.screenshot_public_id}`}>
                      {event.image_url && (
                        <Image
                          src={getMediaUrl(event.image_url)}
                          alt=""
                          width={104}
                          height={58}
                          sizes="104px"
                        />
                      )}
                      <span>
                        {t.screenshot}
                      </span>
                    </Link>
                  ) : (
                    <span className="play-timeline-gone">
                      {tri(
                        lang,
                        "Uma captura que não está visível",
                        "A screenshot that is not visible",
                        "Una captura que no está visible",
                      )}
                    </span>
                  )
                ) : (
                  <p>{event.body}</p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
