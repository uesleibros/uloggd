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
import { ShelfCarousel } from "@/components/shelf-carousel";
import { countryFromIgdb, flagEmoji } from "@/lib/countries";
import {
  getCompanyBySlug,
  getCompanyTimeline,
  type CompanyProfile,
  type Game,
} from "@/lib/igdb";
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
      <ShelfCarousel label={title} lang={lang}>
        {games.map((game) => (
          <QuickGameCard
            key={game.id}
            game={game}
            initial={saved.get(game.id) ?? null}
            lang={lang}
            enabled={signedIn}
          />
        ))}
      </ShelfCarousel>
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

  return (
    <main className="publisher-page">
      <header className="publisher-hero">
        {backdrop && (
          <div className="publisher-hero-backdrop" aria-hidden>
            <Image
              src={backdrop}
              alt=""
              fill
              sizes="100vw"
              unoptimized
              priority
            />
          </div>
        )}
        <div className="publisher-identity">
          <span className="publisher-logo">
            {company.logoUrl ? (
              <Image
                src={company.logoUrl}
                alt=""
                width={104}
                height={104}
                unoptimized
              />
            ) : (
              <Building2 size={30} aria-hidden />
            )}
          </span>
          <div>
            <span className="publisher-eyebrow">
              {company.publishedCount >= company.developedCount
                ? tri(lang, "PUBLICADORA", "PUBLISHER", "DISTRIBUIDORA")
                : tri(lang, "DESENVOLVEDORA", "DEVELOPER", "DESARROLLADORA")}
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
        </div>
        {company.description && (
          <p className="publisher-description">{company.description}</p>
        )}
        {company.websites.length > 0 && (
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
          </div>
        )}
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
