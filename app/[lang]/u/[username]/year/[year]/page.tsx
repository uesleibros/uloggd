import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Flag,
  Gamepad2,
  Sparkles,
  Star,
} from "lucide-react";
import { notFound } from "next/navigation";
import { ShareButton } from "@/components/share-button";
import { getGamesByIds } from "@/lib/igdb";
import { resolveGameCover } from "@/lib/game-cover";
import { createClient } from "@/lib/supabase/server";
import { hasLocale } from "../../../../dictionaries";
import "../../../../profile.css";

type Props = {
  params: Promise<{ lang: string; username: string; year: string }>;
};

const MIN_YEAR = 2000;

function parseYear(raw: string): number | null {
  if (!/^\d{4}$/.test(raw)) return null;
  const year = Number(raw);
  const current = new Date().getUTCFullYear();
  return year >= MIN_YEAR && year <= current ? year : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, username, year } = await params;
  return {
    title:
      lang === "pt-BR"
        ? `${year} em jogos de @${username}`
        : `@${username}'s ${year} in games`,
  };
}

export default async function YearWrappedPage({ params }: Props) {
  const { lang, username, year: rawYear } = await params;
  if (!hasLocale(lang)) notFound();
  const year = parseYear(rawYear);
  if (!year) notFound();
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("id,username,display_name")
    .ilike("username", username)
    .maybeSingle();
  if (!profile?.username) notFound();

  // RLS scopes both queries to what the viewer may see, so every aggregate
  // below respects session and review visibility.
  const [{ data: sessionRows }, { data: reviewRows }] = await Promise.all([
    supabase
      .from("diary_entries")
      .select("igdb_id,played_on,minutes,marks_finish")
      .eq("profile_id", profile.id)
      .gte("played_on", `${year}-01-01`)
      .lte("played_on", `${year}-12-31`),
    supabase
      .from("reviews")
      .select("rating,created_at")
      .eq("profile_id", profile.id)
      .gte("created_at", `${year}-01-01`)
      .lt("created_at", `${year + 1}-01-01`),
  ]);
  const sessions = sessionRows ?? [];
  const reviews = reviewRows ?? [];
  const pt = lang === "pt-BR";
  const name = profile.display_name || `@${profile.username}`;
  const currentYear = new Date().getUTCFullYear();

  const totalMinutes = sessions.reduce(
    (total, session) => total + (session.minutes ?? 0),
    0,
  );
  const hours = Math.floor(totalMinutes / 60);
  const playedIds = [...new Set(sessions.map((session) => session.igdb_id))];
  const finishedIds = new Set(
    sessions
      .filter((session) => session.marks_finish)
      .map((session) => session.igdb_id),
  );
  const ratings = reviews.filter(
    (review): review is { rating: number; created_at: string } =>
      typeof review.rating === "number",
  );
  const average = ratings.length
    ? ratings.reduce((sum, review) => sum + review.rating, 0) /
      ratings.length /
      20
    : null;

  const monthCounts = Array.from({ length: 12 }, () => 0);
  const minutesByGame = new Map<number, number>();
  const sessionsByGame = new Map<number, number>();
  for (const session of sessions) {
    const month = Number(session.played_on.slice(5, 7)) - 1;
    if (month >= 0 && month < 12) monthCounts[month] += 1;
    minutesByGame.set(
      session.igdb_id,
      (minutesByGame.get(session.igdb_id) ?? 0) + (session.minutes ?? 0),
    );
    sessionsByGame.set(
      session.igdb_id,
      (sessionsByGame.get(session.igdb_id) ?? 0) + 1,
    );
  }
  const peakCount = Math.max(...monthCounts, 0);
  const peakMonth = peakCount > 0 ? monthCounts.indexOf(peakCount) : -1;
  const topGameId =
    [...minutesByGame.entries()].sort(
      (a, b) =>
        b[1] - a[1] ||
        (sessionsByGame.get(b[0]) ?? 0) - (sessionsByGame.get(a[0]) ?? 0),
    )[0]?.[0] ?? playedIds[0];

  const games = playedIds.length
    ? await getGamesByIds(playedIds.slice(0, 150))
    : [];
  const genreCounts = new Map<string, number>();
  for (const game of games) {
    for (const genre of game.genres) {
      genreCounts.set(genre, (genreCounts.get(genre) ?? 0) + 1);
    }
  }
  const topGenres = [...genreCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 5);
  const maxGenreCount = topGenres[0]?.[1] ?? 0;
  const topGame = games.find((game) => game.id === topGameId) ?? null;

  const monthFormatter = new Intl.DateTimeFormat(lang, {
    month: "short",
    timeZone: "UTC",
  });
  const monthLabels = Array.from({ length: 12 }, (_, index) =>
    monthFormatter.format(new Date(Date.UTC(2024, index, 1))).replace(".", ""),
  );
  const isEmpty = sessions.length === 0 && reviews.length === 0;

  return (
    <main className="social-page profile-subpage year-wrapped">
      <Link
        className="profile-subpage-back"
        href={`/${lang}/u/${profile.username}`}
      >
        <ArrowLeft size={15} /> {pt ? "Voltar ao perfil" : "Back to profile"}
      </Link>
      <header className="profile-subpage-header">
        <span>
          <Sparkles size={14} /> {pt ? "RETROSPECTIVA" : "WRAPPED"}
        </span>
        <h1>
          {pt ? `${year} em jogos de ${name}` : `${name}'s ${year} in games`}
        </h1>
        <p>
          {pt
            ? "O ano contado pelas sessões e avaliações registradas."
            : "The year as told by logged sessions and reviews."}
        </p>
      </header>
      <div className="year-toolbar">
        <Link
          className="year-step"
          href={`/${lang}/u/${profile.username}/year/${year - 1}`}
          aria-disabled={year <= MIN_YEAR || undefined}
          aria-label={pt ? "Ano anterior" : "Previous year"}
        >
          <ChevronLeft size={16} />
        </Link>
        <strong>{year}</strong>
        {year < currentYear ? (
          <Link
            className="year-step"
            href={`/${lang}/u/${profile.username}/year/${year + 1}`}
            aria-label={pt ? "Próximo ano" : "Next year"}
          >
            <ChevronRight size={16} />
          </Link>
        ) : (
          <span className="year-step" aria-hidden data-disabled>
            <ChevronRight size={16} />
          </span>
        )}
        <ShareButton
          title={
            pt ? `${year} em jogos de ${name}` : `${name}'s ${year} in games`
          }
          text={
            pt
              ? `${sessions.length} sessões, ${playedIds.length} jogos e ${hours}h registradas no uloggd.`
              : `${sessions.length} sessions, ${playedIds.length} games, and ${hours}h logged on uloggd.`
          }
          label={pt ? "Compartilhar" : "Share"}
          copiedLabel={pt ? "Link copiado" : "Link copied"}
          lang={lang}
        />
      </div>
      {isEmpty ? (
        <div className="social-empty profile-subpage-empty">
          <span aria-hidden>
            <Sparkles size={22} />
          </span>
          <h2>
            {pt ? `Nada registrado em ${year}` : `Nothing logged in ${year}`}
          </h2>
          <p>
            {pt
              ? "Sessões e avaliações visíveis para você aparecerão aqui."
              : "Sessions and reviews visible to you will appear here."}
          </p>
        </div>
      ) : (
        <>
          <section className="year-hero-card">
            <small>
              {totalMinutes > 0
                ? pt
                  ? "TEMPO REGISTRADO"
                  : "TIME LOGGED"
                : pt
                  ? "SESSÕES REGISTRADAS"
                  : "SESSIONS LOGGED"}
            </small>
            <strong>
              {totalMinutes > 0
                ? `${hours.toLocaleString(lang)}h${totalMinutes % 60 ? ` ${totalMinutes % 60}m` : ""}`
                : sessions.length.toLocaleString(lang)}
            </strong>
            <p>
              {pt
                ? `Em ${playedIds.length} ${playedIds.length === 1 ? "jogo" : "jogos"} ao longo de ${year}.`
                : `Across ${playedIds.length} ${playedIds.length === 1 ? "game" : "games"} through ${year}.`}
            </p>
          </section>
          <div className="year-stat-grid">
            <div className="year-stat">
              <small>
                <Gamepad2 size={13} /> {pt ? "Jogos jogados" : "Games played"}
              </small>
              <strong>{playedIds.length.toLocaleString(lang)}</strong>
            </div>
            <div className="year-stat">
              <small>
                <Flag size={13} /> {pt ? "Finalizados" : "Finished"}
              </small>
              <strong>{finishedIds.size.toLocaleString(lang)}</strong>
            </div>
            <div className="year-stat">
              <small>
                <CalendarDays size={13} /> {pt ? "Sessões" : "Sessions"}
              </small>
              <strong>{sessions.length.toLocaleString(lang)}</strong>
            </div>
            <div className="year-stat">
              <small>
                <BookOpen size={13} /> {pt ? "Avaliações" : "Reviews"}
              </small>
              <strong>{reviews.length.toLocaleString(lang)}</strong>
            </div>
            <div className="year-stat">
              <small>
                <Star size={13} /> {pt ? "Nota média" : "Average"}
              </small>
              <strong>
                {average === null
                  ? "—"
                  : `${average.toLocaleString(lang, { maximumFractionDigits: 1 })}/5`}
              </strong>
            </div>
            <div className="year-stat">
              <small>
                <Clock3 size={13} /> {pt ? "Mês mais ativo" : "Busiest month"}
              </small>
              <strong>{peakMonth === -1 ? "—" : monthLabels[peakMonth]}</strong>
            </div>
          </div>
          <section className="year-panel">
            <h2>{pt ? "Sessões por mês" : "Sessions by month"}</h2>
            <p>
              {pt
                ? "Quando o ano realmente aconteceu."
                : "When the year actually happened."}
            </p>
            <div className="year-month-chart">
              {monthCounts.map((count, index) => (
                <div className="year-month-col" key={index}>
                  <div
                    className="year-month-slot"
                    data-tip={`${monthLabels[index]}: ${count} ${
                      pt
                        ? count === 1
                          ? "sessão"
                          : "sessões"
                        : count === 1
                          ? "session"
                          : "sessions"
                    }`}
                  >
                    {index === peakMonth && (
                      <b className="year-month-peak">{count}</b>
                    )}
                    <span
                      className="year-month-bar"
                      style={{
                        height:
                          peakCount > 0 && count > 0
                            ? `${Math.max(5, Math.round((count / peakCount) * 100))}%`
                            : "0%",
                      }}
                    />
                  </div>
                  <small>{monthLabels[index]}</small>
                </div>
              ))}
            </div>
            <p className="sr-only">
              {monthCounts
                .map((count, index) => `${monthLabels[index]}: ${count}`)
                .join(", ")}
            </p>
          </section>
          <div className="year-columns">
            {topGame && (
              <section className="year-panel">
                <h2>{pt ? "Jogo do ano" : "Game of the year"}</h2>
                <p>
                  {pt
                    ? "Onde suas horas foram parar."
                    : "Where your hours went."}
                </p>
                <Link
                  className="year-top-game"
                  href={`/${lang}/game/${topGame.slug}`}
                >
                  <span className="year-top-cover">
                    <Image
                      src={resolveGameCover(topGame.coverUrl, null)}
                      alt=""
                      fill
                      sizes="72px"
                    />
                  </span>
                  <span className="year-top-copy">
                    <strong>{topGame.name}</strong>
                    <small>
                      {[
                        (minutesByGame.get(topGame.id) ?? 0) >= 60
                          ? `${Math.floor((minutesByGame.get(topGame.id) ?? 0) / 60)}h`
                          : null,
                        `${sessionsByGame.get(topGame.id) ?? 0} ${
                          pt
                            ? (sessionsByGame.get(topGame.id) ?? 0) === 1
                              ? "sessão"
                              : "sessões"
                            : (sessionsByGame.get(topGame.id) ?? 0) === 1
                              ? "session"
                              : "sessions"
                        }`,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </small>
                  </span>
                </Link>
              </section>
            )}
            {topGenres.length > 0 && (
              <section className="year-panel">
                <h2>{pt ? "Gêneros do ano" : "Genres of the year"}</h2>
                <p>
                  {pt
                    ? "Contagem de jogos jogados por gênero."
                    : "Games played per genre."}
                </p>
                <ol className="year-genres">
                  {topGenres.map(([genre, count]) => (
                    <li key={genre}>
                      <span className="year-genre-name">{genre}</span>
                      <span className="year-genre-track">
                        <i
                          style={{
                            width: `${Math.max(6, Math.round((count / maxGenreCount) * 100))}%`,
                          }}
                        />
                      </span>
                      <b>{count.toLocaleString(lang)}</b>
                    </li>
                  ))}
                </ol>
              </section>
            )}
          </div>
        </>
      )}
    </main>
  );
}
