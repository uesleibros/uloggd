import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  Clock3,
  Flag,
  Gamepad2,
  Monitor,
  Route,
  Star,
} from "lucide-react";
import { notFound } from "next/navigation";
import { ShareButton } from "@/components/share-button";
import { Tooltip } from "@/components/ui/tooltip";
import { getGamesByIds } from "@/lib/igdb";
import { resolveGameCover } from "@/lib/game-cover";
import { getPublicProfile } from "@/lib/profiles";
import { serverApi, settleServer } from "@/lib/api-server";
import { hasLocale, resolveLocale } from "../../../dictionaries";
import "../../../profile.css";
import { tri, uiText, type UiLang } from "@/lib/ui-text";
import { socialMetadata } from "@/lib/seo";

type Props = { params: Promise<{ lang: string; username: string }> };

type Stats = {
  totals: {
    sessions: number;
    minutes: number;
    days: number;
    games: number;
    finished: number;
    first_played: string | null;
    last_played: string | null;
    longest_session: number;
    journeys: number;
    journeys_completed: number;
    reviews: number;
    screenshots: number;
    library: number;
    rated: number;
    rating_average: number | null;
    copies: number;
  };
  years: {
    year: number;
    sessions: number;
    minutes: number;
    games: number;
    finished: number;
  }[];
  weekdays: { weekday: number; sessions: number; minutes: number }[];
  games: {
    igdb_id: number;
    game_slug: string;
    minutes: number;
    sessions: number;
    last_played: string | null;
  }[];
  platforms: { platform: string; runs: number; minutes: number }[];
  ratings: { bucket: number; games: number }[];
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang: rawLang, username } = await params;
  const lang = resolveLocale(rawLang);
  const pt = lang === "pt-BR";
  const title = pt ? `Os números de @${username}` : `@${username}'s numbers`;
  const description = pt
    ? `Tudo que @${username} já jogou no uloggd, somado.`
    : `Everything @${username} has played on uloggd, added up.`;
  return {
    title,
    description,
    ...socialMetadata({
      lang,
      path: `/u/${username}/stats`,
      title,
      description,
      image: null,
      largeImage: true,
    }),
  };
}

function hours(minutes: number, lang: UiLang) {
  if (minutes < 60) return `${minutes} min`;
  const whole = Math.floor(minutes / 60);
  return `${whole.toLocaleString(lang)}h`;
}

export default async function ProfileStatsPage({ params }: Props) {
  const { lang: rawLang, username } = await params;
  if (!hasLocale(rawLang)) notFound();
  const lang = resolveLocale(rawLang);
  const pt = lang === "pt-BR";
  const t = uiText(lang);

  const response = await getPublicProfile(username);
  const profile = response?.data;
  if (!profile?.username) notFound();

  const { data: answer } = await settleServer(
    serverApi.get<{ data: Stats }>(
      `/profiles/${encodeURIComponent(profile.username)}/stats`,
    ),
  );
  const stats = answer?.data ?? null;
  const totals = stats?.totals ?? null;

  const played = totals?.sessions ?? 0;
  const topGames = stats?.games ?? [];
  const catalog = topGames.length
    ? await getGamesByIds(topGames.map((row) => row.igdb_id))
    : [];
  const byId = new Map(catalog.map((game) => [game.id, game]));

  const years = stats?.years ?? [];
  const peakYear = years.reduce((top, row) => Math.max(top, row.minutes), 0);
  const weekdayNames = pt
    ? ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]
    : lang === "es"
      ? ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]
      : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const weekdays = weekdayNames.map((name, index) => ({
    name,
    minutes: stats?.weekdays.find((row) => row.weekday === index)?.minutes ?? 0,
    sessions:
      stats?.weekdays.find((row) => row.weekday === index)?.sessions ?? 0,
  }));
  const peakWeekday = weekdays.reduce(
    (top, row) => Math.max(top, row.minutes),
    0,
  );
  const peakPlatform = (stats?.platforms ?? []).reduce(
    (top, row) => Math.max(top, row.minutes || row.runs),
    0,
  );
  const peakRating = (stats?.ratings ?? []).reduce(
    (top, row) => Math.max(top, row.games),
    0,
  );

  const cards = totals
    ? [
        {
          icon: <Clock3 size={13} />,
          label: tri(lang, "Tempo somado", "Time played", "Tiempo sumado"),
          value: hours(totals.minutes, lang),
        },
        {
          icon: <CalendarDays size={13} />,
          label: tri(lang, "Sessões", "Sessions", "Sesiones"),
          value: totals.sessions.toLocaleString(lang),
        },
        {
          icon: <CalendarDays size={13} />,
          label: tri(lang, "Dias jogados", "Days played", "Días jugados"),
          value: totals.days.toLocaleString(lang),
        },
        {
          icon: <Gamepad2 size={13} />,
          label: tri(lang, "Jogos", "Games", "Juegos"),
          value: totals.games.toLocaleString(lang),
        },
        {
          icon: <Flag size={13} />,
          label: tri(lang, "Finalizações", "Finishes", "Finalizaciones"),
          value: totals.finished.toLocaleString(lang),
        },
        {
          icon: <Route size={13} />,
          label: tri(lang, "Jornadas", "Runs", "Recorridos"),
          value: totals.journeys.toLocaleString(lang),
        },
        {
          icon: <Star size={13} />,
          label: tri(lang, "Nota média", "Average rating", "Nota media"),
          value: totals.rating_average
            ? `${(totals.rating_average / 10).toLocaleString(lang, {
                maximumFractionDigits: 1,
              })}/10`
            : "-",
        },
        {
          icon: <Clock3 size={13} />,
          label: tri(
            lang,
            "Maior sessão",
            "Longest session",
            "Sesión más larga",
          ),
          value: totals.longest_session
            ? hours(totals.longest_session, lang)
            : "-",
        },
      ]
    : [];

  return (
    <main className="social-page profile-subpage year-wrapped">
      <Link className="page-back-link" href={`/${lang}/u/${profile.username}`}>
        <ArrowLeft size={14} /> @{profile.username}
      </Link>
      <header className="profile-subpage-header">
        <h1>{tri(lang, "Os números", "The numbers", "Los números")}</h1>
        <p>
          {tri(
            lang,
            "Tudo que já passou por aqui, somado. Só o que você pode ver entra na conta.",
            "Everything that has been through here, added up. Only what you can see is counted.",
            "Todo lo que pasó por aquí, sumado. Solo lo que puedes ver entra en la cuenta.",
          )}
        </p>
      </header>

      {!played && !totals?.library ? (
        <div className="social-empty profile-subpage-empty">
          <p>
            {tri(
              lang,
              "Ainda não há nada somado por aqui.",
              "There is nothing added up here yet.",
              "Todavía no hay nada sumado por aquí.",
            )}
          </p>
        </div>
      ) : (
        <>
          <section className="year-hero-card">
            <h2>
              {totals?.first_played
                ? tri(
                    lang,
                    `Desde ${new Date(`${totals.first_played}T00:00:00Z`).getUTCFullYear()}`,
                    `Since ${new Date(`${totals.first_played}T00:00:00Z`).getUTCFullYear()}`,
                    `Desde ${new Date(`${totals.first_played}T00:00:00Z`).getUTCFullYear()}`,
                  )
                : tri(lang, "Por enquanto", "So far", "Por ahora")}
            </h2>
            <p>
              {tri(
                lang,
                `${totals?.library.toLocaleString(lang)} jogos na biblioteca, ${totals?.rated.toLocaleString(lang)} com nota, ${totals?.reviews.toLocaleString(lang)} avaliações escritas.`,
                `${totals?.library.toLocaleString(lang)} games in the library, ${totals?.rated.toLocaleString(lang)} rated, ${totals?.reviews.toLocaleString(lang)} reviews written.`,
                `${totals?.library.toLocaleString(lang)} juegos en la biblioteca, ${totals?.rated.toLocaleString(lang)} con nota, ${totals?.reviews.toLocaleString(lang)} reseñas escritas.`,
              )}
            </p>
            <ShareButton
              className="content-share-action"
              title={`@${profile.username} · uloggd`}
              text={tri(
                lang,
                `Os números de @${profile.username} no uloggd`,
                `@${profile.username}'s numbers on uloggd`,
                `Los números de @${profile.username} en uloggd`,
              )}
              label={t.share}
              copiedLabel={t.linkCopied}
              lang={lang}
            />
          </section>

          <div className="year-stat-grid">
            {cards.map((card) => (
              <div className="year-stat" key={card.label}>
                <small>
                  {card.icon} {card.label}
                </small>
                <strong>{card.value}</strong>
              </div>
            ))}
          </div>

          {years.length > 0 && (
            <section className="year-panel">
              <h2>{tri(lang, "Ano a ano", "Year by year", "Año a año")}</h2>
              <p>
                {tri(
                  lang,
                  "Tempo jogado em cada ano registrado.",
                  "Time played in each year on record.",
                  "Tiempo jugado en cada año registrado.",
                )}
              </p>
              <div className="year-month-chart" data-span>
                {years.map((row) => (
                  <div className="year-month-col" key={row.year}>
                    <Tooltip
                      label={`${row.year}: ${hours(row.minutes, lang)} · ${row.sessions.toLocaleString(lang)} ${pt ? "sessões" : "sessions"}`}
                    >
                      <div className="year-month-slot">
                        <span
                          className="year-month-bar"
                          style={{
                            height:
                              peakYear > 0 && row.minutes > 0
                                ? `${Math.max(5, Math.round((row.minutes / peakYear) * 100))}%`
                                : "0%",
                          }}
                        />
                      </div>
                    </Tooltip>
                    <small>{String(row.year).slice(2)}</small>
                  </div>
                ))}
              </div>
              <p className="sr-only">
                {years
                  .map((row) => `${row.year}: ${hours(row.minutes, lang)}`)
                  .join(", ")}
              </p>
            </section>
          )}

          {peakWeekday > 0 && (
            <section className="year-panel">
              <h2>
                {tri(
                  lang,
                  "Os dias da semana",
                  "The days of the week",
                  "Los días de la semana",
                )}
              </h2>
              <p>
                {tri(
                  lang,
                  "Quando o tempo de jogo acontece.",
                  "When the playing happens.",
                  "Cuándo ocurre el tiempo de juego.",
                )}
              </p>
              <div className="year-month-chart" data-span>
                {weekdays.map((day) => (
                  <div className="year-month-col" key={day.name}>
                    <Tooltip
                      label={`${day.name}: ${hours(day.minutes, lang)} · ${day.sessions.toLocaleString(lang)} ${pt ? "sessões" : "sessions"}`}
                    >
                      <div className="year-month-slot">
                        <span
                          className="year-month-bar"
                          style={{
                            height: day.minutes
                              ? `${Math.max(5, Math.round((day.minutes / peakWeekday) * 100))}%`
                              : "0%",
                          }}
                        />
                      </div>
                    </Tooltip>
                    <small>{day.name}</small>
                  </div>
                ))}
              </div>
            </section>
          )}

          <div className="year-columns">
            {topGames.length > 0 && (
              <section className="year-panel">
                <h2>
                  {tri(
                    lang,
                    "Onde o tempo foi",
                    "Where the time went",
                    "Dónde fue el tiempo",
                  )}
                </h2>
                <p>
                  {tri(
                    lang,
                    "Os jogos com mais tempo registrado.",
                    "The games with the most time on record.",
                    "Los juegos con más tiempo registrado.",
                  )}
                </p>
                {topGames.slice(0, 6).map((row) => {
                  const game = byId.get(row.igdb_id);
                  return (
                    <Link
                      className="year-top-game"
                      key={row.igdb_id}
                      href={`/${lang}/game/${game?.slug ?? row.game_slug}`}
                    >
                      <span className="year-top-cover">
                        {game?.coverUrl && (
                          <Image
                            src={resolveGameCover(game.coverUrl, null)}
                            alt=""
                            fill
                            sizes="72px"
                          />
                        )}
                      </span>
                      <span className="year-top-copy">
                        <strong>{game?.name ?? row.game_slug}</strong>
                        <small>
                          {[
                            hours(row.minutes, lang),
                            `${row.sessions.toLocaleString(lang)} ${
                              row.sessions === 1
                                ? tri(lang, "sessão", "session", "sesión")
                                : tri(lang, "sessões", "sessions", "sesiones")
                            }`,
                          ].join(" · ")}
                        </small>
                      </span>
                    </Link>
                  );
                })}
              </section>
            )}

            {(stats?.platforms.length ?? 0) > 0 && (
              <section className="year-panel">
                <h2>
                  <Monitor size={14} aria-hidden />{" "}
                  {tri(lang, "Onde jogou", "Played on", "Dónde jugó")}
                </h2>
                <p>
                  {tri(
                    lang,
                    "Das cópias que as jornadas apontam.",
                    "From the copies the runs point at.",
                    "De las copias que apuntan los recorridos.",
                  )}
                </p>
                <ol className="year-genres">
                  {stats?.platforms.map((row) => (
                    <li key={row.platform}>
                      <span className="year-genre-name">{row.platform}</span>
                      <span className="year-genre-track">
                        <i
                          style={{
                            width: `${Math.max(6, Math.round(((row.minutes || row.runs) / peakPlatform) * 100))}%`,
                          }}
                        />
                      </span>
                      <b>
                        {row.minutes
                          ? hours(row.minutes, lang)
                          : row.runs.toLocaleString(lang)}
                      </b>
                    </li>
                  ))}
                </ol>
              </section>
            )}
          </div>

          {peakRating > 0 && (
            <section className="year-panel">
              <h2>
                {tri(
                  lang,
                  "Como as notas caem",
                  "How the ratings fall",
                  "Cómo caen las notas",
                )}
              </h2>
              <p>
                {tri(
                  lang,
                  "Duas pessoas com a mesma média não avaliam igual.",
                  "Two people with the same average do not rate alike.",
                  "Dos personas con la misma media no puntúan igual.",
                )}
              </p>
              <div className="year-month-chart" data-span>
                {Array.from({ length: 10 }, (_, index) => {
                  const bucket = index + 1;
                  const row = stats?.ratings.find(
                    (one) => one.bucket === bucket,
                  );
                  const games = row?.games ?? 0;
                  return (
                    <div className="year-month-col" key={bucket}>
                      <Tooltip
                        label={`${bucket}/10: ${games.toLocaleString(lang)} ${
                          games === 1
                            ? tri(lang, "jogo", "game", "juego")
                            : tri(lang, "jogos", "games", "juegos")
                        }`}
                      >
                        <div className="year-month-slot">
                          <span
                            className="year-month-bar"
                            style={{
                              height: games
                                ? `${Math.max(5, Math.round((games / peakRating) * 100))}%`
                                : "0%",
                            }}
                          />
                        </div>
                      </Tooltip>
                      <small>{bucket}</small>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}
    </main>
  );
}
