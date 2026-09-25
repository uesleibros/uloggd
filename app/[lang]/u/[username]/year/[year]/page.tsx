import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  Camera,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Flag,
  Gamepad2,
  Gem,
  Heart,
  ListChecks,
  MessageSquare,
  Route,
  Sparkles,
  Star,
  UserPlus,
} from "lucide-react";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { ShareButton } from "@/components/share-button";
import { Tooltip } from "@/components/ui/tooltip";
import { getGamesByIds } from "@/lib/igdb";
import { resolveGameCover } from "@/lib/game-cover";
import { getPublicProfile } from "@/lib/profiles";
import { serverApi } from "@/lib/api-server";
import type { ProfileYear } from "@/lib/profile-types";
import { MIN_WRAPPED_YEAR, parseWrappedYear } from "@/lib/year-wrapped";
import { hasLocale, resolveLocale } from "../../../../dictionaries";
import "../../../../profile.css";
import { tri, uiText, type UiLang } from "@/lib/ui-text";
import { socialMetadata } from "@/lib/seo";

type Props = {
  params: Promise<{ lang: string; username: string; year: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang: rawLang, username, year } = await params;
  const lang = resolveLocale(rawLang);
  const pt = lang === "pt-BR";
  const title = pt
    ? `${year} em jogos de @${username}`
    : `@${username}'s ${year} in games`;
  const description = pt
    ? `Veja a retrospectiva de jogos de @${username} em ${year} no uloggd.`
    : `See @${username}'s ${year} year in games on uloggd.`;
  return {
    title,
    description,
    ...socialMetadata({
      lang,
      path: `/u/${username}/year/${year}`,
      title,
      description,
      image: null,
      largeImage: true,
    }),
  };
}

/** A count and its noun, so no card here has to spell a plural of its own. */
function plural(count: number, one: string, many: string, lang: UiLang) {
  return `${count.toLocaleString(lang)} ${count === 1 ? one : many}`;
}

/** The month a `YYYY-MM-DD` date or an ISO timestamp falls in, or -1. */
function monthOf(value: string | null | undefined) {
  if (!value || value.length < 7) return -1;
  const month = Number(value.slice(5, 7)) - 1;
  return month >= 0 && month < 12 ? month : -1;
}

export default async function YearWrappedPage({ params }: Props) {
  const { lang, username, year: rawYear } = await params;
  if (!hasLocale(lang)) notFound();
  const year = parseWrappedYear(rawYear);
  if (!year) notFound();
  const [response, result] = await Promise.all([
    getPublicProfile(username),
    serverApi.get<ProfileYear>(
      `/profiles/${encodeURIComponent(username)}/year/${year}`,
    ),
  ]);
  const profile = response?.data;
  if (!profile?.username) notFound();
  const { sessions, reviews, library, lists, screenshots, journeys, totals } =
    result.data;
  const pt = lang === "pt-BR";
  const t = uiText(lang);
  const name = profile.display_name || `@${profile.username}`;
  const currentYear = new Date().getUTCFullYear();

  const totalMinutes = sessions.reduce(
    (total, session) => total + (session.minutes ?? 0),
    0,
  );
  const hours = Math.floor(totalMinutes / 60);

  // Every game the year touched, from either side. Writing a session is one
  // way to record playing something and keeping a library is the other, and a
  // page that read only the first told somebody who uses the second that they
  // had done nothing all year.
  const playedIds = [
    ...new Set([
      ...sessions.map((session) => session.igdb_id),
      ...library.map((row) => row.igdb_id),
    ]),
  ];
  const finishedIds = new Set([
    ...sessions
      .filter((session) => session.marks_finish)
      .map((session) => session.igdb_id),
    ...library.filter((row) => row.completed_at).map((row) => row.igdb_id),
  ]);
  const startedIds = new Set(
    library.filter((row) => row.started_at).map((row) => row.igdb_id),
  );
  const addedCount = library.filter((row) => row.added).length;
  const likedCount = library.filter((row) => row.liked).length;

  // Both kinds of score, on the 0-100 scale every rating is stored in.
  const scores = [
    ...reviews
      .map((review) => review.rating)
      .filter((rating): rating is number => typeof rating === "number"),
    ...library
      .map((row) => row.quick_rating)
      .filter((rating): rating is number => typeof rating === "number"),
  ];
  const average = scores.length
    ? scores.reduce((sum, score) => sum + score, 0) / scores.length / 20
    : null;

  // One bar per month over everything that happened in it rather than over the
  // diary alone: a month spent finishing games and writing about them was
  // drawn as an empty one.
  const monthCounts = Array.from({ length: 12 }, () => 0);
  const bump = (month: number) => {
    if (month >= 0 && month < 12) monthCounts[month] += 1;
  };
  for (const session of sessions) bump(monthOf(session.played_on));
  for (const review of reviews) bump(monthOf(review.created_at));
  for (const row of library) bump(monthOf(row.completed_at));
  for (const shot of screenshots) bump(monthOf(shot.created_at));
  for (const list of lists) bump(monthOf(list.created_at));
  for (const journey of journeys) bump(monthOf(journey.created_at));

  const minutesByGame = new Map<number, number>();
  const sessionsByGame = new Map<number, number>();
  for (const session of sessions) {
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
  // Hours first, then sessions, then whatever was finished: a year kept in the
  // library alone has neither of the first two and still had a game in it.
  const topGameId =
    [...minutesByGame.entries()].sort(
      (a, b) =>
        b[1] - a[1] ||
        (sessionsByGame.get(b[0]) ?? 0) - (sessionsByGame.get(a[0]) ?? 0),
    )[0]?.[0] ??
    [...finishedIds][0] ??
    playedIds[0];

  const games = playedIds.length
    ? await getGamesByIds(playedIds.slice(0, 150))
    : [];
  const byId = new Map(games.map((game) => [game.id, game]));
  const genreCounts = new Map<string, number>();
  for (const game of games)
    for (const genre of game.genres)
      genreCounts.set(genre, (genreCounts.get(genre) ?? 0) + 1);
  const topGenres = [...genreCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 5);
  const maxGenreCount = topGenres[0]?.[1] ?? 0;
  const topGame = byId.get(topGameId) ?? null;

  // Newest completion first, so the shelf reads as the year running backwards
  // from wherever it ended.
  const finishedGames = library
    .filter((row) => row.completed_at && byId.has(row.igdb_id))
    .sort((a, b) => (b.completed_at ?? "").localeCompare(a.completed_at ?? ""))
    .map((row) => byId.get(row.igdb_id)!)
    .filter(
      (game, index, all) =>
        all.findIndex((one) => one.id === game.id) === index,
    )
    .slice(0, 12);

  const monthFormatter = new Intl.DateTimeFormat(lang, {
    month: "short",
    timeZone: "UTC",
  });
  const monthLabels = Array.from({ length: 12 }, (_, index) =>
    monthFormatter.format(new Date(Date.UTC(2024, index, 1))).replace(".", ""),
  );

  const social = totals ?? {
    followers: 0,
    following: 0,
    likes: 0,
    comments: 0,
    minerals: 0,
    screenshots: 0,
    lists: 0,
  };
  // Empty now means nothing at all happened, not merely that no session was
  // written down. Anything below this would have had something to say.
  const isEmpty =
    sessions.length === 0 &&
    reviews.length === 0 &&
    library.length === 0 &&
    lists.length === 0 &&
    screenshots.length === 0 &&
    journeys.length === 0 &&
    social.followers === 0 &&
    social.likes === 0 &&
    social.comments === 0 &&
    social.minerals === 0;

  // A card for a number nobody scored is a row of dashes, so each one is here
  // only if the year put something in it. The first two stay either way: they
  // are what the page is about.
  const stats: Array<{ icon: ReactNode; label: string; value: string } | null> =
    [
      {
        icon: <Gamepad2 size={13} />,
        label: tri(lang, "Jogos", "Games", "Juegos"),
        value: playedIds.length.toLocaleString(lang),
      },
      {
        icon: <Flag size={13} />,
        label: tri(lang, "Finalizados", "Finished", "Terminados"),
        value: finishedIds.size.toLocaleString(lang),
      },
      startedIds.size > 0
        ? {
            icon: <Sparkles size={13} />,
            label: tri(lang, "Começados", "Started", "Empezados"),
            value: startedIds.size.toLocaleString(lang),
          }
        : null,
      addedCount > 0
        ? {
            icon: <ListChecks size={13} />,
            label: tri(
              lang,
              "Na biblioteca",
              "Added to library",
              "En la biblioteca",
            ),
            value: addedCount.toLocaleString(lang),
          }
        : null,
      sessions.length > 0
        ? {
            icon: <CalendarDays size={13} />,
            label: t.sessions,
            value: sessions.length.toLocaleString(lang),
          }
        : null,
      reviews.length > 0
        ? {
            icon: <BookOpen size={13} />,
            label: t.reviews,
            value: reviews.length.toLocaleString(lang),
          }
        : null,
      scores.length > 0
        ? {
            icon: <Star size={13} />,
            label: tri(lang, "Nota média", "Average", "Nota media"),
            value: `${(average ?? 0).toLocaleString(lang, { maximumFractionDigits: 1 })}/5`,
          }
        : null,
      likedCount > 0
        ? {
            icon: <Heart size={13} />,
            label: tri(lang, "Favoritados", "Loved", "Favoritos"),
            value: likedCount.toLocaleString(lang),
          }
        : null,
      social.screenshots > 0
        ? {
            icon: <Camera size={13} />,
            label: tri(lang, "Capturas", "Screenshots", "Capturas"),
            value: social.screenshots.toLocaleString(lang),
          }
        : null,
      social.lists > 0
        ? {
            icon: <ListChecks size={13} />,
            label: tri(lang, "Listas", "Lists", "Listas"),
            value: social.lists.toLocaleString(lang),
          }
        : null,
      journeys.length > 0
        ? {
            icon: <Route size={13} />,
            label: tri(lang, "Jornadas", "Journeys", "Jornadas"),
            value: journeys.length.toLocaleString(lang),
          }
        : null,
      social.followers > 0
        ? {
            icon: <UserPlus size={13} />,
            label: tri(
              lang,
              "Novos seguidores",
              "New followers",
              "Nuevos seguidores",
            ),
            value: social.followers.toLocaleString(lang),
          }
        : null,
      social.likes > 0
        ? {
            icon: <Heart size={13} />,
            label: tri(lang, "Curtidas dadas", "Likes given", "Me gusta dados"),
            value: social.likes.toLocaleString(lang),
          }
        : null,
      social.comments > 0
        ? {
            icon: <MessageSquare size={13} />,
            label: tri(lang, "Comentários", "Comments", "Comentarios"),
            value: social.comments.toLocaleString(lang),
          }
        : null,
      social.minerals > 0
        ? {
            icon: <Gem size={13} />,
            label: tri(lang, "Minerais", "Minerals", "Minerales"),
            value: social.minerals.toLocaleString(lang),
          }
        : null,
      peakMonth >= 0
        ? {
            icon: <Clock3 size={13} />,
            label: tri(
              lang,
              "Mês mais ativo",
              "Busiest month",
              "Mes más activo",
            ),
            value: monthLabels[peakMonth],
          }
        : null,
    ];
  const shownStats = stats.filter((stat) => stat !== null);

  const shareText = tri(
    lang,
    `${plural(playedIds.length, "jogo", "jogos", lang)}, ${finishedIds.size} finalizados${totalMinutes > 0 ? ` e ${hours}h` : ""} em ${year} no uloggd.`,
    `${plural(playedIds.length, "game", "games", lang)}, ${finishedIds.size} finished${totalMinutes > 0 ? ` and ${hours}h` : ""} in ${year} on uloggd.`,
    `${plural(playedIds.length, "juego", "juegos", lang)}, ${finishedIds.size} terminados${totalMinutes > 0 ? ` y ${hours}h` : ""} en ${year} en uloggd.`,
  );
  const shareTitle = tri(
    lang,
    `${year} em jogos de ${name}`,
    `${name}'s ${year} in games`,
    `${year} en juegos de ${name}`,
  );

  return (
    <main className="social-page profile-subpage year-wrapped">
      <Link className="page-back-link" href={`/${lang}/u/${profile.username}`}>
        <ArrowLeft size={15} /> {t.backToProfile}
      </Link>
      <header className="profile-subpage-header">
        <h1>{shareTitle}</h1>
      </header>
      <div className="year-toolbar">
        {year > MIN_WRAPPED_YEAR ? (
          <Link
            className="year-step"
            href={`/${lang}/u/${profile.username}/year/${year - 1}`}
            aria-label={tri(
              lang,
              "Ano anterior",
              "Previous year",
              "Año anterior",
            )}
          >
            <ChevronLeft size={16} />
          </Link>
        ) : (
          <span className="year-step" aria-hidden data-disabled>
            <ChevronLeft size={16} />
          </span>
        )}
        <strong>{year}</strong>
        {year < currentYear ? (
          <Link
            className="year-step"
            href={`/${lang}/u/${profile.username}/year/${year + 1}`}
            aria-label={tri(lang, "Próximo ano", "Next year", "Año siguiente")}
          >
            <ChevronRight size={16} />
          </Link>
        ) : (
          <span className="year-step" aria-hidden data-disabled>
            <ChevronRight size={16} />
          </span>
        )}
        <ShareButton
          title={shareTitle}
          text={shareText}
          label={t.share}
          copiedLabel={t.linkCopied}
          lang={lang}
        />
      </div>
      {isEmpty ? (
        <div className="social-empty profile-subpage-empty">
          <span aria-hidden>
            <Sparkles size={22} />
          </span>
          <h2>
            {tri(
              lang,
              `Nada registrado em ${year}`,
              `Nothing logged in ${year}`,
              `Nada registrado en ${year}`,
            )}
          </h2>
          <p>
            {tri(
              lang,
              "Jogos, sessões, avaliações, listas e capturas visíveis para você aparecerão aqui.",
              "Games, sessions, reviews, lists and screenshots visible to you will appear here.",
              "Juegos, sesiones, reseñas, listas y capturas visibles para ti aparecerán aquí.",
            )}
          </p>
        </div>
      ) : (
        <>
          <section className="year-hero-card">
            <small>
              {totalMinutes > 0
                ? tri(
                    lang,
                    "TEMPO REGISTRADO",
                    "TIME LOGGED",
                    "TIEMPO REGISTRADO",
                  )
                : tri(
                    lang,
                    "JOGOS DO ANO",
                    "GAMES THIS YEAR",
                    "JUEGOS DEL AÑO",
                  )}
            </small>
            <strong>
              {totalMinutes > 0
                ? `${hours.toLocaleString(lang)}h${totalMinutes % 60 ? ` ${totalMinutes % 60}m` : ""}`
                : playedIds.length.toLocaleString(lang)}
            </strong>
            <p>
              {totalMinutes > 0
                ? tri(
                    lang,
                    `Em ${plural(playedIds.length, "jogo", "jogos", lang)} ao longo de ${year}.`,
                    `Across ${plural(playedIds.length, "game", "games", lang)} through ${year}.`,
                    `En ${plural(playedIds.length, "juego", "juegos", lang)} a lo largo de ${year}.`,
                  )
                : tri(
                    lang,
                    `${plural(finishedIds.size, "finalizado", "finalizados", lang)} ao longo de ${year}.`,
                    `${plural(finishedIds.size, "finished", "finished", lang)} through ${year}.`,
                    `${plural(finishedIds.size, "terminado", "terminados", lang)} a lo largo de ${year}.`,
                  )}
            </p>
          </section>
          <div className="year-stat-grid">
            {shownStats.map((stat) => (
              <div className="year-stat" key={stat.label}>
                <small>
                  {stat.icon} {stat.label}
                </small>
                <strong>{stat.value}</strong>
              </div>
            ))}
          </div>
          <section className="year-panel">
            <h2>
              {tri(
                lang,
                "Atividade por mês",
                "Activity by month",
                "Actividad por mes",
              )}
            </h2>
            <p>
              {tri(
                lang,
                "Sessões, avaliações, finalizações, listas, jornadas e capturas.",
                "Sessions, reviews, finishes, lists, journeys and screenshots.",
                "Sesiones, reseñas, finalizaciones, listas, jornadas y capturas.",
              )}
            </p>
            <div className="year-month-chart">
              {monthCounts.map((count, index) => (
                <div className="year-month-col" key={index}>
                  <Tooltip
                    label={`${monthLabels[index]}: ${plural(
                      count,
                      pt ? "registro" : "entry",
                      pt ? "registros" : "entries",
                      lang,
                    )}`}
                  >
                    <div className="year-month-slot">
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
                  </Tooltip>
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
          {finishedGames.length > 0 && (
            <section className="year-panel">
              <h2>
                {tri(
                  lang,
                  `Finalizados em ${year}`,
                  `Finished in ${year}`,
                  `Terminados en ${year}`,
                )}
              </h2>
              <p>
                {finishedIds.size > finishedGames.length
                  ? tri(
                      lang,
                      `Os ${finishedGames.length} mais recentes de ${finishedIds.size}.`,
                      `The ${finishedGames.length} most recent of ${finishedIds.size}.`,
                      `Los ${finishedGames.length} más recientes de ${finishedIds.size}.`,
                    )
                  : tri(
                      lang,
                      "Na ordem em que o ano os deixou para trás.",
                      "In the order the year left them behind.",
                      "En el orden en que el año los dejó atrás.",
                    )}
              </p>
              <div className="year-finished">
                {finishedGames.map((game) => (
                  <Link key={game.id} href={`/${lang}/game/${game.slug}`}>
                    <span>
                      <Image
                        src={resolveGameCover(game.coverUrl, null)}
                        alt=""
                        fill
                        sizes="96px"
                      />
                    </span>
                    <small>{game.name}</small>
                  </Link>
                ))}
              </div>
            </section>
          )}
          <div className="year-columns">
            {topGame && (
              <section className="year-panel">
                <h2>
                  {tri(
                    lang,
                    "Jogo do ano",
                    "Game of the year",
                    "Juego del año",
                  )}
                </h2>
                <p>
                  {(minutesByGame.get(topGame.id) ?? 0) > 0
                    ? tri(
                        lang,
                        "Onde suas horas foram parar.",
                        "Where your hours went.",
                        "Dónde se fueron tus horas.",
                      )
                    : tri(
                        lang,
                        "O que o ano guardou.",
                        "What the year kept.",
                        "Lo que el año guardó.",
                      )}
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
                        (sessionsByGame.get(topGame.id) ?? 0) > 0
                          ? plural(
                              sessionsByGame.get(topGame.id) ?? 0,
                              pt ? "sessão" : "session",
                              pt ? "sessões" : "sessions",
                              lang,
                            )
                          : null,
                        finishedIds.has(topGame.id)
                          ? tri(lang, "Finalizado", "Finished", "Terminado")
                          : null,
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
                <h2>
                  {tri(
                    lang,
                    "Gêneros do ano",
                    "Genres of the year",
                    "Géneros del año",
                  )}
                </h2>
                <p>
                  {tri(
                    lang,
                    "Contagem dos jogos do ano por gênero.",
                    "The year's games per genre.",
                    "Los juegos del año por género.",
                  )}
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
          {(lists.length > 0 || journeys.length > 0) && (
            <div className="year-columns">
              {lists.length > 0 && (
                <section className="year-panel">
                  <h2>
                    {tri(
                      lang,
                      "Listas criadas",
                      "Lists made",
                      "Listas creadas",
                    )}
                  </h2>
                  <p>
                    {tri(
                      lang,
                      "Coleções e tierlists que começaram neste ano.",
                      "Collections and tier lists that started this year.",
                      "Colecciones y tierlists que empezaron este año.",
                    )}
                  </p>
                  <ol className="year-made">
                    {lists.slice(0, 6).map((list) => (
                      <li key={list.public_id}>
                        <Link href={`/${lang}/lists/${list.public_id}`}>
                          <strong>{list.name}</strong>
                          <small>
                            {[
                              list.kind === "TIERLIST"
                                ? tri(lang, "Tierlist", "Tier list", "Tierlist")
                                : tri(
                                    lang,
                                    "Coleção",
                                    "Collection",
                                    "Colección",
                                  ),
                              plural(
                                list.items,
                                pt ? "jogo" : "game",
                                pt ? "jogos" : "games",
                                lang,
                              ),
                            ].join(" · ")}
                          </small>
                        </Link>
                      </li>
                    ))}
                  </ol>
                </section>
              )}
              {journeys.length > 0 && (
                <section className="year-panel">
                  <h2>
                    {tri(
                      lang,
                      "Jornadas abertas",
                      "Journeys started",
                      "Jornadas abiertas",
                    )}
                  </h2>
                  <p>
                    {tri(
                      lang,
                      "As partidas que ganharam um nome.",
                      "The playthroughs that got a name.",
                      "Las partidas que recibieron un nombre.",
                    )}
                  </p>
                  <ol className="year-made">
                    {journeys.slice(0, 6).map((journey) => (
                      <li key={journey.public_id}>
                        <Link href={`/${lang}/journal/${journey.public_id}`}>
                          <strong>{journey.title}</strong>
                          <small>
                            {byId.get(journey.igdb_id)?.name ??
                              tri(lang, "Jornada", "Journey", "Jornada")}
                          </small>
                        </Link>
                      </li>
                    ))}
                  </ol>
                </section>
              )}
            </div>
          )}
        </>
      )}
    </main>
  );
}
