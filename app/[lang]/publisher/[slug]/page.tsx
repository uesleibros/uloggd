import type { Metadata } from "next";
import { VerifiedNameMark } from "@/components/verified-badge";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import {
  Building2,
  CalendarDays,
  ExternalLink,
  Gamepad2,
  Library,
  Star,
} from "lucide-react";
import { QuickGameCard } from "@/components/library/quick-game-card";
import { RelativeTime } from "@/components/relative-time";
import { countryFromIgdb, flagEmoji } from "@/lib/countries";
import {
  getCompanyBySlug,
  getCompanyEvents,
  getCompanyTimeline,
  getCompanyTrailers,
  getCompanyUpcoming,
  type CompanyProfile,
  type Game,
} from "@/lib/igdb";
import { jsonLd, localeAlternates, SITE_URL } from "@/lib/seo";
import { getAuthUser, getSupabase } from "@/lib/supabase/auth";
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
    alternates: localeAlternates(lang, `/company/${company.slug}`),
    openGraph: {
      title: `${company.name} · uloggd`,
      description,
      type: "profile",
      siteName: "uloggd",
      images: company.logoUrl ? [company.logoUrl] : undefined,
    },
    twitter: {
      card: "summary",
      title: `${company.name} · uloggd`,
      description,
    },
  };
}

/**
 * A large company needs several IGDB pages to count every dated release, so the
 * chart streams in after the shell instead of delaying the whole page.
 */
async function ReleaseTimeline({
  companyId,
  lang,
}: {
  companyId: number;
  lang: UiLang;
}) {
  const timeline = await getCompanyTimeline(companyId);
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
              `${total} lançamentos entre ${first} e ${last} · pico em ${busiest.year} com ${busiest.count}`,
              `${total} releases between ${first} and ${last} · peak in ${busiest.year} with ${busiest.count}`,
              `${total} lanzamientos entre ${first} y ${last} · pico en ${busiest.year} con ${busiest.count}`,
            )}
          </p>
        </div>
      </header>
      <div
        className="publisher-timeline"
        role="img"
        aria-label={tri(
          lang,
          `Gráfico de lançamentos por ano, de ${first} a ${last}, com pico de ${busiest.count} em ${busiest.year}.`,
          `Chart of releases per year, from ${first} to ${last}, peaking at ${busiest.count} in ${busiest.year}.`,
          `Gráfico de lanzamientos por año, de ${first} a ${last}, con pico de ${busiest.count} en ${busiest.year}.`,
        )}
      >
        {years.map((entry) => (
          <Tooltip key={entry.year} label={`${entry.year}: ${entry.count}`}>
            <span
              data-peak={entry.count === peak || undefined}
              style={
                {
                  "--bar": `${Math.max(entry.count ? 6 : 0, Math.round((entry.count / peak) * 100))}%`,
                } as React.CSSProperties
              }
            />
          </Tooltip>
        ))}
      </div>
      <div className="publisher-timeline-axis">
        <span>{first}</span>
        <span>{last}</span>
      </div>
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

  // The account that represents this company, when a moderator has confirmed
  // one. Resolved through a function rather than a select so the "verified
  // only" rule lives in one place instead of in each caller.
  const { data: officialRows } = await (
    await getSupabase()
  ).rpc("company_official_account", { company_slug: company.slug });
  const official = (
    officialRows as
      | {
          username: string;
          display_name: string | null;
          avatar_url: string | null;
        }[]
      | null
  )?.[0];

  const highlights = [...company.published, ...company.developed];
  const uniqueHighlights = [
    ...new Map(highlights.map((game) => [game.id, game])).values(),
  ];
  const savedRows =
    user && uniqueHighlights.length
      ? ((
          await (
            await getSupabase()
          )
            .from("user_games")
            .select(
              "igdb_id,status,playing,backlog,wishlist,liked,quick_rating,custom_cover_url",
            )
            .eq("profile_id", user.id)
            .in(
              "igdb_id",
              uniqueHighlights.map((game) => game.id),
            )
        ).data ?? [])
      : [];
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
                  <b aria-hidden>{flagEmoji(country.code)}</b> {country.name}
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
          {official && (
            /* Only ever a verified account. The claim itself is self-declared,
               so showing an unverified one here would let anyone put their name
               on any company's page, which is the impersonation the badge
               exists to answer. */
            <Link
              className="publisher-official"
              href={`/${lang}/u/${official.username}`}
            >
              <span
                className="publisher-official-avatar"
                data-account-type="ORGANIZATION"
              >
                {official.avatar_url ? (
                  <Image
                    src={official.avatar_url}
                    alt=""
                    fill
                    sizes="40px"
                    unoptimized
                  />
                ) : (
                  (official.display_name || official.username)
                    .slice(0, 1)
                    .toUpperCase()
                )}
              </span>
              <span>
                <strong>
                  {official.display_name || `@${official.username}`}
                  <VerifiedNameMark />
                </strong>
                <small>
                  {tri(
                    lang,
                    "Conta oficial no uloggd",
                    "Official account on uloggd",
                    "Cuenta oficial en uloggd",
                  )}
                </small>
              </span>
            </Link>
          )}
          {summary && <p className="publisher-description">{summary}</p>}
          {(company.websites.length > 0 || company.igdbUrl) && (
            <div className="publisher-links">
              {company.websites.map((url) => (
                <a
                  key={url}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                >
                  {websiteLabel(url)} <ExternalLink size={12} aria-hidden />
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
          <dl className="publisher-stats">
            <div>
              <dt>
                <Library size={13} aria-hidden />{" "}
                {tri(lang, "Publicados", "Published", "Publicados")}
              </dt>
              <dd>{company.publishedCount}</dd>
            </div>
            <div>
              <dt>
                <Gamepad2 size={13} aria-hidden />{" "}
                {tri(lang, "Desenvolvidos", "Developed", "Desarrollados")}
              </dt>
              <dd>{company.developedCount}</dd>
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

      {/* Each of these costs its own IGDB round trip, so they stream instead of
          holding the shell. React patches them into place, so the reading order
          is what the markup says, not what finishes first. */}
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

      <Suspense fallback={null}>
        <RecentTrailers companyId={company.id} lang={lang} />
      </Suspense>

      <Suspense fallback={null}>
        <CompanyEvents companyId={company.id} lang={lang} />
      </Suspense>

      <Suspense
        fallback={
          <section className="publisher-section">
            <div className="publisher-timeline-skeleton" aria-hidden />
          </section>
        }
      >
        <ReleaseTimeline companyId={company.id} lang={lang} />
      </Suspense>
    </main>
  );
}
