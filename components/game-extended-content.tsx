import Image from "next/image";
import { CalendarDays, ExternalLink, Play } from "lucide-react";
import type { GameDetail } from "@/lib/igdb";
import { RelatedGamesTabs, type SavedState } from "./related-games-tabs";
import { tri, type UiLang } from "@/lib/ui-text";

export function GameExtendedContent({
  game,
  groups,
  saved,
  lang,
  enabled,
  sections = ["videos", "updates", "links"],
  showRelated = true,
}: {
  game: GameDetail;
  groups: GameDetail["related"];
  saved: Record<number, SavedState>;
  lang: UiLang;
  enabled: boolean;
  sections?: ("videos" | "updates" | "links")[];
  showRelated?: boolean;
}) {
  const eventDate = (timestamp: number | null) =>
    timestamp
      ? new Intl.DateTimeFormat(lang, {
          day: "numeric",
          month: "short",
          year: "numeric",
          timeZone: "UTC",
        }).format(new Date(timestamp * 1000))
      : null;

  return (
    <div className="game-primary-sections">
      {sections.includes("videos") && game.videos.length > 0 && (
        <section className="game-section">
          <header className="game-section-heading">
            <div>
              <span>VIDEO</span>
              <h2>{tri(lang, "Vídeos", "Videos", "Vídeos")}</h2>
            </div>
            <small>{game.videos.length}</small>
          </header>
          <div className="game-video-grid">
            {game.videos.map((video) => (
              <article key={video.id}>
                <div>
                  <iframe
                    src={`https://www.youtube-nocookie.com/embed/${video.id}`}
                    title={video.name}
                    loading="lazy"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
                <h3>
                  <Play size={12} fill="currentColor" />
                  {video.name}
                </h3>
              </article>
            ))}
          </div>
        </section>
      )}
      {sections.includes("updates") && game.events.length > 0 && (
        <section className="game-section">
          <header className="game-section-heading">
            <div>
              <h2>
                {tri(
                  lang,
                  "Notícias e eventos",
                  "News and events",
                  "Noticias y eventos",
                )}
              </h2>
            </div>
            <small>{game.events.length}</small>
          </header>
          <div className="game-event-list">
            {game.events.map((event) => {
              const href =
                event.liveStreamUrl ||
                `https://www.igdb.com/events/${event.slug}`;
              return (
                <a key={event.id} href={href} target="_blank" rel="noreferrer">
                  <div className="game-event-image">
                    {event.imageUrl ? (
                      <Image src={event.imageUrl} alt="" fill sizes="90px" />
                    ) : (
                      <CalendarDays size={18} />
                    )}
                  </div>
                  <div>
                    <span>{eventDate(event.startTimestamp)}</span>
                    <h3>{event.name}</h3>
                    {event.description && <p>{event.description}</p>}
                  </div>
                  {event.liveStreamUrl ? (
                    <Play size={15} />
                  ) : (
                    <ExternalLink size={14} />
                  )}
                </a>
              );
            })}
          </div>
        </section>
      )}
      {sections.includes("links") && game.websites.length > 0 && (
        <section className="game-section game-links-section">
          <header className="game-section-heading">
            <div>
              <span>WEB</span>
              <h2>Links</h2>
            </div>
          </header>
          <div>
            {game.websites.map((website) => {
              const host = new URL(website).hostname.replace(/^www\./, "");
              return (
                <a
                  key={website}
                  href={website}
                  target="_blank"
                  rel="noreferrer"
                >
                  {host}
                  <ExternalLink size={12} />
                </a>
              );
            })}
          </div>
        </section>
      )}
      {showRelated && (
        <RelatedGamesTabs
          groups={groups}
          saved={saved}
          lang={lang}
          enabled={enabled}
        />
      )}
    </div>
  );
}
