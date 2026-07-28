import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  Map as MapIcon,
  Star,
} from "lucide-react";
import { tri, type UiLang } from "@/lib/ui-text";
import { ActivityStream, type SocialEntry } from "./activity-stream";

export function ReviewGameArchive({
  entries,
  lang,
  viewerId,
}: {
  entries: SocialEntry[];
  lang: UiLang;
  viewerId: string;
}) {
  const groups = new Map<number, SocialEntry[]>();
  for (const entry of entries) {
    const current = groups.get(entry.igdbId) ?? [];
    current.push(entry);
    groups.set(entry.igdbId, current);
  }

  return (
    <div className="reviews-game-archive">
      {[...groups.values()].map((gameEntries) => {
        const first = gameEntries[0];
        const reviewCount = gameEntries.filter(
          (entry) => entry.kind === "review",
        ).length;
        const sessionCount = gameEntries.filter(
          (entry) => entry.kind === "diary",
        ).length;
        const journeyCount = new Set(
          gameEntries.map((entry) => entry.journeyId).filter(Boolean),
        ).size;
        const latestRatedEntry = gameEntries.reduce<SocialEntry | null>(
          (latest, entry) => {
            if (
              entry.kind !== "review" ||
              entry.ratingMode === "recommend" ||
              typeof entry.rating !== "number"
            )
              return latest;
            return !latest || entry.createdAt > latest.createdAt
              ? entry
              : latest;
          },
          null,
        );
        const latestRating = latestRatedEntry?.rating;
        return (
          <section className="reviews-game-dossier" key={first.igdbId}>
            <header>
              <Link
                className="reviews-game-cover"
                href={`/${lang}/game/${first.gameSlug}`}
              >
                {first.game && (
                  <Image src={first.game.coverUrl} alt="" fill sizes="58px" />
                )}
              </Link>
              <div className="reviews-game-heading">
                <span>
                  {tri(
                    lang,
                    "ARQUIVO DO JOGO",
                    "GAME ARCHIVE",
                    "ARCHIVO DEL JUEGO",
                  )}
                </span>
                <h2>
                  <Link href={`/${lang}/game/${first.gameSlug}`}>
                    {first.game?.name ?? first.gameSlug}
                  </Link>
                </h2>
                <div>
                  {reviewCount > 0 && (
                    <span>
                      <BookOpen size={12} /> {reviewCount}{" "}
                      {tri(
                        lang,
                        reviewCount === 1 ? "avaliação" : "avaliações",
                        reviewCount === 1 ? "review" : "reviews",
                        reviewCount === 1 ? "reseña" : "reseñas",
                      )}
                    </span>
                  )}
                  {sessionCount > 0 && (
                    <span>
                      <CalendarDays size={12} /> {sessionCount}{" "}
                      {tri(
                        lang,
                        sessionCount === 1 ? "sessão" : "sessões",
                        sessionCount === 1 ? "session" : "sessions",
                        sessionCount === 1 ? "sesión" : "sesiones",
                      )}
                    </span>
                  )}
                  {journeyCount > 0 && (
                    <span>
                      <MapIcon size={12} /> {journeyCount}{" "}
                      {tri(
                        lang,
                        journeyCount === 1 ? "jornada" : "jornadas",
                        journeyCount === 1 ? "journey" : "journeys",
                        journeyCount === 1 ? "recorrido" : "recorridos",
                      )}
                    </span>
                  )}
                </div>
              </div>
              <div className="reviews-game-summary">
                {typeof latestRating === "number" && (
                  <strong>
                    <Star size={13} fill="currentColor" />
                    {(latestRating / 20).toLocaleString(lang, {
                      maximumFractionDigits: 1,
                    })}
                  </strong>
                )}
                <Link href={`/${lang}/game/${first.gameSlug}`}>
                  {tri(lang, "Abrir jogo", "Open game", "Abrir juego")}
                  <ArrowRight size={13} />
                </Link>
              </div>
            </header>
            <ActivityStream
              entries={gameEntries}
              lang={lang}
              viewerId={viewerId}
              display="archive"
            />
          </section>
        );
      })}
    </div>
  );
}
