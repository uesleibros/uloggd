import { getLibraryCards } from "@/lib/library-state";
import { getCommunityGameRatings } from "@/lib/community-ratings";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import {
  Building2,
  CalendarDays,
  ExternalLink,
  Gamepad2,
  Globe2,
  Layers3,
  Library,
  MonitorPlay,
  Star,
  TrendingUp,
} from "lucide-react";
import { QuickGameCard } from "@/components/library/quick-game-card";
import { RelativeTime } from "@/components/relative-time";
import { countryFromIgdb, flagEmoji } from "@/lib/countries";
import { withEmoji } from "@/lib/emoji";
import {
  getCompanyBySlug,
  getCompanyEvents,
  getCompanyCatalogue,
  getCompanyTrailers,
  getCompanyUpcoming,
  type CompanyProfile,
  type Game,
} from "@/lib/igdb";
import { jsonLd, socialMetadata, SITE_URL } from "@/lib/seo";
import { getAuthUser } from "@/lib/supabase/auth";
import { tri, type UiLang } from "@/lib/ui-text";
import { hasLocale } from "../../dictionaries";
import "../publisher.css";
import { Tooltip } from "@/components/ui/tooltip";

type Props = PageProps<"/[lang]/company/[slug]">;

function websiteLabel(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, slug } = await params;
  if (!hasLocale(lang)) return {};
  const company = await getCompanyBySlug(slug);
  if (!company) return {};
  const description =
    company.description.slice(0, 160) ||
    tri(
      lang,
      `Jogos publicados e desenvolvidos por ${company.name}.`,
      `Games published and developed by ${company.name}.`,
      `Juegos publicados y desarrollados por ${company.name}.`,
    );
  return {
    title: company.name,
    description,
    ...socialMetadata({
      lang,
      path: `/company/${company.slug}`,
      title: company.name,
      description,
      type: "profile",
      image: company.logoUrl || undefined,
    }),
  };
}

/**
 * "1 lançamentos" was on the page in three places at once.
 *
 * Every card that counted releases spelled the plural into its own template,
 * and a company with one game in its busiest year read as badly as one with a
 * thousand. Same for the years a company has been going.
 */
function releases(count: number, lang: UiLang) {
  return tri(
    lang,
    `${count} ${count === 1 ? "lançamento" : "lançamentos"}`,
    `${count} ${count === 1 ? "release" : "releases"}`,
    `${count} ${count === 1 ? "lanzamiento" : "lanzamientos"}`,
  );
}

function yearSpan(count: number, lang: UiLang) {
  return tri(
    lang,
    `${count} ${count === 1 ? "ano" : "anos"}`,
    `${count} ${count === 1 ? "year" : "years"}`,
    `${count} ${count === 1 ? "año" : "años"}`,
  );
}

function yearLabel(year: number, count: number, lang: UiLang) {
  return `${year}: ${releases(count, lang)}`;
}

/**
 * A large company needs several IGDB pages to count every dated release, so the
 * chart streams in after the shell instead of delaying the whole page.
 */
/**
 * The catalogue's rhythm: how many releases a year, for how long, and what
 * they were made of.
 *
 * It used to be a strip of bars with one sentence over it, which said the
 * company existed and nothing else. The same sweep that counts the years also
 * carries every release's genres and platforms, so the numbers a reader would
 * work out for themselves are stated: how long they have been at it, the year
 * they shipped most, the decade they were busiest, and what they mostly make.
 */
async function CatalogueRhythm({
  companyId,
  lang,
}: {
  companyId: number;
  lang: UiLang;
}) {
  const { timeline, counted } = await getCompanyCatalogue(companyId);
  if (timeline.length < 2) return null;
  const first = timeline[0].year;
  const last = timeline[timeline.length - 1].year;
  const counts = new Map(timeline.map((entry) => [entry.year, entry.count]));
  const peak = Math.max(...counts.values());
  const total = timeline.reduce((sum, entry) => sum + entry.count, 0);
  // Empty years are drawn as gaps rather than skipped, otherwise a decade of
  // silence would look like a decade of work.
  const years = Array.from({ length: last - first + 1 }, (_, index) => ({
    year: first + index,
    count: counts.get(first + index) ?? 0,
  }));
  const busiest = timeline.reduce((best, entry) =>
    entry.count > best.count ? entry : best,
  );
  const perDecade = new Map<number, number>();
  for (const entry of timeline) {
    const decade = Math.floor(entry.year / 10) * 10;
    perDecade.set(decade, (perDecade.get(decade) ?? 0) + entry.count);
  }
  const [decade, decadeCount] = [...perDecade.entries()].reduce((best, one) =>
    one[1] > best[1] ? one : best,
  );
  const span = last - first + 1;
  const average = total / span;
  // Every ten years, and always the ends, so the axis reads as a period
  // rather than as two numbers with a wall of bars between them.
  const ticks = years
    .map((entry, index) => ({ ...entry, index }))
    .filter(
      (entry, index) =>
        entry.year % 10 === 0 || index === 0 || index === years.length - 1,
    );

  const facts = [
    {
      label: tri(lang, "Lançamentos", "Releases", "Lanzamientos"),
      value: String(total),
      note: tri(
        lang,
        `com data entre ${first} e ${last}`,
        `dated between ${first} and ${last}`,
        `con fecha entre ${first} y ${last}`,
      ),
    },
    {
      label: tri(lang, "Em atividade", "Active for", "En actividad"),
      value: yearSpan(span, lang),
      note: tri(
        lang,
        `média de ${average.toFixed(1)} por ano`,
        `${average.toFixed(1)} a year on average`,
        `promedio de ${average.toFixed(1)} por año`,
      ),
    },
    {
      label: tri(lang, "Ano mais cheio", "Busiest year", "Año más lleno"),
      value: String(busiest.year),
      note: releases(busiest.count, lang),
    },
    {
      label: tri(
        lang,
        "Década mais cheia",
        "Busiest decade",
        "Década más llena",
      ),
      value: `${decade}s`,
      note: releases(decadeCount, lang),
    },
  ];

  return (
    <section className="publisher-section">
      <header>
        <div>
          <h2>
            {tri(
              lang,
              "Lançamentos por ano",
              "Releases per year",
              "Lanzamientos por año",
            )}
          </h2>
          <p>
            {tri(
              lang,
              `Cada barra é um ano. Contado sobre ${releases(counted, lang)} com data no IGDB.`,
              `One bar per year, counted over ${releases(counted, lang)} with a date on IGDB.`,
              `Cada barra es un año. Contado sobre ${releases(counted, lang)} con fecha en IGDB.`,
            )}
          </p>
        </div>
      </header>

      <dl className="publisher-rhythm-facts">
        {facts.map((fact) => (
          <div key={fact.label}>
            <dt>{fact.label}</dt>
            <dd>
              {fact.value}
              <small>{fact.note}</small>
            </dd>
          </div>
        ))}
      </dl>

      <div className="publisher-chart">
        {/* Not `role="img"` with the whole chart as its label any more: the
            bars are links now, and a reader walks past everything inside an
            image. What that label said is what the facts above already say,
            and each bar carries its own year and count. */}
        <div
          className="publisher-timeline"
          style={
            { "--average": `${(average / peak) * 100}%` } as React.CSSProperties
          }
        >
          {/* The average, drawn across the bars: without it a tall bar is only
              tall next to its neighbours, and the eye has nothing to read it
              against. */}
          <span className="publisher-timeline-average" aria-hidden />
          {years.map((entry) =>
            // A year with releases is a search for that year. An empty one is
            // a gap in the chart: no tooltip and no link, because a reader
            // walking the bars has nothing to be told about a year that had
            // nothing in it.
            entry.count > 0 ? (
              <Tooltip
                key={entry.year}
                label={yearLabel(entry.year, entry.count, lang)}
              >
                <Link
                  href={`/${lang}/search?publishers=${companyId}&yearFrom=${entry.year}&yearTo=${entry.year}`}
                  aria-label={yearLabel(entry.year, entry.count, lang)}
                  data-peak={entry.count === peak || undefined}
                  style={
                    {
                      "--bar": `${Math.max(6, Math.round((entry.count / peak) * 100))}%`,
                    } as React.CSSProperties
                  }
                />
              </Tooltip>
            ) : (
              <span
                key={entry.year}
                data-empty
                aria-hidden
                style={{ "--bar": "0%" } as React.CSSProperties}
              />
            ),
          )}
        </div>
        <div className="publisher-timeline-axis" aria-hidden>
          {ticks.map((tick) => (
            <span
              key={tick.year}
              style={
                {
                  // Unitless: the stylesheet multiplies it by the chart's own
                  // width, and a percentage times a percentage is not a length,
                  // so every tick would pile up at the left edge.
                  "--at": (
                    (tick.index / Math.max(1, years.length - 1)) *
                    100
                  ).toFixed(2),
                } as React.CSSProperties
              }
            >
              {tick.year}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * What the catalogue is made of, from the same sweep that draws the chart.
 *
 * Over every dated release rather than over the dozen games the shelves show,
 * which is the difference between what a company makes and what happens to be
 * popular this week.
 */
async function CatalogueMix({
  companyId,
  lang,
}: {
  companyId: number;
  lang: UiLang;
}) {
  const { genres, platforms, counted } = await getCompanyCatalogue(companyId);
  if (!genres.length && !platforms.length) return null;
  const top = genres.slice(0, 6);
  const most = top[0]?.count ?? 1;
  // Each row names a slice of this company's catalogue, so it opens that
  // slice. The search counts a little differently, since it asks for games
  // with a cover and drops editions, which is why the number stays here as
  // what the sweep saw rather than travelling with the link.
  const slice = (filter: "genres" | "platforms", id: number) =>
    `/${lang}/search?publishers=${companyId}&${filter}=${id}`;
  return (
    <>
      {top.length > 0 && (
        <section className="publisher-card">
          <h2>
            <Layers3 size={14} aria-hidden />
            {tri(lang, "O que fazem", "What they make", "Qué hacen")}
          </h2>
          <ul className="publisher-bars">
            {top.map((genre) => (
              <li key={genre.id}>
                <Link href={slice("genres", genre.id)}>
                  <span>{genre.name}</span>
                  <i
                    style={
                      {
                        "--fill": `${Math.round((genre.count / most) * 100)}%`,
                      } as React.CSSProperties
                    }
                    aria-hidden
                  />
                  <b>{genre.count}</b>
                </Link>
              </li>
            ))}
          </ul>
          <small className="publisher-card-note">
            {tri(
              lang,
              `Gêneros em ${counted} lançamentos`,
              `Genres across ${counted} releases`,
              `Géneros en ${counted} lanzamientos`,
            )}
          </small>
        </section>
      )}
      {platforms.length > 0 && (
        <section className="publisher-card">
          <h2>
            <MonitorPlay size={14} aria-hidden />
            {tri(lang, "Onde saem", "Where they ship", "Dónde salen")}
          </h2>
          <ul className="publisher-chips">
            {platforms.slice(0, 10).map((platform) => (
              <li key={platform.id}>
                <Link href={slice("platforms", platform.id)}>
                  {platform.name}
                  <b>{platform.count}</b>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

/**
 * What this company's games look like from inside uloggd, rather than from
 * IGDB: the ratings people here gave them.
 *
 * Only the games on the shelves, because those are the ids the page already
 * has, and the card says so rather than implying it read the whole catalogue.
 */
async function CommunitySignal({
  games,
  lang,
}: {
  games: Game[];
  lang: UiLang;
}) {
  if (!games.length) return null;
  const ratings = await getCommunityGameRatings(games.map((game) => game.id));
  const rated = games
    .map((game) => ({ game, rating: ratings.get(game.id) }))
    .filter(
      (
        entry,
      ): entry is {
        game: Game;
        rating: { rating: number; count: number; weighted: number };
      } => Boolean(entry.rating && entry.rating.count > 0),
    );
  const votes = rated.reduce((sum, entry) => sum + entry.rating.count, 0);
  const average = rated.length
    ? rated.reduce(
        (sum, entry) => sum + entry.rating.rating * entry.rating.count,
        0,
      ) / Math.max(1, votes)
    : 0;
  // Ranked by the weighted score, shown with the real one. Picking the best
  // by plain average hands the title to whichever game one person loved.
  const best = rated.reduce(
    (top, entry) =>
      !top || entry.rating.weighted > top.rating.weighted ? entry : top,
    null as (typeof rated)[number] | null,
  );

  return (
    <section className="publisher-card">
      <h2>
        <Star size={14} aria-hidden />
        {tri(lang, "No uloggd", "On uloggd", "En uloggd")}
      </h2>
      {rated.length === 0 ? (
        <p className="publisher-card-empty">
          {tri(
            lang,
            "Ninguém aqui avaliou estes jogos ainda. Seja o primeiro.",
            "Nobody here has rated these games yet. Be the first.",
            "Nadie aquí ha valorado estos juegos todavía. Sé el primero.",
          )}
        </p>
      ) : (
        <>
          <p className="publisher-score">
            <strong>{Math.round(average)}</strong>
            {/* Out of a hundred, the scale every rating on the site is stored
                and shown in, whatever the mode it was given in. */}
            <small>
              {tri(
                lang,
                `de 100 · ${votes} ${votes === 1 ? "nota" : "notas"} em ${rated.length} ${rated.length === 1 ? "jogo" : "jogos"}`,
                `out of 100 · ${votes} ${votes === 1 ? "rating" : "ratings"} across ${rated.length} ${rated.length === 1 ? "game" : "games"}`,
                `de 100 · ${votes} ${votes === 1 ? "nota" : "notas"} en ${rated.length} ${rated.length === 1 ? "juego" : "juegos"}`,
              )}
            </small>
          </p>
          {best && (
            <Link
              className="publisher-card-link"
              href={`/${lang}/game/${best.game.slug}`}
            >
              <Image
                src={best.game.coverUrl}
                alt=""
                width={44}
                height={59}
                unoptimized
              />
              <span>
                <small>
                  {tri(
                    lang,
                    "Mais bem avaliado",
                    "Best rated",
                    "Mejor valorado",
                  )}
                </small>
                <strong>{best.game.name}</strong>
                <b>
                  {Math.round(best.rating.rating)}
                  <Star size={11} aria-hidden />
                </b>
              </span>
            </Link>
          )}
        </>
      )}
    </section>
  );
}

function GameShelf({
  title,
  description,
  games,
  total,
  href,
  lang,
  saved,
  signedIn,
}: {
  title: string;
  /** Only when there is something to say the heading does not already say. */
  description?: string;
  games: Game[];
  total: number;
  href: string;
  lang: UiLang;
  saved: Map<number, Parameters<typeof QuickGameCard>[0]["initial"]>;
  signedIn: boolean;
}) {
  if (!games.length) return null;
  return (
    <section className="publisher-section">
      <header>
        <div>
          <h2>{title}</h2>
          {description && <p>{description}</p>}
        </div>
        {total > games.length && (
          <Link className="publisher-see-all" href={href}>
            {tri(
              lang,
              `Ver todos (${total})`,
              `See all (${total})`,
              `Ver todos (${total})`,
            )}
          </Link>
        )}
      </header>
      {/* Same shelf the profile uses for "jogos recentes": five per row on
          desktop, a snapping strip of 126px covers on a phone. The carousel
          this replaced sized its columns for a viewport this page never has. */}
      <div className="cover-shelf">
        {games.map((game) => (
          <QuickGameCard
            key={game.id}
            game={game}
            initial={saved.get(game.id) ?? null}
            lang={lang}
            enabled={signedIn}
          />
        ))}
      </div>
    </section>
  );
}

function dateLabel(timestamp: number | null, lang: UiLang) {
  if (!timestamp) return null;
  return new Intl.DateTimeFormat(lang, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(timestamp * 1000));
}

/** Announced but unreleased, with the wait spelled out next to each date. */
async function UpcomingGames({
  companyId,
  lang,
}: {
  companyId: number;
  lang: UiLang;
}) {
  const games = await getCompanyUpcoming(companyId);
  if (!games.length) return null;
  return (
    <section className="publisher-section">
      <header>
        <div>
          <h2>{tri(lang, "Em breve", "Coming soon", "Próximamente")}</h2>
        </div>
      </header>
      <ol className="publisher-upcoming">
        {games.map((game) => (
          <li key={game.id}>
            <Link href={`/${lang}/game/${game.slug}`}>
              <Image
                src={game.coverUrl}
                alt=""
                width={64}
                height={85}
                unoptimized
              />
              <span>
                <strong>{game.name}</strong>
                <small>{dateLabel(game.releaseTimestamp, lang)}</small>
                {game.releaseTimestamp && (
                  <RelativeTime
                    value={new Date(game.releaseTimestamp * 1000).toISOString()}
                    lang={lang}
                    className="publisher-countdown"
                  />
                )}
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}

async function RecentTrailers({
  companyId,
  lang,
}: {
  companyId: number;
  lang: UiLang;
}) {
  const trailers = await getCompanyTrailers(companyId);
  if (!trailers.length) return null;
  return (
    <section className="publisher-section">
      <header>
        <div>
          <h2>{tri(lang, "Trailers", "Trailers", "Tráilers")}</h2>
          <p>
            {tri(
              lang,
              "Lançamentos mais recentes com vídeo",
              "Most recent releases with video",
              "Lanzamientos más recientes con video",
            )}
          </p>
        </div>
      </header>
      <div className="publisher-trailers">
        {trailers.map((trailer) => (
          <article key={trailer.id}>
            <div>
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${trailer.video.id}`}
                title={trailer.video.name}
                loading="lazy"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            <h3>
              <Link href={`/${lang}/game/${trailer.slug}`}>{trailer.name}</Link>
            </h3>
            <small>{dateLabel(trailer.releaseTimestamp, lang)}</small>
          </article>
        ))}
      </div>
    </section>
  );
}

async function CompanyEvents({
  companyId,
  lang,
}: {
  companyId: number;
  lang: UiLang;
}) {
  const events = await getCompanyEvents(companyId);
  if (!events.length) return null;
  return (
    <section className="publisher-section">
      <header>
        <div>
          <h2>{tri(lang, "Eventos", "Events", "Eventos")}</h2>
          {/* Said plainly: IGDB has no company field on events, so this is
              "events that featured their games", not a hosting credit. */}
          <p>
            {tri(
              lang,
              "Onde os jogos da empresa apareceram",
              "Where the company's games showed up",
              "Donde aparecieron los juegos de la empresa",
            )}
          </p>
        </div>
      </header>
      <ol className="publisher-events">
        {events.map((event) => (
          <li key={event.id}>
            <span className="publisher-event-logo">
              {event.logoUrl ? (
                <Image
                  src={event.logoUrl}
                  alt=""
                  width={44}
                  height={44}
                  unoptimized
                />
              ) : (
                <CalendarDays size={16} aria-hidden />
              )}
            </span>
            <span>
              <strong>{event.name}</strong>
              <small>{dateLabel(event.startTimestamp, lang)}</small>
            </span>
            {event.liveStreamUrl && (
              <a
                href={event.liveStreamUrl}
                target="_blank"
                rel="noopener noreferrer nofollow"
              >
                {tri(lang, "Assistir", "Watch", "Ver")}{" "}
                <ExternalLink size={12} aria-hidden />
              </a>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}

export default async function CompanyPage({ params }: Props) {
  const { lang, slug } = await params;
  if (!hasLocale(lang)) notFound();
  const [company, user]: [
    CompanyProfile | null,
    Awaited<ReturnType<typeof getAuthUser>>,
  ] = await Promise.all([getCompanyBySlug(slug), getAuthUser()]);
  if (!company) notFound();

  const highlights = [...company.published, ...company.developed];
  const uniqueHighlights = [
    ...new Map(highlights.map((game) => [game.id, game])).values(),
  ];
  const { data: savedRows } =
    user && uniqueHighlights.length
      ? await getLibraryCards(uniqueHighlights.map((game) => game.id))
      : { data: [] };
  const saved = new Map(savedRows.map((row) => [row.igdb_id, row]));

  const country = countryFromIgdb(company.countryCode, lang);
  const founded = company.foundedTimestamp
    ? new Date(company.foundedTimestamp * 1000).getUTCFullYear()
    : null;
  const summary = company.description.split(/\n{2,}/)[0].trim();
  const initial = company.name.toUpperCase().match(/[\p{L}\p{N}]/u)?.[0] ?? "";
  // A company's visual identity must reflect work it actually developed.
  // Publishing credit still belongs in the catalogue, but never supplies the
  // hero artwork because that would visually attribute another studio's work.
  const backdrop =
    company.developed.find((game) => game.heroUrl)?.heroUrl ?? null;
  const searchHref = `/${lang}/search?publishers=${company.id}`;
  // IGDB's own vocabulary, translated where it has an obvious equivalent and
  // passed through capitalised where it does not.
  const status =
    company.status === "active"
      ? tri(lang, "Ativa", "Active", "Activa")
      : company.status === "defunct"
        ? tri(lang, "Extinta", "Defunct", "Extinta")
        : company.status
          ? company.status[0].toUpperCase() + company.status.slice(1)
          : null;

  return (
    <main
      className="publisher-page"
      data-has-backdrop={Boolean(backdrop) || undefined}
      style={
        {
          // Letters and digits only: the value lands inside a quoted CSS
          // string, and a name starting with a quote would break out of it.
          "--publisher-initial": `"${initial}"`,
          ...(backdrop
            ? {
                // Same trick the profile banner uses: the art goes through a CSS
                // variable so the bleeding ::before layer can carry it past the
                // page gutters without a second <img> in the markup.
                "--publisher-backdrop-image": `url("${backdrop.replace(/["\\\n\r]/g, encodeURIComponent)}")`,
              }
            : {}),
        } as React.CSSProperties
      }
    >
      {/* Organization markup: it is what lets a search engine tie the page to
          the real company entity instead of treating it as a list of links. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLd({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: company.name,
          url: `${SITE_URL}/${lang}/company/${company.slug}`,
          ...(company.logoUrl ? { logo: company.logoUrl } : {}),
          ...(summary ? { description: summary } : {}),
          ...(founded ? { foundingDate: String(founded) } : {}),
          ...(country
            ? {
                address: {
                  "@type": "PostalAddress",
                  addressCountry: country.code,
                },
              }
            : {}),
          ...(company.parent
            ? {
                parentOrganization: {
                  "@type": "Organization",
                  name: company.parent.name,
                  url: `${SITE_URL}/${lang}/company/${company.parent.slug}`,
                },
              }
            : {}),
          ...(company.websites.length ? { sameAs: company.websites } : {}),
        })}
      />
      <div className="publisher-banner" data-empty={!backdrop || undefined} />
      <header className="publisher-header">
        <div className="publisher-logo-anchor">
          <span className="publisher-logo">
            {company.logoUrl ? (
              <Image
                src={company.logoUrl}
                alt=""
                width={112}
                height={112}
                unoptimized
                priority
              />
            ) : (
              <Building2 size={34} aria-hidden />
            )}
          </span>
        </div>
        <div className="publisher-identity">
          <div>
            <span className="publisher-eyebrow">
              {company.publishedCount >= company.developedCount
                ? tri(lang, "PUBLICADORA", "PUBLISHER", "DISTRIBUIDORA")
                : tri(lang, "DESENVOLVEDORA", "DEVELOPER", "DESARROLLADORA")}
              {status && (
                <b className="publisher-status" data-status={company.status}>
                  {status}
                </b>
              )}
            </span>
            <h1>{company.name}</h1>
            <p className="publisher-meta">
              {country && (
                <span>
                  <b aria-hidden>{withEmoji(flagEmoji(country.code))}</b>{" "}
                  {country.name}
                </span>
              )}
              {founded && (
                <span>
                  <CalendarDays size={13} aria-hidden />{" "}
                  {tri(lang, "desde", "since", "desde")} {founded}
                </span>
              )}
              {company.parent && (
                <span>
                  <Building2 size={13} aria-hidden />{" "}
                  <Link href={`/${lang}/company/${company.parent.slug}`}>
                    {company.parent.name}
                  </Link>
                </span>
              )}
            </p>
          </div>
          {summary && <p className="publisher-description">{summary}</p>}
          {/* A count of a company's games is a search for those games, so
              each one opens it rather than only stating a number. */}
          <dl className="publisher-stats">
            <div>
              <dt>
                <Library size={13} aria-hidden />{" "}
                {tri(lang, "Publicados", "Published", "Publicados")}
              </dt>
              <dd>
                <Link href={`${searchHref}&role=publisher`}>
                  {company.publishedCount}
                </Link>
              </dd>
            </div>
            <div>
              <dt>
                <Gamepad2 size={13} aria-hidden />{" "}
                {tri(lang, "Desenvolvidos", "Developed", "Desarrollados")}
              </dt>
              <dd>
                <Link href={`${searchHref}&role=developer`}>
                  {company.developedCount}
                </Link>
              </dd>
            </div>
            {user && (
              <div>
                <dt>
                  <Star size={13} aria-hidden />{" "}
                  {tri(
                    lang,
                    "Na sua biblioteca",
                    "In your library",
                    "En tu biblioteca",
                  )}
                </dt>
                <dd>
                  {saved.size}
                  <small>/{uniqueHighlights.length}</small>
                </dd>
              </div>
            )}
          </dl>
        </div>
      </header>

      {/* Two columns from here: the catalogue reads down the middle, and the
          facts about the company itself sit beside it rather than above it,
          where they pushed the games below the fold. */}
      <div className="publisher-body">
        <div className="publisher-main">
          {/* Each of these costs its own IGDB round trip, so they stream
              instead of holding the shell. React patches them into place, so
              the reading order is what the markup says, not what finishes
              first. */}
          <Suspense fallback={null}>
            <UpcomingGames companyId={company.id} lang={lang} />
          </Suspense>

          <GameShelf
            title={tri(lang, "Publicados", "Published", "Publicados")}
            description={tri(
              lang,
              "Mais registrados primeiro",
              "Most logged first",
              "Más registrados primero",
            )}
            games={company.published}
            total={company.publishedCount}
            href={`${searchHref}&role=publisher`}
            lang={lang}
            saved={saved}
            signedIn={Boolean(user)}
          />
          <GameShelf
            title={tri(lang, "Desenvolvidos", "Developed", "Desarrollados")}
            games={company.developed}
            total={company.developedCount}
            href={`${searchHref}&role=developer`}
            lang={lang}
            saved={saved}
            signedIn={Boolean(user)}
          />

          <Suspense
            fallback={
              <section className="publisher-section">
                <div className="publisher-timeline-skeleton" aria-hidden />
              </section>
            }
          >
            <CatalogueRhythm companyId={company.id} lang={lang} />
          </Suspense>

          <Suspense fallback={null}>
            <RecentTrailers companyId={company.id} lang={lang} />
          </Suspense>

          <Suspense fallback={null}>
            <CompanyEvents companyId={company.id} lang={lang} />
          </Suspense>
        </div>

        <aside className="publisher-rail">
          <section className="publisher-card">
            <h2>
              <Building2 size={14} aria-hidden />
              {tri(lang, "Ficha", "Details", "Ficha")}
            </h2>
            <dl className="publisher-facts">
              {country && (
                <div>
                  <dt>{tri(lang, "País", "Country", "País")}</dt>
                  <dd>
                    <b aria-hidden>{withEmoji(flagEmoji(country.code))}</b>{" "}
                    {country.name}
                  </dd>
                </div>
              )}
              {founded && (
                <div>
                  <dt>{tri(lang, "Fundada", "Founded", "Fundada")}</dt>
                  <dd>{founded}</dd>
                </div>
              )}
              {status && (
                <div>
                  <dt>{tri(lang, "Situação", "Status", "Situación")}</dt>
                  <dd>{status}</dd>
                </div>
              )}
              {company.parent && (
                <div>
                  <dt>{tri(lang, "Parte de", "Part of", "Parte de")}</dt>
                  <dd>
                    <Link href={`/${lang}/company/${company.parent.slug}`}>
                      {company.parent.name}
                    </Link>
                  </dd>
                </div>
              )}
              <div>
                <dt>{tri(lang, "Catálogo", "Catalogue", "Catálogo")}</dt>
                <dd>
                  <Link href={`${searchHref}&role=publisher`}>
                    {tri(
                      lang,
                      `${company.publishedCount} publicados`,
                      `${company.publishedCount} published`,
                      `${company.publishedCount} publicados`,
                    )}
                  </Link>
                  {" · "}
                  <Link href={`${searchHref}&role=developer`}>
                    {tri(
                      lang,
                      `${company.developedCount} desenvolvidos`,
                      `${company.developedCount} developed`,
                      `${company.developedCount} desarrollados`,
                    )}
                  </Link>
                </dd>
              </div>
            </dl>
            {(company.websites.length > 0 || company.igdbUrl) && (
              <div className="publisher-links">
                {company.websites.map((url) => (
                  <a
                    key={url}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                  >
                    <Globe2 size={12} aria-hidden /> {websiteLabel(url)}
                  </a>
                ))}
                {company.igdbUrl && (
                  <a
                    className="publisher-source"
                    href={company.igdbUrl}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                  >
                    {tri(lang, "Fonte: IGDB", "Source: IGDB", "Fuente: IGDB")}{" "}
                    <ExternalLink size={12} aria-hidden />
                  </a>
                )}
              </div>
            )}
          </section>

          <Suspense fallback={null}>
            <CommunitySignal games={uniqueHighlights} lang={lang} />
          </Suspense>

          <Suspense fallback={null}>
            <CatalogueMix companyId={company.id} lang={lang} />
          </Suspense>

          <Link className="publisher-rail-action" href={searchHref}>
            <TrendingUp size={14} aria-hidden />
            {tri(
              lang,
              "Ver tudo no catálogo",
              "See everything in the catalogue",
              "Ver todo en el catálogo",
            )}
          </Link>
        </aside>
      </div>
    </main>
  );
}
