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
  Repeat,
  Route,
  Star,
  Tags,
  Trophy,
} from "lucide-react";
import { notFound } from "next/navigation";
import { ShareButton } from "@/components/share-button";
import { Tooltip } from "@/components/ui/tooltip";
import { getGamesByIds } from "@/lib/igdb";
import { readTaste, tasteIsWorthDrawing } from "@/lib/stats-taste";
import { resolveGameCover } from "@/lib/game-cover";
import { getPublicProfile } from "@/lib/profiles";
import { serverApi, settleServer } from "@/lib/api-server";
import { hasLocale, resolveLocale } from "../../../dictionaries";
import "../../../profile.css";
import {
  mediumLabel,
  ownershipLabel,
  storefrontLabel,
} from "@/lib/library-copies";
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
  copies: {
    medium: { value: string; copies: number }[];
    ownership: { value: string; copies: number }[];
    storefront: { value: string; copies: number }[];
  };
  runs: {
    total: number;
    completed: number;
    dropped: number;
    on_hold: number;
    playing: number;
    replays: number;
    mastered: number;
  };
  /** The ids, for the three answers only the catalogue holds. */
  taste: { igdb_id: number; minutes: number; in_library: boolean }[];
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
  const tasteRows = stats?.taste ?? [];
  // One read of the catalogue for both answers. The twelve games the page
  // draws are almost all inside the set the genres are counted from, and
  // asking twice would be a second request to IGDB for rows the first one
  // already carried.
  const wanted = [
    ...new Set([
      ...topGames.map((row) => row.igdb_id),
      ...tasteRows.map((row) => row.igdb_id),
    ]),
  ];
  const catalog = wanted.length ? await getGamesByIds(wanted) : [];
  const byId = new Map(catalog.map((game) => [game.id, game]));
  // Genres, studios and publishers: three questions the database cannot
  // answer, because a row here knows a game's id and nothing about the game.
  // A game belongs to several genres at once, so these counts add up to more
  // than the shelf, and the panel says what they are out of rather than
  // drawing a pie of overlapping slices.
  const taste = readTaste(tasteRows, catalog, 6);
  const tastePanels = tasteIsWorthDrawing(taste)
    ? [
        {
          key: "genres",
          title: tri(lang, "Gêneros", "Genres", "Géneros"),
          rows: taste.genres,
        },
        {
          key: "developers",
          title: tri(lang, "Estúdios", "Studios", "Estudios"),
          rows: taste.developers,
        },
        {
          key: "publishers",
          title: tri(lang, "Publicadoras", "Publishers", "Editoras"),
          rows: taste.publishers,
        },
      ].filter((panel) => panel.rows.length > 0)
    : [];
  const tastePeak = Math.max(
    1,
    ...tastePanels.flatMap((panel) => panel.rows.map((row) => row.games)),
  );

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

  // The copies, three ways, and only counted when there are enough of them
  // to mean something: one copy is not a shelf.
  const copyRows = stats?.copies ?? {
    medium: [],
    ownership: [],
    storefront: [],
  };
  // How many copies there are, not how many boxes they tick. Adding the
  // three groups up counted one copy three times over, so a single "PS5,
  // digital, owned" opened a panel about a shelf of one.
  const copyTotal = totals?.copies ?? 0;
  const shelves = (
    [
      [
        tri(
          lang,
          "Físico e digital",
          "Physical and digital",
          "Físico y digital",
        ),
        tri(
          lang,
          "Como as cópias registradas chegaram até você.",
          "How the recorded copies reached you.",
          "Cómo llegaron hasta ti las copias registradas.",
        ),
        copyRows.medium.map((row) => ({
          label: mediumLabel(row.value, lang),
          copies: row.copies,
        })),
      ],
      [
        tri(lang, "Posse", "Ownership", "Posesión"),
        tri(
          lang,
          "Comprado, assinatura, emprestado.",
          "Owned, subscription, borrowed.",
          "Comprado, suscripción, prestado.",
        ),
        copyRows.ownership.map((row) => ({
          label: ownershipLabel(row.value, lang),
          copies: row.copies,
        })),
      ],
      [
        tri(lang, "Lojas", "Storefronts", "Tiendas"),
        tri(
          lang,
          "Onde as cópias digitais moram.",
          "Where the digital copies live.",
          "Dónde viven las copias digitales.",
        ),
        copyRows.storefront.map((row) => ({
          label: storefrontLabel(row.value, lang),
          copies: row.copies,
        })),
      ],
    ] as const
  )
    .filter(([, , rows]) => rows.length > 0)
    .map(([title, blurb, rows]) => ({
      title,
      blurb,
      rows,
      peak: rows.reduce((top, row) => Math.max(top, row.copies), 1),
    }));

  const runTotals = stats?.runs;
  const runCards = runTotals
    ? [
        {
          icon: <Route size={13} />,
          label: tri(lang, "Concluídas", "Finished", "Completados"),
          value: runTotals.completed.toLocaleString(lang),
        },
        {
          icon: <Route size={13} />,
          label: tri(lang, "Em andamento", "In progress", "En curso"),
          value: runTotals.playing.toLocaleString(lang),
        },
        {
          icon: <Route size={13} />,
          label: tri(lang, "Pausadas", "Shelved", "Pausados"),
          value: runTotals.on_hold.toLocaleString(lang),
        },
        {
          icon: <Route size={13} />,
          label: tri(lang, "Abandonadas", "Dropped", "Abandonados"),
          value: runTotals.dropped.toLocaleString(lang),
        },
        {
          icon: <Repeat size={13} />,
          label: tri(lang, "Rejogadas", "Replays", "Repeticiones"),
          value: runTotals.replays.toLocaleString(lang),
        },
        {
          icon: <Trophy size={13} />,
          label: tri(lang, "Platinadas", "Mastered", "Platinados"),
          value: runTotals.mastered.toLocaleString(lang),
        },
      ].filter((card) => card.value !== "0")
    : [];

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

          {/* The copies, and only when they are worth a panel. One copy is
              not a shelf, and a pie chart of one slice says nothing anybody
              did not already know. */}
          {copyTotal >= 3 && (
            <div className="year-columns">
              {shelves.map((shelf) => (
                <section className="year-panel" key={shelf.title}>
                  <h2>{shelf.title}</h2>
                  <p>{shelf.blurb}</p>
                  <ol className="year-genres">
                    {shelf.rows.map((row) => (
                      <li key={row.label}>
                        <span className="year-genre-name">{row.label}</span>
                        <span className="year-genre-track">
                          <i
                            style={{
                              width: `${Math.max(6, Math.round((row.copies / shelf.peak) * 100))}%`,
                            }}
                          />
                        </span>
                        <b>{row.copies.toLocaleString(lang)}</b>
                      </li>
                    ))}
                  </ol>
                </section>
              ))}
            </div>
          )}

          {/* What the shelf is made of. Counted by game rather than by hour,
              because "a third of my games are RPGs" and "a third of my hours
              are RPGs" are different sentences and only one of them survives
              a single four-hundred-hour save file. The hours are there beside
              each row, so the other sentence is still readable. */}
          {tastePanels.length > 0 && (
            <div className="year-columns">
              {tastePanels.map((panel) => (
                <section className="year-panel" key={panel.key}>
                  <h2>
                    <Tags size={14} aria-hidden /> {panel.title}
                  </h2>
                  <p>
                    {tri(
                      lang,
                      `De ${taste.games.toLocaleString(lang)} jogos da biblioteca e do diário. Um jogo pode estar em mais de um, então as contas passam do total.`,
                      `Of ${taste.games.toLocaleString(lang)} games from the library and the diary. One game can be in more than one, so these add up to more than the total.`,
                      `De ${taste.games.toLocaleString(lang)} juegos de la biblioteca y del diario. Un juego puede estar en más de uno, así que las cuentas pasan del total.`,
                    )}
                  </p>
                  <ol className="year-genres">
                    {panel.rows.map((row) => (
                      <li key={row.name}>
                        <span className="year-genre-name">{row.name}</span>
                        <span className="year-genre-track">
                          <i
                            style={{
                              width: `${Math.max(6, Math.round((row.games / tastePeak) * 100))}%`,
                            }}
                          />
                        </span>
                        <b>
                          {row.games.toLocaleString(lang)}
                          {row.minutes > 0 && (
                            <small>{hours(row.minutes, lang)}</small>
                          )}
                        </b>
                      </li>
                    ))}
                  </ol>
                </section>
              ))}
            </div>
          )}

          {/* And the runs, which are passes through games rather than games.
              Only once there are a few: two runs is not a pattern. */}
          {(stats?.runs.total ?? 0) >= 3 && (
            <section className="year-panel">
              <h2>{tri(lang, "As jornadas", "The runs", "Los recorridos")}</h2>
              <p>
                {tri(
                  lang,
                  "Cada jornada é uma passagem por um jogo, não um jogo.",
                  "A run is one pass through a game, not a game.",
                  "Cada recorrido es un paso por un juego, no un juego.",
                )}
              </p>
              <div className="year-stat-grid">
                {runCards.map((card) => (
                  <div className="year-stat" key={card.label}>
                    <small>
                      {card.icon} {card.label}
                    </small>
                    <strong>{card.value}</strong>
                  </div>
                ))}
              </div>
            </section>
          )}

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
