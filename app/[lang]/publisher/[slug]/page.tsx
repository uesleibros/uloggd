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

type Props = PageProps<"/[lang]/publisher/[slug]">;

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
    alternates: localeAlternates(lang, `/publisher/${company.slug}`),
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
 * A big publisher needs several IGDB pages to count every dated release, so the
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
    <section className="publisher-section publisher-timeline-section">
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
          <span
            key={entry.year}
            data-peak={entry.count === peak || undefined}
            style={
              {
                "--bar": `${Math.max(entry.count ? 6 : 0, Math.round((entry.count / peak) * 100))}%`,
              } as React.CSSProperties
            }
            title={`${entry.year}: ${entry.count}`}
          />
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
  description: string;
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
          <p>{description}</p>
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
          <p>
            {tri(
              lang,
              "Anunciados e ainda sem lançamento.",
              "Announced and not out yet.",
              "Anunciados y aún sin lanzamiento.",
            )}
          </p>
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
          <h2>
            {tri(
              lang,
              "Trailers dos últimos lançamentos",
              "Trailers from the latest releases",
              "Tráilers de los últimos lanzamientos",
            )}
          </h2>
          <p>
            {tri(
              lang,
              "O que a empresa colocou na rua mais recentemente.",
              "What the company shipped most recently.",
              "Lo más reciente que la empresa lanzó.",
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
              "Transmissões e feiras onde os jogos da empresa apareceram.",
              "Showcases and expos where the company's games appeared.",
              "Transmisiones y ferias donde aparecieron sus juegos.",
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

function StatTile({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="publisher-stat">
      <span>{icon}</span>
      <p>
        <strong>{value}</strong>
        <small>{label}</small>
      </p>
      {hint && <em>{hint}</em>}
    </div>
  );
}

export default async function PublisherPage({ params }: Props) {
  const { lang, slug } = await params;
  if (!hasLocale(lang)) notFound();
  const company: CompanyProfile | null = await getCompanyBySlug(slug);
  if (!company) notFound();

  const highlights = [...company.published, ...company.developed];
  const uniqueHighlights = [
    ...new Map(highlights.map((game) => [game.id, game])).values(),
  ];
  const user = await getAuthUser();
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
  const rated = uniqueHighlights.filter(
    (game) => typeof game.rating === "number",
  );
  const bestRated = rated.length
    ? rated.reduce((best, game) =>
        (game.rating ?? 0) > (best.rating ?? 0) ? game : best,
      )
    : null;
  const backdrop =
    uniqueHighlights.find((game) => game.heroUrl)?.heroUrl ?? null;
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
        backdrop
          ? ({
              // Same trick the profile banner uses: the art goes through a CSS
              // variable so the bleeding ::before layer can carry it past the
              // page gutters without a second <img> in the markup.
              "--publisher-backdrop-image": `url("${backdrop.replace(/["\\\n\r]/g, encodeURIComponent)}")`,
            } as React.CSSProperties)
          : undefined
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
          url: `${SITE_URL}/${lang}/publisher/${company.slug}`,
          ...(company.logoUrl ? { logo: company.logoUrl } : {}),
          ...(company.description ? { description: company.description } : {}),
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
                  url: `${SITE_URL}/${lang}/publisher/${company.parent.slug}`,
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
                  <Link href={`/${lang}/publisher/${company.parent.slug}`}>
                    {company.parent.name}
                  </Link>
                </span>
              )}
            </p>
          </div>
          {company.description && (
            <p className="publisher-description">{company.description}</p>
          )}
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
        </div>
      </header>

      <section className="publisher-stats">
        <StatTile
          icon={<Library size={16} aria-hidden />}
          label={tri(lang, "Publicados", "Published", "Publicados")}
          value={String(company.publishedCount)}
        />
        <StatTile
          icon={<Gamepad2 size={16} aria-hidden />}
          label={tri(lang, "Desenvolvidos", "Developed", "Desarrollados")}
          value={String(company.developedCount)}
        />
        {bestRated && (
          <StatTile
            icon={<Star size={16} aria-hidden />}
            label={tri(
              lang,
              "Melhor avaliado",
              "Highest rated",
              "Mejor valorado",
            )}
            value={`${bestRated.rating}`}
            hint={bestRated.name}
          />
        )}
        {user && (
          <StatTile
            icon={<Library size={16} aria-hidden />}
            label={tri(
              lang,
              "Destaques na sua biblioteca",
              "Highlights in your library",
              "Destacados en tu biblioteca",
            )}
            value={`${saved.size}/${uniqueHighlights.length}`}
          />
        )}
      </section>

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
          "Os mais registrados da comunidade IGDB.",
          "The most logged across the IGDB community.",
          "Los más registrados de la comunidad IGDB.",
        )}
        games={company.published}
        total={company.publishedCount}
        href={searchHref}
        lang={lang}
        saved={saved}
        signedIn={Boolean(user)}
      />
      <GameShelf
        title={tri(lang, "Desenvolvidos", "Developed", "Desarrollados")}
        description={tri(
          lang,
          "Feitos pela própria casa.",
          "Made in house.",
          "Hechos en casa.",
        )}
        games={company.developed}
        total={company.developedCount}
        href={searchHref}
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
